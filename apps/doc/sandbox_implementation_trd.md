# 🛠️ 沙盒环境详细设计文档 (TRD)

## 1. 概述

本文档基于《轻量级多语言沙盒环境技术方案》，详细阐述 **nsjail** 沙盒在 `apps/python-service` 中的具体实现规范。

**核心目标**：实现一个安全、高效、支持**多文件项目**结构的代码执行服务。

---

## 2. 系统模块设计

在 `apps/python-service` 中新增 `sandbox` 模块，包含以下核心组件：

```
apps/python-service/app/sandbox/
├── __init__.py
├── manager.py          # 沙盒生命周期管理 (门面模式)
├── executor.py         # Nsjail 命令封装与执行
├── filesystem.py       # 临时文件与目录管理
├── models.py           # 数据模型 (Pydantic)
└── exceptions.py       # 自定义异常
```

### 2.1 模块职责

1.  **SandboxManager**: 对外提供统一接口。负责协调文件准备、命令执行、资源清理。实现并发控制（信号量）。
2.  **FileSystemManager**:
    *   负责在宿主机 `/tmp/sandbox/<session_id>` 创建工作区。
    *   负责将用户上传的多文件结构写入磁盘。
    *   负责执行后的清理工作（无论成功失败）。
3.  **NsjailExecutor**:
    *   构建复杂的 `nsjail` 命令行参数。
    *   调用 `subprocess.run` 执行沙盒进程。
    *   处理超时 (`TimeoutExpired`) 和输出捕获。

---

## 3. API 接口设计 (多文件支持)

为了支持复杂项目（如 `main.py` 引用 `utils.py`，或读取 `data.csv`），API 必须支持多文件上传。

### 3.1 运行代码接口

*   **Endpoint**: `POST /api/sandbox/run`
*   **Request Body**:

```json
{
  "runtime": "python:3.9",
  "files": [
    {
      "path": "main.py",
      "content": "import utils\nprint(utils.hello())"
    },
    {
      "path": "utils.py",
      "content": "def hello(): return 'Hello from utils!'"
    },
    {
      "path": "data/config.json",
      "content": "{\"key\": \"value\"}"
    }
  ],
  "entrypoint": "python main.py",
  "env_vars": {
    "MY_VAR": "test"
  },
  "limits": {
    "timeout": 5,          // 秒
    "memory_mb": 128,      // MB
    "cpus": 1.0            // CPU 核心数估计 (仅供参考，nsjail主要限时间)
  }
}
```

*   **Response**:

```json
{
  "status": "success", // success | timeout | error | oom
  "stdout": "Hello from utils!\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 120
}
```

---

## 4. 核心流程详细设计

### 4.1 准备阶段 (FileSystemManager)

1.  **生成 Session ID**: 使用 UUID4 生成唯一标识，例如 `550e8400-e29b-41d4-a716-446655440000`。
2.  **创建工作区**: `mkdir -p /tmp/sandbox/<uuid>/work`。
3.  **写入文件**:
    *   遍历 `files` 列表。
    *   对于 `data/config.json` 这样的路径，先创建子目录 `data`。
    *   将 `content` 写入对应文件。
    *   **安全检查**: 必须校验 `path` 不包含 `..` 或绝对路径，防止写入沙盒工作区之外。

### 4.2 执行阶段 (NsjailExecutor)

构建 `nsjail` 命令是核心。假设 RootFS 位于 `/opt/sandbox-rootfs`。

```bash
nsjail \
    --mode l \                                  # 监听模式/执行模式
    --chroot /opt/sandbox-rootfs \              # 1. 切换根目录
    --bindmount /tmp/sandbox/<uuid>/work:/app \ # 2. 挂载用户代码目录到 /app
    --cwd /app \                                # 3. 切换工作目录
    --user 9999 --group 9999 \                  # 4. 降权执行
    --time_limit 5 \                            # 5. 时间限制
    --rlimit_as 128 \                           # 6. 内存限制 (MB)
    --max_cpus 1 \                              # 7. CPU 限制
    --env MY_VAR=test \                         # 8. 环境变量
    -- \                                        # 分隔符
    /bin/bash -c "python main.py"               # 9. 实际执行命令
```

