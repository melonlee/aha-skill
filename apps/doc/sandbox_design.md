# ☁️ 轻量级多语言沙盒环境技术方案

## 1. 需求分析

**目标**：构建一个支持 Python 和 Bash (如 curl) 的远程代码执行环境。
**核心约束**：
1.  **安全性**：必须隔离用户提交的不可信代码，防止恶意攻击（如访问内网、破坏文件系统、资源耗尽）。
2.  **资源受限**：部署环境资源有限，无法承担大量 Docker 容器的开销。
3.  **多语言支持**：需支持 Python 解释器及 Bash 命令（包含网络工具如 curl）。

---

## 2. 技术选型对比

在资源受限且需要强隔离的场景下，我们主要对比以下方案：

| 方案 | 技术原理 | 隔离性 | 资源开销 | 启动速度 | 适用性 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Docker (传统)** | 容器化 (Namespaces + Cgroups) | 高 | 中 (几十MB内存/容器) | 秒级 | 通用，但并发高时资源消耗大 |
| **MicroVM (Firecracker)** | 轻量级虚拟机 (KVM) | 极高 (内核级) | 低 (约5MB内存) | 毫秒级 (<125ms) | **AWS Lambda 采用**，但需要宿主机支持 KVM (嵌套虚拟化) |
| **WebAssembly (Wasm)** | 字节码沙盒 | 高 (内存安全) | 极低 | 微秒级 | 纯计算任务极佳，但对 Bash/Curl 等系统级命令支持尚不完善 |
| **Linux Native Sandbox (nsjail)** | 进程隔离 (Namespaces + Seccomp) | 高 | **极低 (进程级)** | **微秒级** | **Google 采用**，适合 Linux 环境运行任意命令 |

---

## 3. 推荐方案设计

鉴于 **"资源有限"** 且 **"除了 Docker"** 的要求，我们推荐采用 **混合沙盒架构**：

1.  **首选方案 (Linux Native)**: 使用 **nsjail** (Google 开源) 或 **Bubblewrap**。这是最符合"资源极低"且"支持 Bash/Curl"的方案。
2.  **备选/未来方案 (Wasm)**: 对于纯 Python 计算任务，使用 Wasm 运行时。

### 方案 A: 基于 nsjail 的轻量级进程沙盒 (推荐)

**nsjail** 是 Google 开发的一个轻量级进程隔离工具。它利用 Linux Namespaces、Cgroups 和 Seccomp-BPF 系统调用过滤来实现安全隔离。

#### 🔍 深度解析：Python 代码是如何执行的？

用户最关心的是：**在一个隔离的进程里，Python 解释器和库从哪来？代码怎么进去？**

核心机制依赖于 **RootFS (根文件系统)** 和 **Bind Mount (绑定挂载)**。

##### 1. 环境准备：RootFS (根文件系统)
`nsjail` 启动时，不会使用宿主机完整的 `/` 目录，而是切换到一个独立的目录作为根目录（`chroot`）。我们需要提前制作这个目录。

*   **制作方法**：可以基于 Alpine Linux 制作一个极小的 RootFS（仅几十 MB）。
*   **包含内容**：
    *   `/bin/sh`, `/bin/bash` (Shell)
    *   `/usr/bin/python3` (Python 解释器)
    *   `/usr/lib/python3.x/` (标准库)
    *   `/usr/bin/curl` (网络工具)
    *   `/lib/` (必要的动态链接库 glibc/musl)
    *   预装的第三方库 (如 `requests`, `numpy` 等)

##### 2. 执行流程详解

当用户提交一段 Python 代码时，后台服务会执行以下步骤：

1.  **代码落盘**：
    宿主机将用户代码写入临时文件，例如 `/tmp/sandbox/task_123/script.py`。

2.  **启动 nsjail**：
    宿主机调用 `nsjail` 命令，配置参数如下：
    *   **`--chroot /opt/sandbox-rootfs`**: 切换到我们准备好的纯净环境。
    *   **`--bindmount /tmp/sandbox/task_123:/app`**: 将宿主机存放代码的临时目录，挂载到沙盒内部的 `/app` 目录。
    *   **`--cwd /app`**: 设定工作目录。

3.  **内部执行**：
    `nsjail` 在隔离环境内启动命令：`/usr/bin/python3 script.py`。
    *   此时 Python 进程看到的文件系统只有 RootFS 和 `/app`。
    *   它无法访问宿主机的 `/etc/passwd` 或其他敏感文件。

4.  **资源限制与监控**：
    *   **内存**：通过 Cgroups 限制（如 64MB），超限直接 OOM Kill。
    *   **时间**：设置 strict timeout（如 2秒）。
    *   **网络**：如果允许联网，配置网络命名空间；否则默认无网络。

