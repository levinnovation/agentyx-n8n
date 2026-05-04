# Railway Tenant Stack

Reusable template for a **per-tenant Railway project** that hosts the complete Agentyx runtime.

## Services

| Service | Source | Purpose |
|---------|--------|---------|
| `postgres` | Railway plugin | Shared Postgres (multi-DB: n8n, langfuse, librechat, paperclip) |
| `n8n` | `n8nio/n8n` | Workflow automation engine |
| `librechat` | `ghcr.io/danny-avila/librechat` | Open-source chat UI |
| `paperclip` | Build from `paperclipai/paperclip` | AI-team orchestrator |
| `langfuse` | `ghcr.io/langfuse/langfuse` | LLM tracing & observability |
| `agent` | Per-tenant GHCR image | FastAPI / LangGraph agent runtime |
| `agentyx-portal` | Placeholder GHCR image | Tenant-facing portal SPA |
| `flowise` | `flowiseai/flowise` | **Optional** low-code agent builder |

## When to instantiate

Create a copy under `tenants/{tenant}/assets/deploy/railway/` and set tenant-specific values in `railway.toml`, `.env.example`, and per-service `asset.yaml` files.

## Env-var contract

Each service folder has its own `.env.example` listing required variables. The top-level `.env.example` at the tenant deploy folder consolidates the union of all keys for operator convenience.

Secrets are **never** committed. They are injected into Railway via:

1. `scripts/railway/sync-vars.sh --tenant <tenant>` (local operator)
2. GitHub Actions `_reusable/railway-deploy.yml` (CI)

## Optional services

- `flowise` is gated by `FLOWISE_ENABLED=true`. When disabled, the service is not created during bootstrap.

## Bootstrap

```bash
export RAILWAY_TOKEN=<project-or-account-token>
bash scripts/railway/bootstrap-tenant.sh --tenant <tenant_id>
```

This is idempotent: re-running skips existing services and updates env vars.

## Docs

- `docs/architecture.md` — Stack diagram and service responsibilities
- `docs/secrets.md` — Full secrets reference
