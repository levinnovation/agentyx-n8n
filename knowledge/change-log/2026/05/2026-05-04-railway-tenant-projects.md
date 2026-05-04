# Change Record: Per-tenant Railway project as canonical runtime

**Date:** 2026-05-04  
**Scope:** `templates/assets/railway-tenant-stack/`, `tenants/euromobilia/assets/deploy/railway/`, `knowledge/decisions/ADR-0010`, Hostinger deprecation, CI/CD

## Summary

Adopted Railway as the canonical per-tenant deployment platform, introduced a reusable `railway-tenant-stack` template, instantiated it for `euromobilia`, deprecated the Hostinger VPS stack (ADR-0009), and added a Railway CLI-driven CI/CD path.

## What changed

### Knowledge

- **ADR-0010** — New decision: one Railway project per tenant; service set defined; supersedes ADR-0009.
- **ADR-0009** — Status updated to "Superseded by ADR-0010"; added Migration section.
- **Glossary** — Added rows for Railway, LibreChat, Paperclip, Langfuse, Flowise, Agentyx Portal.
- **Euromobilia context pack** — Updated "Where to look" to point at the Railway template + tenant deploy folder.
- **Migration notes** — Added entry for Railway tenant project migration.

### Template (`templates/assets/railway-tenant-stack/`)

- `README.md`, `asset.yaml`, `railway.toml`
- `docs/architecture.md`, `docs/secrets.md`
- Per-service folders (`postgres`, `n8n`, `librechat`, `paperclip`, `flowise`, `langfuse`, `agent`, `agentyx-portal`) each with `README.md`, `.env.example`, and `asset.yaml`.

### Tenant instantiation (`tenants/euromobilia/assets/deploy/railway/`)

- `asset.yaml` — `id: euromobilia-railway-stack`, `status: active`.
- `railway.toml` — euromobilia-specific service names and image references.
- `.env.example` — consolidated tenant-level variables.
- Deleted obsolete `railway.json`.

### Hostinger deprecation

- `n8n-hostinger/asset.yaml` — `status: deprecated`, `superseded_by: euromobilia-railway-stack`.
- `agent-hostinger/asset.yaml` — same.
- READMEs — added DEPRECATED banners linking to ADR-0010.
- GitHub Actions — gated to `workflow_dispatch` + `vars.HOSTINGER_DEPLOY_ENABLED == 'true'`.

### CI/CD

- `scripts/railway/` — 8-script CLI toolkit (`_lib.sh`, `bootstrap-tenant.sh`, `sync-vars.sh`, `deploy-service.sh`, `redeploy.sh`, `rollback.sh`, `smoke-test.sh`, `teardown-tenant.sh`).
- `.github/workflows/_reusable/railway-deploy.yml`
- `.github/workflows/bootstrap-tenant-railway.yml`
- `.github/workflows/deploy-euromobilia-agent-railway.yml`
- `.github/workflows/deploy-euromobilia-stack-railway.yml`

### Capability docs

- `kitchen-quotation/docs/deployment.md` — Railway-first steps; Hostinger as legacy fallback.
- `kitchen-quotation/docs/runbook.md` — Railway-aware ops (restart, logs, rollback, secret rotation).

## Validation

- `make validate` passes.
- `make knowledge-index` regenerated.

## Related

- ADR-0010
- ADR-0009 (superseded)
