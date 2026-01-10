import shutil
import uuid
import logging
from pathlib import Path
from typing import List
from .models import FileItem
from .exceptions import FileSystemError

logger = logging.getLogger(__name__)

class FileSystemManager:
    BASE_DIR = Path("/tmp/sandbox")

    def __init__(self, session_id: str = None):
        self.session_id = session_id or str(uuid.uuid4())
        self.sandbox_dir = self.BASE_DIR / self.session_id
        self.work_dir = self.sandbox_dir / "work"

    def setup(self, files: List[FileItem]) -> Path:
        """
        Creates the sandbox directory structure and writes user files.
        Returns the path to the work directory.
        """
        try:
            # Create directories
            if self.sandbox_dir.exists():
                logger.warning(f"Sandbox directory {self.sandbox_dir} already exists, cleaning up...")
                shutil.rmtree(self.sandbox_dir)
            
            self.work_dir.mkdir(parents=True, exist_ok=True)

            # Write files
            for file in files:
                self._write_file(file)
                
            return self.work_dir
        except Exception as e:
            logger.error(f"Setup failed for session {self.session_id}: {e}")
            self.cleanup()
            raise FileSystemError(f"Failed to setup sandbox filesystem: {str(e)}") from e

    def _write_file(self, file: FileItem):
        try:
            # Security check and path resolution
            safe_path = self._validate_path(file.path)
            
            # Ensure parent directory exists
            safe_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write content
            with open(safe_path, 'w', encoding='utf-8') as f:
                f.write(file.content)
        except FileSystemError:
            raise
        except Exception as e:
            raise FileSystemError(f"Failed to write file {file.path}: {str(e)}") from e

    def _validate_path(self, user_path: str) -> Path:
        """
        Validates that the path is safe and contained within the work directory.
        """
        # Basic string checks
        if ".." in user_path:
             raise FileSystemError(f"Invalid file path (contains '..'): {user_path}")
        
        if Path(user_path).is_absolute():
            raise FileSystemError(f"Invalid file path (absolute path): {user_path}")
        
        # Resolve full path
        full_path = (self.work_dir / user_path).resolve()
        
        # Check if it's still inside work_dir
        # We use str() comparison to avoid issues with symlinks if any (though unlikely here)
        if not str(full_path).startswith(str(self.work_dir.resolve())):
            raise FileSystemError(f"Path traversal detected: {user_path}")
            
        return full_path

    def cleanup(self):
        """
        Removes the sandbox directory and all its contents.
        """
        try:
            if self.sandbox_dir.exists():
                shutil.rmtree(self.sandbox_dir)
        except Exception as e:
            logger.error(f"Failed to cleanup sandbox {self.session_id}: {str(e)}")
