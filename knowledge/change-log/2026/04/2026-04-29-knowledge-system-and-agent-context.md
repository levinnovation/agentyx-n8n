# 2026-04-29: Knowledge system and agent context

**Related:** ADR-0005, ADR-0006, prompt log `knowledge/prompts/cursor/0003-add-knowledge-system.md`, `knowledge/prompts/cursor/0004-add-agent-context-files.md`

## Summary

Introduced the top-level **`knowledge/`** ledger (ADRs, prompts, change records, context packs, glossary, lessons, operations) and **repo-native AI agent context** (`AGENTS.md`, Cursor rules, Claude/OpenCode/Open Codex/Copilot files). Added `scripts/knowledge_index.py`, `scripts/validate_agent_context.py`, and wired **`validate-agent-context`** into **`make validate`**.

## Rationale

Reduce reliance on ephemeral chat context; record architecture evolution durably; give agents stable entrypoints.

## Files / areas

- `knowledge/**`
- `AGENTS.md`, `.cursor/rules/`, `.claude/`, `.opencode/`, `.open-codex/`, `.github/copilot-instructions.md`
- `scripts/knowledge_index.py`, `scripts/validate_agent_context.py`
- `Makefile`, `README.md`, `CONSTITUTION.md`

## Validation

```bash
make knowledge-index
make validate
```

## Risks / rollback

Low risk (docs-first). Rollback by reverting the commit; keep in mind `make validate` will enforce agent context files once merged.
