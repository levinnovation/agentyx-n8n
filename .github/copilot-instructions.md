# GitHub Copilot instructions

This repository is **vertical-domain-centric**: **tenant → domain → capability → assets**.

## Do not suggest

- Top-level `apps/`, `agents/`, `workflows/`, `bots/`, or other runtime-centric roots
- Cross-tenant asset references

## Do suggest

- Customer-specific code under `tenants/{tenant}/domains/{domain}/...` and `tenants/{tenant}/assets/...`
- Shared patterns under `templates/` and `standards/`
- Common operator utilities under `common/utils/` when shared (parameterized; no embedded tenant business rules)

## Versioning

- Prompts, policies, n8n JSON, and specs should be **versioned in Git**
- **No secrets** in source
- Do **not** silently invent external API behavior—use existing contracts/READMEs or ask

## Read first

Prefer `AGENTS.md` and `knowledge/context-packs/repo-context.md` for repo law before large edits.
