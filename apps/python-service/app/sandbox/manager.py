import asyncio
import logging
import functools
from typing import Optional
from .models import SandboxRequest, SandboxResponse, SandboxStatus
from .filesystem import FileSystemManager
from .executor import NsjailExecutor
from .exceptions import SandboxError

logger = logging.getLogger(__name__)

class SandboxManager:
    def __init__(self, max_concurrent: int = 10):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def run(self, request: SandboxRequest) -> SandboxResponse:
        """
        Executes the sandbox request asynchronously with concurrency control.
        """
        async with self.semaphore:
            loop = asyncio.get_running_loop()
            # Run the blocking synchronous logic in a separate thread
            return await loop.run_in_executor(None, self._execute_sync, request)

    def _execute_sync(self, request: SandboxRequest) -> SandboxResponse:
        fs = FileSystemManager()
        try:
            logger.info(f"Starting execution for runtime {request.runtime}")
            
            # 1. Setup Filesystem
            work_dir = fs.setup(request.files)
            
            # 2. Prepare Executor
            executor = NsjailExecutor(work_dir)
            
            # 3. Run
            # Note: We currently ignore request.runtime and use the default rootfs
            # In the future, we could select different rootfs based on request.runtime
            result = executor.run(
                entrypoint=request.entrypoint,
                limits=request.limits,
                env_vars=request.env_vars
            )
            return result
            
        except SandboxError as e:
            logger.warning(f"Sandbox error during execution: {e}")
            return SandboxResponse(
                status=SandboxStatus.ERROR,
                stdout="",
                stderr=str(e),
                exit_code=-1,
                execution_time_ms=0
            )
        except Exception as e:
            logger.error(f"Unexpected error during execution: {e}", exc_info=True)
            return SandboxResponse(
                status=SandboxStatus.ERROR,
                stdout="",
                stderr=f"Internal system error: {str(e)}",
                exit_code=-1,
                execution_time_ms=0
            )
        finally:
            # 4. Cleanup
            fs.cleanup()