**关于多语言支持**:
*   如果是 `bash` 运行时，Entrypoint 可能是 `bash script.sh`。
*   如果是 `python` 运行时，Entrypoint 可能是 `python main.py`。
*   因为 RootFS 里已经预装了这些解释器，所以只需要改变命令行末尾的调用方式。

### 4.3 结果处理与清理

1.  **捕获输出**: 使用 `subprocess.PIPE` 捕获 `stdout` 和 `stderr`。
2.  **状态映射**:
    *   Exit Code 0 -> `success`
    *   Exit Code 137 (SIGKILL) -> `oom` (通常被 OOM Killer 杀掉)
    *   Exit Code -9 / Timeout Exception -> `timeout`
    *   其他 -> `error`
3.  **清理**: `rm -rf /tmp/sandbox/<uuid>`。建议使用 `try...finally` 块确保即使代码崩溃也能清理垃圾文件。

---

## 5. RootFS 构建方案

我们需要构建一个包含 Python, Bash, Curl 的 RootFS。推荐使用 Docker 导出方式，方便复用 Docker 生态。

### 5.1 Dockerfile (用于构建 RootFS)

```dockerfile
# apps/python-service/sandbox_images/Dockerfile.python
FROM alpine:3.18

# 1. 安装基础包
RUN apk add --no-cache \
    bash \
    curl \
    python3 \
    py3-pip \
    ca-certificates

# 2. 安装常用 Python 库 (预装)
RUN pip3 install --no-cache-dir \
    requests \
    numpy \
    pandas

# 3. 创建非特权用户 (可选，nsjail 会自动映射)
RUN adduser -D -u 9999 sandbox_user
```

### 5.2 导出脚本 (build_rootfs.sh)

```bash
#!/bin/bash
IMAGE_NAME="sandbox-python-rootfs"
CONTAINER_NAME="sandbox-exporter"
OUTPUT_DIR="/opt/sandbox-rootfs"

# 1. 构建 Docker 镜像
docker build -t $IMAGE_NAME -f apps/python-service/sandbox_images/Dockerfile.python .

# 2. 创建临时容器
docker create --name $CONTAINER_NAME $IMAGE_NAME

# 3. 导出文件系统
mkdir -p $OUTPUT_DIR
docker export $CONTAINER_NAME | tar -x -C $OUTPUT_DIR

# 4. 清理
docker rm $CONTAINER_NAME
```

---

## 6. 并发与资源控制

### 6.1 应用层限流
为了防止宿主机被瞬间的高并发请求压垮，需要在 `SandboxManager` 层面加锁。

```python
import asyncio

class SandboxManager:
    def __init__(self, max_concurrent=10):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def run(self, ...):
        async with self.semaphore:
            return await self._execute(...)
```

### 6.2 宿主机资源保护
`nsjail` 虽然限制了单个沙盒的资源，但 100 个沙盒同时运行依然可能耗尽宿主机内存。
*   **全局内存池**: 可以在应用层维护一个 "已分配内存" 计数器，如果 `current_memory + request_memory > host_limit`，则拒绝请求或排队。

---

## 7. 异常处理规范

| 场景 | 错误码 | 响应消息 | 处理动作 |
| :--- | :--- | :--- | :--- |
| **文件写入失败** (如磁盘满) | 500 | System Error: Disk full | 记录日志，报警 |
| **用户代码路径非法** (包含 `../`) | 400 | Invalid file path | 拒绝执行 |
| **nsjail 启动失败** (找不到 RootFS) | 500 | Sandbox configuration error | 记录严重错误日志 |
| **代码超时** | 200 | Status: timeout | 正常返回，告知用户 |
| **代码 OOM** | 200 | Status: oom | 正常返回，告知用户 |
| **代码语法错误** | 200 | Status: error, Stderr: SyntaxError... | 正常返回 |

---

## 8. 安全 Checklist

- [ ] **Egress Filtering**: 宿主机 iptables 是否配置了禁止访问内网 (192.168.x.x 等)？
- [ ] **Read-Only Root**: nsjail 是否开启了 RootFS 只读挂载？
- [ ] **Tmpfs**: `/tmp` 是否挂载为 tmpfs (内存盘)，避免写穿到宿主机磁盘？
- [ ] **PIDs Limit**: 是否限制了最大进程数防止 Fork 炸弹？
- [ ] **Path Traversal**: 文件写入接口是否严格过滤了 `../`？
