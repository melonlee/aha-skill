# 🚀 沙盒环境服务器部署指南

本文档详细说明如何将 `apps/python-service` 及其沙盒模块部署到 Linux 服务器。

## 1. 基础环境准备

沙盒依赖 Linux 内核特性（Namespaces, Cgroups, Seccomp），**必须部署在 Linux 服务器上**（推荐 Ubuntu 20.04/22.04 LTS 或 Debian 11/12）。

### 1.1 系统要求
- **OS**: Linux (Kernel >= 4.6)
- **Architecture**: x86_64
- **用户权限**: 需要 root 权限进行安装和配置

### 1.2 安装核心依赖

#### 安装 nsjail
`nsjail` 是沙盒的核心组件。

**Ubuntu 20.04+ / Debian:**
```bash
sudo apt-get update
sudo apt-get install -y nsjail
```

*如果源中没有 nsjail（较旧版本系统），需要源码编译：*
```bash
sudo apt-get install -y autoconf bison flex gcc g++ git libprotobuf-dev libnl-route-3-dev libtool make pkg-config protobuf-compiler
git clone https://github.com/google/nsjail.git
cd nsjail
make
sudo cp nsjail /usr/bin/
```

#### 安装 Docker (用于构建 RootFS)
仅构建环境需要 Docker。如果生产环境不便安装 Docker，可以在 CI/CD 机器构建好 RootFS 压缩包传到生产服务器解压。

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash
```

#### 安装 Python 运行时
```bash
sudo apt-get install -y python3 python3-pip python3-venv
```

---

## 2. 构建沙盒运行环境 (RootFS)

沙盒内的进程需要一个独立的根文件系统（RootFS），其中包含 Python 解释器、标准库和预装的三方库。

### 2.1 运行构建脚本
在项目根目录下执行：

```bash
# 赋予执行权限
chmod +x apps/python-service/sandbox_images/build_rootfs.sh

# 执行构建 (需要 Docker 权限)
./apps/python-service/sandbox_images/build_rootfs.sh
```

### 2.2 验证 RootFS
脚本执行成功后，检查输出目录（默认 `/opt/sandbox-rootfs`）：

```bash
ls -F /opt/sandbox-rootfs/
# 应包含: bin/  etc/  lib/  usr/  var/ ...
```

**注意**: 确保 `/opt/sandbox-rootfs` 目录对当前用户有读取权限。

---

## 3. 部署 Python 服务

### 3.1 获取代码
将代码上传至服务器 `/var/www/aha-skill` 或其他目录。

### 3.2 准备 Python 环境
推荐使用 `venv` 隔离环境。

```bash
cd /var/www/aha-skill/apps/python-service

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3.3 配置环境变量
创建 `.env` 文件或在 systemd 中配置：

- `SANDBOX_ROOTFS`: 指向第 2 步生成的目录 (默认 `/opt/sandbox-rootfs`)
- `LOG_LEVEL`: 日志级别 (如 `INFO`)

---

## 4. 启动服务

### 方案 A: 使用 Systemd (推荐 - 生产环境)

创建服务文件 `/etc/systemd/system/aha-sandbox.service`:

```ini
[Unit]
Description=Aha Skill Python Sandbox Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/aha-skill/apps/python-service
Environment="PATH=/var/www/aha-skill/apps/python-service/venv/bin:/usr/bin"
Environment="SANDBOX_ROOTFS=/opt/sandbox-rootfs"
# 关键: nsjail 需要一定的 capabilities 才能创建 namespace
# 通常非 root 用户运行 nsjail 需要配置 user namespace
# 如果遇到权限问题，可以临时尝试 User=root，或配置 kernel.unprivileged_userns_clone=1
ExecStart=/var/www/aha-skill/apps/python-service/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

**权限特别说明**:
如果以非 root 用户 (`www-data`) 运行服务，确保该用户对 `/opt/sandbox-rootfs` 有读取权限，且对 `/tmp/sandbox` (工作目录) 有读写权限。

```bash
# 修正权限
sudo chown -R root:root /opt/sandbox-rootfs
sudo chmod -R 755 /opt/sandbox-rootfs

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable aha-sandbox
sudo systemctl start aha-sandbox
```

### 方案 B: 命令行直接启动 (测试/调试)

```bash
source venv/bin/activate
export SANDBOX_ROOTFS=/opt/sandbox-rootfs
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 5. 验证部署

服务启动后，使用 `curl` 发送测试请求：

```bash
curl -X POST http://localhost:8000/api/sandbox/run \
  -H "Content-Type: application/json" \
  -d '{
    "runtime": "python:3.9",
    "files": [
      {
        "path": "test.py",
        "content": "import sys; print(f\"Hello from Sandbox! Python {sys.version}\")"
      }
    ],
    "entrypoint": "python test.py"
  }'
```

**预期输出**:
```json
{
  "status": "success",
  "stdout": "Hello from Sandbox! Python 3.11.x ...\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": ...
}
```

---

## 6. 常见问题排查

### Q1: `nsjail: command not found`
**A**: 确保 `nsjail` 已安装且在系统的 `$PATH` 中。如果源码编译安装到 `/usr/local/bin`，确保 systemd 的 PATH 包含该路径。

### Q2: `Permission denied` 错误
**A**: 
1. 检查 `/opt/sandbox-rootfs` 权限。
2. 检查 `/tmp/sandbox` 是否可写。
3. 如果是在 Docker 容器内运行该服务（Docker in Docker），启动容器时需要 `--privileged` 才能使用 nsjail 的 namespace 特性。

### Q3: `Clone failed` 或 Namespace 错误
**A**: 宿主机内核可能禁用了 User Namespaces。
检查配置：
```bash
sysctl kernel.unprivileged_userns_clone
```
如果为 0，设置为 1：
```bash
sudo sysctl -w kernel.unprivileged_userns_clone=1
```

### Q4: 无法联网
**A**: 当前设计默认隔离网络。如需联网，需修改 `executor.py` 中的 nsjail 参数，移除网络隔离限制或配置网络命名空间。
