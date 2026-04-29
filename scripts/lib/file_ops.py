"""File system helpers."""

import shutil
from pathlib import Path


def copy_tree(src: Path, dst: Path) -> None:
    """Copy a directory tree, overwriting if needed."""
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)


def ensure_dir(path: Path) -> Path:
    """Ensure a directory exists and return it."""
    path.mkdir(parents=True, exist_ok=True)
    return path
