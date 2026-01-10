import pytest
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock
from app.sandbox import SandboxManager, SandboxRequest, FileItem, ResourceLimits, SandboxStatus, FileSystemManager
from app.sandbox.exceptions import FileSystemError

@pytest.fixture
def sandbox_manager():
    return SandboxManager()

@pytest.fixture
def file_system_manager():
    return FileSystemManager()

def test_filesystem_setup_cleanup(file_system_manager):
    files = [
        FileItem(path="main.py", content="print('hello')"),
        FileItem(path="data/config.json", content="{}")
    ]
    
    work_dir = file_system_manager.setup(files)
    
    assert work_dir.exists()
    assert (work_dir / "main.py").exists()
    assert (work_dir / "data/config.json").exists()
    assert (work_dir / "data/config.json").read_text() == "{}"
    
    file_system_manager.cleanup()
    assert not work_dir.exists()
    assert not file_system_manager.sandbox_dir.exists()

def test_filesystem_security(file_system_manager):
    # Test path traversal
    with pytest.raises(FileSystemError):
        file_system_manager.setup([FileItem(path="../evil.py", content="")])
    
    with pytest.raises(FileSystemError):
        file_system_manager.setup([FileItem(path="/etc/passwd", content="")])

@pytest.mark.asyncio
async def test_sandbox_execution_success(sandbox_manager):
    # Mock subprocess.run
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=0,
            stdout="hello",
            stderr=""
        )
        
        request = SandboxRequest(
            files=[FileItem(path="main.py", content="print('hello')")],
            entrypoint="python main.py"
        )
        
        response = await sandbox_manager.run(request)
        
        assert response.status == SandboxStatus.SUCCESS
        assert response.stdout == "hello"
        assert response.exit_code == 0
        
        # Verify command arguments
        args, kwargs = mock_run.call_args
        cmd = args[0]
        assert "nsjail" in cmd
        assert "--time_limit" in cmd
        assert "5" in cmd # default timeout

@pytest.mark.asyncio
async def test_sandbox_execution_timeout(sandbox_manager):
    # Mock subprocess.run returning -9 (SIGKILL) which we map to TIMEOUT
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=-9,
            stdout="",
            stderr="Killed"
        )
        
        request = SandboxRequest(
            files=[],
            entrypoint="python loop.py"
        )
        
        response = await sandbox_manager.run(request)
        
        assert response.status == SandboxStatus.TIMEOUT

@pytest.mark.asyncio
async def test_sandbox_execution_oom(sandbox_manager):
    # Mock subprocess.run returning 137 (SIGKILL/OOM) which we map to OOM
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(
            returncode=137,
            stdout="",
            stderr="Killed"
        )
        
        request = SandboxRequest(
            files=[],
            entrypoint="python oom.py"
        )
        
        response = await sandbox_manager.run(request)
        
        assert response.status == SandboxStatus.OOM
