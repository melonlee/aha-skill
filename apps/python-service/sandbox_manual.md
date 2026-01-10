# Sandbox Module User Manual

## 1. Overview
The Sandbox module provides a secure environment for executing untrusted Python/Bash code using `nsjail`. It supports multi-file projects, resource limits, and network isolation.

## 2. Deployment Configuration

### 2.1 Prerequisites
- Linux OS (nsjail is Linux-only)
- Docker (for building RootFS)
- `nsjail` installed on the host:
  ```bash
  sudo apt-get install nsjail  # On Debian/Ubuntu if available, or build from source
  ```

### 2.2 Building RootFS
Before running the service, you must build the RootFS:
```bash
cd apps/python-service
./sandbox_images/build_rootfs.sh
```
This will create `/opt/sandbox-rootfs`.

### 2.3 Environment Variables
- `SANDBOX_ROOTFS`: Path to the RootFS (default: `/opt/sandbox-rootfs`)

### 2.4 Service Startup
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 3. API Usage

### 3.1 Run Code
**Endpoint**: `POST /api/sandbox/run`

**Request**:
```json
{
  "runtime": "python:3.9",
  "files": [
    {
      "path": "main.py",
      "content": "print('Hello World')"
    }
  ],
  "entrypoint": "python main.py",
  "limits": {
    "timeout": 5,
    "memory_mb": 128,
    "cpus": 1.0
  }
}
```

**Response**:
```json
{
  "status": "success",
  "stdout": "Hello World\n",
  "stderr": "",
  "exit_code": 0,
  "execution_time_ms": 42
}
```

## 4. Development & Testing

### 4.1 Running Tests
```bash
export PYTHONPATH=$PYTHONPATH:$(pwd)/apps/python-service
pytest apps/python-service/tests/
```
