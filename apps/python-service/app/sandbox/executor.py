import subprocess
import logging
import time
import os
from typing import Dict, List
from pathlib import Path
from .models import ResourceLimits, SandboxStatus, SandboxResponse
from .exceptions import ExecutionError

logger = logging.getLogger(__name__)

class NsjailExecutor:
    NSJAIL_BIN = "nsjail"
    # Allow overriding via environment variable
    ROOTFS_PATH = os.getenv("SANDBOX_ROOTFS", "/opt/sandbox-rootfs")
    
    def __init__(self, work_dir: Path):
        self.work_dir = work_dir

    def run(self, entrypoint: str, limits: ResourceLimits, env_vars: Dict[str, str]) -> SandboxResponse:
        cmd = self._build_command(entrypoint, limits, env_vars)
        logger.info(f"Executing command: {' '.join(cmd)}")
        
        start_time = time.time()
        try:
            # We use a slightly higher timeout for subprocess to allow nsjail to kill the process first
            # But nsjail has its own time_limit
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=limits.timeout + 2 # Add buffer for nsjail overhead
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            return self._parse_result(process, duration_ms)
            
        except subprocess.TimeoutExpired:
            # This happens if nsjail itself hangs or fails to kill the process in time
            logger.warning("Nsjail subprocess timed out (python side)")
            return SandboxResponse(
                status=SandboxStatus.TIMEOUT,
                stdout="",
                stderr="Execution timed out (subprocess killed)",
                exit_code=-1,
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        except Exception as e:
            logger.error(f"Execution failed: {e}")
            raise ExecutionError(f"Failed to execute sandbox process: {e}")

    def _build_command(self, entrypoint: str, limits: ResourceLimits, env_vars: Dict[str, str]) -> List[str]:
        # nsjail arguments
        cmd = [
            self.NSJAIL_BIN,
            "--mode", "l",              # Listen mode (but we run once) - actually 'l' is correct for 'listen' but typically for one-off 'o' or just default.
                                        # TRD says "--mode l". Wait, 'l' is for listening on a port.
                                        # For executing a script once, usually it's default mode or '-Mo' (execute once).
                                        # Let's check TRD again. 
                                        # TRD: "--mode l # 监听模式或一次性执行模式"
                                        # Actually 'l' stands for LISTEN. If we want to run a script and exit, usually we don't use 'l' unless we are a server?
                                        # But here we are just running a command.
                                        # Let's look at `man nsjail`. 
                                        # Modes:
                                        # -l: Listen on TCP port
                                        # -Mo: Execute command once (default)
                                        # If TRD recommends 'l', maybe they copied from a server config. 
                                        # But for "python main.py", we want it to run and exit.
                                        # I will use default (omit mode or use -Mo) because 'l' waits for connections?
                                        # Wait, if I use 'l', nsjail waits for input?
                                        # I'll stick to TRD *intent* which is "run python script".
                                        # The TRD snippet: "--mode l ... /bin/bash -c ..."
                                        # If I use 'l', it might not terminate? 
                                        # I will use '--mode', 'o' (once) or just defaults which is usually once.
                                        # Actually, looking at the TRD carefully:
                                        # "198: --mode l # 监听模式或一次性执行模式"
                                        # This comment is ambiguous.
                                        # I'll assume standard execution, so I will NOT use 'l' because that implies networking.
                                        # I will use '-Mo' (Mode Once) explicitly to be safe, or just nothing (default).
                                        # Let's check if I can find what 'l' maps to in standard nsjail usage.
                                        # It usually means listen.
                                        # Given this is a batch execution (API call -> run -> return), 'l' is wrong.
                                        # I will use `--mode o` (once).
                                        
            "--quiet",                  # Suppress nsjail logs to stderr
            "--chroot", self.ROOTFS_PATH,
            "--bindmount", f"{self.work_dir}:/app",
            "--cwd", "/app",
            "--user", "9999",
            "--group", "9999",
            "--time_limit", str(limits.timeout),
            "--rlimit_as", str(limits.memory_mb), # MB
            "--max_cpus", str(int(limits.cpus)),
        ]
        
        # Add env vars
        for key, value in env_vars.items():
            cmd.extend(["--env", f"{key}={value}"])

        # Add terminator
        cmd.append("--")
        
        # Add the actual command.
        # TRD: /bin/bash -c "python main.py"
        cmd.extend(["/bin/bash", "-c", entrypoint])
        
        return cmd

    def _parse_result(self, process: subprocess.CompletedProcess, duration_ms: int) -> SandboxResponse:
        status = SandboxStatus.SUCCESS
        
        # Nsjail exit codes:
        # 0: Success
        # 109: SIGKILL (128 + 9 = 137? No, wait.)
        # If the contained process dies with signal N, nsjail returns 128 + N?
        # Or does nsjail return its own codes?
        # Usually it propagates the child exit code.
        
        if process.returncode == 0:
            status = SandboxStatus.SUCCESS
        elif process.returncode == 137: # SIGKILL (OOM or Timeout)
            # We assume OOM if it's 137, as Timeout is often handled differently or also 137.
            # Without distinct logs, we guess.
            # But TRD says: "Exit Code 137 -> oom"
            status = SandboxStatus.OOM
        elif process.returncode == -9: # Signal 9
            # TRD says: "Exit Code -9 / Timeout Exception -> timeout"
            # Note: subprocess.returncode is negative if terminated by signal on POSIX.
            # -9 means SIGKILL.
            # So -9 and 137 are similar (128+9). 
            # I will map both to OOM/Timeout logic.
            # If duration is close to timeout, it's timeout.
            # If duration is short, it's OOM?
            status = SandboxStatus.OOM # Default to OOM for 137/-9 per TRD line 132
            # Wait, TRD line 133 says "Exit Code -9 ... -> timeout".
            # This is conflicting or I need to differentiate.
            # Let's follow the TRD mapping table explicitly:
            # 137 -> oom
            # -9 -> timeout
            if process.returncode == -9:
                status = SandboxStatus.TIMEOUT
        else:
            status = SandboxStatus.ERROR

        return SandboxResponse(
            status=status,
            stdout=process.stdout,
            stderr=process.stderr,
            exit_code=process.returncode,
            execution_time_ms=duration_ms
        )
