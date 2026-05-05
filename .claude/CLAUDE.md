# Claude Code — repository instructions

## Read first

1. `AGENTS.md`
2. `knowledge/context-packs/repo-context.md`
3. `CONSTITUTION.md` and `DOMAIN_MODEL.md` when making structural changes

## Non-negotiables

- Preserve **tenant → domain → capability → assets**.
- **Never** create standalone app folders at repo root (`apps/`, `agents/`, `workflows/`, `bots/`).
- **Update `knowledge/`** when you introduce or change architectural/governance rules (ADR / prompt log / change record / context packs as appropriate).

## Quality

- Do **not** claim scaffolded or stub code is production-ready.
- Prefer **small commits** and **small diffs**.
- Ask before **destructive** refactors (large moves, mass renames).

## Validation

After structural changes:

```bash
make validate
```

## n8n MCP (vibe coding workflows)

When working with n8n workflows via MCP:

1. **Git-first**: AI generates JSON → saves to `tenants/{tenant}/assets/workflows/n8n/` → validate → CI deploys
2. **Never** let AI deploy directly to prod n8n without repo commit
3. **Validation**: Run `make validate` after JSON changes
4. **Safety**: Always make a copy before AI-editing production workflows

## Legacy migrations

If migrating legacy code, write a **legacy inventory** first (e.g. `knowledge/change-log/` entry) before bulk moves.
