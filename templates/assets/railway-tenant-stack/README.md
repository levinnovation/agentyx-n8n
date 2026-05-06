# Railway Tenant Stack

Reusable template for a **per-tenant Railway project** that hosts the complete Agentyx runtime.

## Services

| Service | Source | Purpose |
|---------|--------|---------|
| `Postgres` | `ghcr.io/railwayapp-templates/postgres-ssl:18` | Shared Postgres (multi-schema) |
| `MongoDB` | `mongo:8.0` | LibreChat document store |
| `meilisearch` | `getmeili/meilisearch:v1.9` | LibreChat search index |
| `better-auth` | `levinnovation/agentyx-vertical-assets` | OIDC / SSO auth service |
| `auth-proxy` | `levinnovation/agentyx-vertical-assets` | Caddy reverse proxy |
| `n8n` | `levinnovation/agentyx-n8n` | Workflow automation engine |
| `librechat` | `levinnovation/agentyx-librechat` | Open-source chat UI |
| `portal` | `levinnovation/agentyx-client-portal` | Tenant-facing portal SPA |
| `paperclip` | `levinnovation/agentyx-paperclip` | AI-team orchestrator |
| `flowise` | `levinnovation/agentyx-flowise` | **Optional** low-code agent builder |

## Deployment methods

### 1. Railway Template (recommended)

The `client-demo-agentyx` project is saved as an **internal Railway template** (private to the `levinnovation` workspace). This is the fastest and most reliable way to provision a new tenant.

```bash
# Deploy from template via CLI
export RAILWAY_TOKEN=<token>
railway init --name "agx-<tenant>-prod"
railway deploy -t <TEMPLATE_CODE>

# Then run post-deploy configuration
bash scripts/railway/configure-tenant-post-deploy.sh --tenant <tenant>
```

See [`knowledge/operations/railway-internal-template.md`](../../../knowledge/operations/railway-internal-template.md) for the full template creation and deployment guide.

**Why use the template?**
- All environment variables are pre-populated with safe defaults
- Secrets are auto-generated using `${{secret()}}` template functions
- Cross-service references (`${{Postgres.DATABASE_URL}}`) work out of the box
- No manual copy-paste of 50+ variables per service

### 2. Manual Bootstrap (fallback)

For edge cases where the template cannot be used:

```bash
export RAILWAY_TOKEN=<project-or-account-token>
bash scripts/railway/bootstrap-tenant.sh --tenant <tenant_id>
```

This is idempotent: re-running skips existing services and updates env vars.

## Env-var contract

Each service folder has its own `.env.example` listing required variables. The top-level `.env.example` at the tenant deploy folder consolidates the union of all keys for operator convenience.

Secrets are **never** committed. They are injected into Railway via:

1. `scripts/railway/configure-tenant-post-deploy.sh --tenant <tenant>` (post-template deploy)
2. `scripts/railway/sync-vars.sh --tenant <tenant>` (local operator)
3. GitHub Actions `_reusable/railway-deploy.yml` (CI)

## Optional services

- `flowise` is gated by `FLOWISE_ENABLED=true`. When disabled, the service is not created during bootstrap.

## Docs

- `docs/architecture.md` — Stack diagram and service responsibilities
- `docs/secrets.md` — Full secrets reference
- `template-config.json` — Railway template variable manifest (source of truth for preset values)
