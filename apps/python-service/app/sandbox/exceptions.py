class SandboxError(Exception):
    """Base exception for sandbox errors"""
    pass

class FileSystemError(SandboxError):
    """Raised when file system operations fail"""
    pass

class ConfigurationError(SandboxError):
    """Raised when sandbox configuration is invalid"""
    pass

class ExecutionError(SandboxError):
    """Raised when execution fails internally (not user code error)"""
    pass
