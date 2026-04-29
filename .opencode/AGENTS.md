# OpenCode — Agentyx Vertical Assets

## Repo identity

Vertical-domain **AI asset framework**: **tenant → domain → capability → assets**.

## Forbidden

No top-level `agents/`, `workflows/`, `apps/`, `bots/`. Customer code under `tenants/{tenant}/` only.

## Read first

- `AGENTS.md`
- `CONSTITUTION.md`
- `DOMAIN_MODEL.md`
- `knowledge/context-packs/repo-context.md`

## Validation

```bash
make validate
```

## Knowledge

Architectural edits → `knowledge/` (ADR, prompts, change records, context packs). Then:

```bash
make knowledge-index
```

## More

See `context.md` for compact recipes.