##### 3. 依赖管理方案
*   **方案一：全量预装 (推荐)**
    在构建 RootFS 时，通过 `pip install` 将常用的 50-100 个库（requests, pandas, numpy 等）直接装入 `/usr/lib/python...`。
    *   优点：启动极快，零延迟。
    *   缺点：无法支持用户自定义安装非常规库。
*   **方案二：动态安装 (不推荐)**
    在执行前先运行 `pip install`。
    *   缺点：太慢，且消耗大量流量和资源，不适合沙盒场景。

#### 🌐 深度解析：外部 API 调用的端到端链路

当用户代码包含复杂逻辑（如 `import requests` 访问互联网）时，网络流量的处理和安全控制尤为关键。

**场景**：用户提交代码 `import requests; print(requests.get('https://api.openai.com/v1/models').json())`

**执行链路步骤**：

1.  **代码准备**
    *   服务接收代码，写入 `/tmp/sandbox/task_999/main.py`。
    *   确认 RootFS 中已预装 `requests` 库和 CA 证书（`/etc/ssl/certs/`），否则 HTTPS 请求会失败。

2.  **网络配置 (关键)**
    *   `nsjail` 默认使用 CLONE_NEWNET 创建全新的网络命名空间（只有 Loopback 接口）。
    *   为了允许访问外网，我们需要配置 **MacVLAN** 或 **Veth Pair + NAT**。在资源受限场景下，推荐简单的 NAT 模式：
        1.  宿主机启用 IP Forwarding。
        2.  `nsjail` 启动时，分配一个虚拟网卡给沙盒进程。
        3.  配置 iptables 规则（白名单/黑名单）。

3.  **安全防火墙 (Egress Filtering)**
    为了防止 SSRF (服务端请求伪造) 攻击内网，必须实施严格的出口流量过滤：
    *   **禁止内网 IP**：
        *   `10.0.0.0/8`
        *   `172.16.0.0/12`
        *   `192.168.0.0/16`
        *   `127.0.0.0/8` (localhost)
        *   `169.254.169.254` (云元数据服务，**高危**)
    *   **允许公网 IP**：只允许 `0.0.0.0/0` (排除上述内网段)。
    *   **协议限制**：只允许 TCP 80/443 端口。

4.  **实际请求流向**
    ```mermaid
    sequenceDiagram
        participant Py as Python进程(沙盒内)
        participant Net as 网络命名空间
        participant Host as 宿主机(iptables)
        participant Internet as 互联网
    
        Py->>Net: 发起 HTTPS 请求 (api.openai.com)
        Net->>Host: 流量通过 Veth 接口流出
        Host->>Host: iptables 检查 (目的IP是否为内网?)
        alt 是内网 IP
            Host--xNet: DROP/REJECT (连接超时/拒绝)
            Net--xPy: Exception: ConnectionError
        else 是公网 IP
            Host->>Internet: SNAT/Masquerade 转发
            Internet->>Host: 响应数据
            Host->>Net: 转发回沙盒
            Net->>Py: 返回 Response 对象
        end
    ```

5.  **结果返回**
    *   Python 进程将结果打印到 `stdout`。
    *   宿主机上的服务进程捕获 `stdout` 内容。
    *   服务进程通过 HTTP Response 将 JSON 结果返回给前端用户。

#### 🛡️ 风险控制：用户执行 `rm -rf /` 怎么办？

这是用户最担心的问题。答案是：**完全无影响，甚至沙盒内也不会被真正破坏。**

这归功于 **Mount Namespace** 和 **Read-Only (只读)** 挂载策略。

1.  **文件系统隔离**
    *   `nsjail` 启动时，用户进程看到的文件系统（RootFS）是宿主机上某个目录的**镜像**。
    *   通过 `chroot/pivot_root`，用户无法“向上”访问到宿主机的真实根目录 `/`。
    *   **结论**：用户执行 `rm -rf /etc/passwd`，实际上是在删 RootFS 里的文件，宿主机毫发无损。

2.  **只读挂载 (Read-Only Mounts)**
    *   更进一步，我们配置 `nsjail` 时，将 RootFS 挂载为 **只读模式 (Read-Only)**。
    *   **现象**：用户执行 `rm -rf /bin/bash` 会直接报错：`Read-only file system`。
    *   **唯一可写区**：通常只挂载一个临时的 `/tmp` 目录为可写（且是 `tmpfs` 内存文件系统），进程退出后数据瞬间消失。

3.  **防 Fork 炸弹**
    *   除了文件破坏，另一种风险是资源耗尽（如 `while(1){fork()}`）。
    *   **对策**：`nsjail` 使用 **Cgroups (pids controller)** 限制最大进程数（例如 `--max_pids 10`）。一旦超过限制，`fork()` 调用失败。

