# Cursor rules template (`.mdc`)

## Purpose

Persistent Cursor guidance with optional file globs.

## Expected location

`.cursor/rules/<name>.mdc`

## Required structure

YAML frontmatter:

```yaml
---
description: One-line purpose
alwaysApply: true   # or false
globs: "**/*.py"    # optional; when alwaysApply is false
---
```

Body:

1. **Scope** — what this rule governs
2. **Must / must not** — short bullets
3. **Pointers** — `AGENTS.md`, `CONSTITUTION.md`, `knowledge/...`

## When to update

- Rule is misleading after a refactor
- New asset type or language introduced (add or split rules; keep <50 lines per rule when possible)

## Anti-pattern

One mega-rule mixing architecture, knowledge, and formatting—split by concern.
