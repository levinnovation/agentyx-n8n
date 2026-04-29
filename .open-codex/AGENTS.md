# Open Codex — Agentyx Vertical Assets

## Model

**tenant → domain → capability → assets**. Implementation technologies are **assets**, not root folders.

## Forbidden

Top-level `agents/`, `workflows/`, `apps/`, `bots/`. Customer implementation: `tenants/{tenant}/` only.

## Read first

`AGENTS.md`, `CONSTITUTION.md`, `DOMAIN_MODEL.md`, `knowledge/context-packs/repo-context.md`.

## Validate

```bash
make validate
```

## Knowledge updates

If you change governance or structure, update `knowledge/` and run `make knowledge-index`.

Details: `context.md`.
