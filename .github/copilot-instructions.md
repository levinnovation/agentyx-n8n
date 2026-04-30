# GitHub Copilot instructions

This repository is **vertical-domain-centric**: **tenant → domain → capability → assets**.

## Do not suggest

- Top-level `apps/`, `agents/`, `workflows/`, `bots/`, or other runtime-centric roots
- Cross-tenant asset references
- Hardcoded secrets or API keys

## Do suggest

- Customer-specific code under `tenants/{tenant}/domains/{domain}/...` and `tenants/{tenant}/assets/...`
- Shared patterns under `templates/` and `standards/`
- Common operator utilities under `common/utils/` when shared (parameterized; no embedded tenant business rules)
- CI/CD workflows under `.github/workflows/` following the reusable-workflow pattern (see ADR-0008)

## Versioning

- Prompts, policies, n8n JSON, and specs should be **versioned in Git**
- **No secrets** in source
- Do **not** silently invent external API behavior—use existing contracts/READMEs or ask

## CI/CD conventions

- Tenant asset deploys are **automated via GitHub Actions**.
- Reusable workflows live in `.github/workflows/_reusable/`; thin caller workflows live in `.github/workflows/`.
- Docker images are built in CI and pushed to GHCR; VPS hosts pull them.
- n8n workflow JSON changes are auto-imported into the running n8n instance via REST API.
- Manual deploy gates use `workflow_dispatch` with GitHub Environments (`dev`, `prod`).

## Read first

Prefer `AGENTS.md` and `knowledge/context-packs/repo-context.md` for repo law before large edits.
