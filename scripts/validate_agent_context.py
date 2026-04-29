"""Validate presence of repo-native AI agent context files and key knowledge packs."""

from __future__ import annotations

import sys
from pathlib import Path

from rich.console import Console

ROOT = Path(__file__).resolve().parent.parent
console = Console()

REQUIRED_FILES: tuple[Path, ...] = (
    ROOT / "AGENTS.md",
    ROOT / ".cursor" / "rules" / "architecture.mdc",
    ROOT / ".cursor" / "rules" / "knowledge-system.mdc",
    ROOT / ".cursor" / "rules" / "tenant-domain-assets.mdc",
    ROOT / ".cursor" / "rules" / "common-utils.mdc",
    ROOT / ".cursor" / "rules" / "coding-standards.mdc",
    ROOT / ".claude" / "CLAUDE.md",
    ROOT / ".opencode" / "AGENTS.md",
    ROOT / ".opencode" / "context.md",
    ROOT / ".open-codex" / "AGENTS.md",
    ROOT / ".open-codex" / "context.md",
    ROOT / ".github" / "copilot-instructions.md",
    ROOT / "knowledge" / "context-packs" / "repo-context.md",
    ROOT / "knowledge" / "context-packs" / "agent-session-bootstrap.md",
)


def main() -> int:
    errors: list[str] = []
    for path in REQUIRED_FILES:
        if not path.is_file():
            errors.append(f"missing {path.relative_to(ROOT)}")

    rules_dir = ROOT / ".cursor" / "rules"
    if not rules_dir.is_dir():
        errors.append(f"missing directory {rules_dir.relative_to(ROOT)}")

    if errors:
        console.print("[red]Agent context validation failed:[/red]")
        for e in errors:
            console.print(f"  [red]-[/red] {e}")
        return 1

    console.print("[bold green]Agent context files OK.[/bold green]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
