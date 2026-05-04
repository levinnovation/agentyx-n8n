# ADR-0009: Self-hosted n8n CE on Hostinger VPS

**Status:** Superseded by ADR-0010  
**Date:** 2026-04-29

## Context

Euromobilia `kitchen-quotation` uses n8n workflow assets versioned in Git. A dedicated **runtime** is required to execute webhooks and scheduled flows. Hostinger VPS (`187.127.252.161` / `srv1616787.hstgr.cloud`) is the chosen operator-controlled host.

## Decision

Run **n8n Community Edition** in Docker on the VPS with **Postgres** as the database and **Caddy** as a reverse proxy on port **80** for an initial **HTTP / IP** bootstrap URL (`http://187.127.252.161/`). Deployment manifests and runbooks live in-repo under:

`tenants/euromobilia/assets/deploy/n8n-hostinger/`

**Secrets** (`N8N_ENCRYPTION_KEY`, Postgres password, API keys) exist only on the VPS in `.env`, never committed.

## Consequences

### Positive

- Single operator-controlled runtime aligned with versioned workflow JSON in `tenants/euromobilia/assets/workflows/n8n/`
- Repeatable `docker compose` deploy and documented backup path

### Negative

- HTTP bootstrap is **not** production-safe for credentials or untrusted networks; must move to **HTTPS + domain** before production traffic
- n8n CE lacks built-in Git source control for workflows — repo import/export discipline remains mandatory

## Rejected alternatives

- Treating n8n UI as source of truth without Git exports
- Committing `.env` or SSH private keys to the repository

## Migration

Superseded by **ADR-0010** on 2026-05-04. The Hostinger VPS stack (`n8n-hostinger`, `agent-hostinger`) is retained in-repo as a deprecated legacy reference and emergency rollback path. All new tenant runtime provisioning uses Railway per ADR-0010. See `knowledge/change-log/2026/05/2026-05-04-railway-tenant-projects.md`.

## Follow-up (legacy — pre-ADR-0010)

- Add DNS + TLS; rotate webhook URLs in external systems (e.g. Kapso)
- Register CE license in-app if folders / debug-in-editor features are desired (optional)
