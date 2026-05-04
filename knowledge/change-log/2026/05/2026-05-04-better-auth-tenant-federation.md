# Change Record: Better Auth Tenant Federation

**Date:** 2026-05-04  
**Scope:** `templates/assets/railway-tenant-stack/`, `tenants/euromobilia/assets/deploy/railway/`, `knowledge/decisions/ADR-0012`

## Summary

Added Better Auth as the per-tenant auth federation layer inside every Railway project. Two new services (`better-auth`, `auth-proxy`), OIDC integration for LibreChat/Langfuse, JWT verification path for the Agent, and Caddy `forward_auth` gating for n8n/Flowise/Paperclip.

## What changed

### Knowledge

- **ADR-0012** — New decision: per-tenant Better Auth topology, forward-auth gating, Google Workspace + email/password identity, JWT verify path, deferred Portal embedding.
- **Change record** — `knowledge/change-log/2026/05/2026-05-04-better-auth-tenant-federation.md` (this file).
- **Glossary** — Added `Better Auth` row.
- **Context packs** — Updated `euromobilia-context.md` and `repo-context.md` with Better Auth references.

### Template (`templates/assets/railway-tenant-stack/`)

- New `services/better-auth/` — Node TS service with Dockerfile, package.json, tsconfig, src/server.ts, src/config.ts, asset.yaml, README, .env.example.
- New `services/auth-proxy/` — Caddy service with Dockerfile, Caddyfile.template, asset.yaml, README, .env.example.
- Updated `railway.toml` — added `[better-auth]` and `[auth-proxy]` blocks; rewired n8n/flowise/paperclip through auth-proxy; added OIDC vars to librechat and langfuse; added JWKS vars to agent.
- Updated `docs/architecture.md` — new topology diagram and Federation section.
- Updated `docs/secrets.md` — added Better Auth and Auth Proxy tables; expanded LibreChat, Langfuse, Agent rows.
- Updated per-service READMEs and `.env.example` files for librechat, langfuse, agent, n8n, flowise, paperclip, postgres.

### Tenant instantiation (`tenants/euromobilia/assets/deploy/railway/`)

- Updated `railway.toml` and `.env.example` with Better Auth + auth-proxy services and variables.
- Created corresponding per-service folders under `services/better-auth/` and `services/auth-proxy/`.

## Validation

- `make validate` passes.
- `make knowledge-index` regenerated.

## Related

- ADR-0012
- ADR-0010
