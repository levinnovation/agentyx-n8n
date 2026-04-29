# Claude Code `CLAUDE.md` template

## Purpose

Operating instructions for Claude Code sessions in this repository.

## Expected location

`.claude/CLAUDE.md`

## Required sections

1. Read order: `AGENTS.md`, `knowledge/context-packs/repo-context.md`, …
2. Structural law: tenant-centric layout; **no** root `apps/` / `agents/` / `workflows/`
3. Knowledge updates when architecture changes
4. Validation: `make validate` after structural edits
5. Safety: ask before destructive refactors; honest about stubs

## When to update

- Validation or branching workflow changes
- New constraints from ADRs

## Anti-pattern

Copying full policy docs—link to `knowledge/decisions/`.
