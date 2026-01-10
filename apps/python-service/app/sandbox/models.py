from typing import List, Dict, Optional
from enum import Enum
from pydantic import BaseModel, Field

class SandboxStatus(str, Enum):
    SUCCESS = "success"
    TIMEOUT = "timeout"
    ERROR = "error"
    OOM = "oom"

class FileItem(BaseModel):
    path: str = Field(..., description="Relative path to the file, e.g., 'main.py' or 'data/config.json'")
    content: str = Field(..., description="Content of the file")

class ResourceLimits(BaseModel):
    timeout: int = Field(default=5, ge=1, le=60, description="Timeout in seconds")
    memory_mb: int = Field(default=128, ge=64, le=1024, description="Memory limit in MB")
    cpus: float = Field(default=1.0, ge=0.1, le=4.0, description="CPU cores estimate")

class SandboxRequest(BaseModel):
    runtime: str = Field(default="python:3.9", description="Runtime environment identifier")
    files: List[FileItem] = Field(..., description="List of files to be written to the sandbox")
    entrypoint: str = Field(..., description="Command to execute, e.g., 'python main.py'")
    env_vars: Dict[str, str] = Field(default_factory=dict, description="Environment variables")
    limits: ResourceLimits = Field(default_factory=ResourceLimits, description="Resource constraints")

class SandboxResponse(BaseModel):
    status: SandboxStatus
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
