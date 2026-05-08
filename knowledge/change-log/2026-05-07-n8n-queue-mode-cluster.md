# 2026-05-07 — n8n queue-mode cluster rollout baseline

## Summary

Introduced a queue-mode n8n cluster topology for Railway-based tenant stacks:

- `n8n-main` (control plane),
- `n8n-worker` (execution plane),
- `n8n-webhook` (webhook ingress),
- `redis` (Bull queue backend).

This is wired for LEV Innovation and backported to the shared Railway tenant template.

## Rationale

The previous single-instance n8n runtime (`EXECUTIONS_MODE=regular`) was a bottleneck for resilience and fault tolerance. Queue mode decouples UI/API from workflow execution and isolates webhook ingress from main-process restarts.

## Files / areas

- `templates/assets/railway-tenant-stack/railway.toml`
- `templates/assets/railway-tenant-stack/template-config.json`
- `templates/assets/railway-tenant-stack/services/n8n-main/*`
- `templates/assets/railway-tenant-stack/services/n8n-worker/*`
- `templates/assets/railway-tenant-stack/services/n8n-webhook/*`
- `templates/assets/railway-tenant-stack/services/redis/*`
- `services/auth-proxy/Caddyfile.template`
- `services/auth-proxy/Caddyfile`
- `services/auth-proxy/entrypoint.sh`
- `templates/assets/railway-tenant-stack/services/auth-proxy/Caddyfile.template`
- `templates/assets/railway-tenant-stack/services/auth-proxy/.env.example`
- `tenants/euromobilia/assets/deploy/railway/services/auth-proxy/Caddyfile.template`
- `tenants/euromobilia/assets/deploy/railway/services/auth-proxy/.env.example`
- `scripts/railway/configure-tenant-post-deploy.sh`
- `scripts/railway/bootstrap-client-project.sh`
- `tenants/levinnovation/assets/deploy/railway/*`

## Validation

- `make validate`
- `make knowledge-index`

## Risks / rollback

- If queue variables are incomplete, executions can remain stuck in queued state.
- If `N8N_ENCRYPTION_KEY` differs across n8n roles, credentials cannot be decrypted.
- Rollback path:
  1. Route all n8n traffic back to `n8n-main`,
  2. set `EXECUTIONS_MODE=regular` on main,
  3. scale `n8n-worker` and `n8n-webhook` to zero until configuration is fixed.
