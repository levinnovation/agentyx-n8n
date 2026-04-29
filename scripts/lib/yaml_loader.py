"""YAML loading utilities."""

from pathlib import Path
import yaml


def load_yaml(path: Path) -> dict:
    """Load and return a YAML file as a dict."""
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def dump_yaml(data: dict, path: Path) -> None:
    """Write a dict to a YAML file."""
    path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
