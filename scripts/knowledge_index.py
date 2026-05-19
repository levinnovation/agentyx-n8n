#!/usr/bin/env python3
"""Regenerate knowledge/INDEX.md from the knowledge directory structure."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = ROOT / "knowledge"
INDEX_FILE = KNOWLEDGE_DIR / "INDEX.md"


def list_markdown_files(directory: Path) -> list[Path]:
    return sorted(directory.rglob("*.md"))


def generate_index() -> str:
    lines = [
        "# Knowledge Index",
        "",
        "> Auto-generated index of all knowledge artifacts.",
        "",
        f"_Last updated: {Path(__file__).stat().st_mtime}_",
        "",
    ]

    # Walk top-level categories
    for category_dir in sorted(KNOWLEDGE_DIR.iterdir()):
        if not category_dir.is_dir() or category_dir.name.startswith("."):
            continue

        lines.append(f"## {category_dir.name.replace('-', ' ').title()}")
        lines.append("")

        files = list_markdown_files(category_dir)
        for f in files:
            rel = f.relative_to(KNOWLEDGE_DIR)
            # Skip the INDEX itself
            if f.name == "INDEX.md":
                continue
            lines.append(f"- `{rel}`")

        lines.append("")

    return "\n".join(lines)


def main() -> None:
    content = generate_index()
    INDEX_FILE.write_text(content, encoding="utf-8")
    print(f"Regenerated {INDEX_FILE}")


if __name__ == "__main__":
    main()