4.  **防提权 (Capabilities)**
    *   默认丢弃所有 Linux Capabilities（如 `CAP_SYS_ADMIN`）。即使沙盒内的代码利用漏洞变成了 root 用户（uid 0），它也只是个“伪 root”，没有任何实际内核权限（无法挂载文件系统、无法修改网络配置）。

#### ✅ 优势
*   **零额外开销**：它只是一个包装器，启动的就是原生进程，没有虚拟化开销。
*   **灵活性强**：可以精确控制文件系统挂载（只读/读写）、网络访问、CPU/内存限制。
*   **支持 Bash/Curl**：因为是原生 Linux 进程，完全支持系统级命令。

#### 🏗️ 架构设计

```mermaid
graph TD
    User[用户] --> API[Python/Node 服务端 API]
    API -->|1. 写入临时代码| TempDir[/tmp/sandbox/task_id/]
    API -->|2. 调用 nsjail| Sandbox[nsjail 隔离环境]
    
    subgraph Sandbox [nsjail 沙盒]
        Process[用户进程 (Python/Bash)]
        FS[只读文件系统 rootfs]
        Network[受限网络 Loopback/Outbound]
    end
    
    Sandbox -->|3. 输出流| API
    TempDir -.->|挂载| Sandbox
```

#### 🔧 实现细节

1.  **文件系统隔离 (Chroot/Mount Namespace)**:
    *   使用 `chroot` 或 `pivot_root` 到一个最小化的 Linux 文件系统 (RootFS)。
    *   将用户的代码目录挂载为只读或仅限输出目录可写。
    *   **关键配置**:
        ```bash
        nsjail \
            --mode l \              # 监听模式或一次性执行模式
            --chroot /path/to/rootfs \ # 根文件系统
            --user 9999 --group 9999 \ # 使用低权限用户
            --time_limit 10 \       # 时间限制
            --rlimit_as 128 \       # 内存限制 (MB)
            -- /bin/bash -c "python script.py"
        ```

2.  **网络控制 (Net Namespace)**:
    *   默认断网。
    *   如果允许 `curl`，可以配置网络命名空间，仅允许访问特定 IP 或端口，或者通过 iptables 规则限制。

3.  **系统调用过滤 (Seccomp)**:
    *   禁止危险的系统调用（如 `fork` 炸弹、`execve` 提权等）。
    *   nsjail 内置了通用的安全策略。

---

### 方案 B: WebAssembly (Wasm) 运行时 (针对 Python 计算)

如果用户的 Python 代码是纯计算（不涉及复杂系统调用），可以使用 Wasm。

#### ✅ 优势
*   **极致安全**：Wasm 在内存中完全隔离。
*   **跨平台**：一次编译，到处运行。

#### 🔧 实现
*   使用 **Wasmtime** 或 **Wasmer** 作为运行时。
*   使用编译为 Wasm 的 Python 解释器 (如 **RustPython** 或 **Pyodide** 的服务端版本)。
*   **局限性**: 目前对 `curl` 这类依赖大量 OS 网络栈的命令支持不如原生 Linux 好。

---

## 4. 实施路线图 (MVP)

建议分两步走：

### 第一阶段：基于 nsjail 的原型 (Apps/Python-Service)
无需引入 Docker，直接在 Linux 宿主机（云服务器）上安装 `nsjail`。

1.  **准备 RootFS**: 构建一个包含 Python、Bash、Curl 的最小化文件系统镜像（可以从 Alpine Linux 提取，仅几十 MB）。
2.  **集成 Python Service**:
    *   在 `apps/python-service` 中添加 `SandboxExecutor` 类。
    *   使用 `subprocess` 调用 `nsjail` 命令执行用户代码。
3.  **安全策略配置**:
    *   限制最大运行时间 (Time Limit): 5s
    *   限制最大内存 (Memory Limit): 128MB
    *   限制输出大小 (Output Limit): 1MB

### 第二阶段：API 接口设计

```python
# 示例 API 请求
POST /api/sandbox/run
{
  "language": "python", # 或 "bash"
  "code": "import requests; print(requests.get('https://httpbin.org/get').text)",
  "timeout": 5
}
```

## 5. 总结

| 特性 | nsjail (推荐) | Docker |
| :--- | :--- | :--- |
| **部署复杂度** | 中 (需安装工具和准备 RootFS) | 低 (直接拉取镜像) |
| **运行时资源** | **极低 (进程级)** | 中 (容器级) |
| **安全性** | 高 (依赖内核特性) | 高 |
| **Bash/Curl 支持** | **完美原生支持** | 完美原生支持 |

**结论**：为了满足 **云上资源受限** 且 **支持 Bash/Curl** 的需求，**nsjail** 是最佳的技术方案。它避免了 Docker Daemon 的开销，同时提供了足够的安全性。
