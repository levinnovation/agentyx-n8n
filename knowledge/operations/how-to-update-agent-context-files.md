# How to update agent context files

## When to update

- Repository structure or **constitution** changes
- New **tenant / domain / capability** pattern is introduced
- New **common utility** pattern is introduced (`common/utils/`)
- **Validation commands** change (`Makefile`, `scripts/*`)
- Major **tool or runtime** added (new asset type, new CI gate)
- **Repeated AI mistakes** observed in review (tighten rules—briefly)

## Update targets (keep in sync)

- `AGENTS.md` (universal)
- `.cursor/rules/` (Cursor)
- `.claude/CLAUDE.md` (Claude Code)
- `.opencode/AGENTS.md`, `.opencode/context.md`
- `.open-codex/AGENTS.md`, `.open-codex/context.md`
- `.github/copilot-instructions.md`
- `knowledge/context-packs/` (especially `repo-context.md` and bootstraps)

## Process

1. Update **canonical knowledge** first (`CONSTITUTION.md`, `DOMAIN_MODEL.md`, `knowledge/decisions/`).
2. Update **`AGENTS.md`**.
3. Update **tool-specific** files (short deltas; point to knowledge).
4. Regenerate **`knowledge/INDEX.md`**: `make knowledge-index`
5. Run **`make validate`** (includes agent context checks when wired).
6. Add a **`knowledge/change-log/`** entry for significant updates.

## Anti-pattern

Duplicating long policy in every tool file—**link** to single sources of truth.
