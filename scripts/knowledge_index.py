"""Regenerate knowledge/INDEX.md with a listing of all Markdown files under knowledge/."""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE = ROOT / "knowledge"
INDEX = KNOWLEDGE / "INDEX.md"

START = "<!-- knowledge-index:start -->"
END = "<!-- knowledge-index:end -->"

AUTO_NOTE = (
    "> **Auto-generated.** Run `make knowledge-index` "
    "(or `python3 scripts/knowledge_index.py`) to refresh.\n\n"
)


def collect_markdown_files() -> list[Path]:
    if not KNOWLEDGE.is_dir():
        return []
    paths = sorted(
        p for p in KNOWLEDGE.rglob("*.md") if p.is_file() and p.resolve() != INDEX.resolve()
    )
    return paths


def build_index_body(paths: list[Path]) -> str:
    if not paths:
        return "_No Markdown files found under `knowledge/`._\n"

    by_top: dict[str, list[Path]] = defaultdict(list)
    for p in paths:
        rel = p.relative_to(KNOWLEDGE)
        # Files directly under knowledge/ (e.g. README.md) — not a subdirectory
        if len(rel.parts) == 1:
            top = "(root)"
        else:
            top = rel.parts[0]
        by_top[top].append(p)

    lines: list[str] = ["## Files\n"]
    for top in sorted(by_top.keys()):
        lines.append(f"### `{top}/`\n")
        for p in sorted(by_top[top], key=lambda x: str(x.relative_to(KNOWLEDGE)).lower()):
            rel = p.relative_to(KNOWLEDGE).as_posix()
            lines.append(f"- [{rel}]({rel})")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    paths = collect_markdown_files()
    body = build_index_body(paths)
    content = (
        "# Knowledge index\n\n"
        + AUTO_NOTE
        + f"{START}\n{body}{END}\n"
    )
    INDEX.write_text(content)
    print(f"Wrote {INDEX.relative_to(ROOT)} ({len(paths)} files indexed)")


if __name__ == "__main__":
    try:
        main()
    except OSError as e:
        print(f"Error writing index: {e}", file=sys.stderr)
        sys.exit(1)
