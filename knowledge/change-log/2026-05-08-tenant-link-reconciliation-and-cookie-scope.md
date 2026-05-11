# 2026-05-08 — Tenant URL reconciliation + auth cookie scoping hardening

## Summary

Hardened tenant isolation and portal link reliability by deriving URL variables from
tenant slug in Railway automation, adding explicit portal link verification, and
making Better Auth cookie domain configurable per tenant.

## Files

- `services/better-auth/src/config.ts` — added `BETTER_AUTH_COOKIE_DOMAIN`.
- `services/better-auth/src/server.ts` — cookie sharing now uses configurable
  tenant-scoped domain instead of hardcoded `.agentyx.one`.
- `scripts/railway/configure-tenant-post-deploy.sh` — centralized URL derivation
  from tenant slug, sets `BETTER_AUTH_COOKIE_DOMAIN`, validates non-empty portal
  link variables.
- `scripts/railway/reconcile-portal-links.sh` — new idempotent remediation script
  to force-correct tenant portal/auth URLs in Railway and trigger redeploy.
- `templates/assets/railway-tenant-stack/template-config.json` — added
  `BETTER_AUTH_COOKIE_DOMAIN` to better-auth template vars + tenant customization.
- `templates/assets/railway-tenant-stack/services/better-auth/.env.example` —
  documented cookie-domain variable.

## Operational notes

- Live reconciliation requires a valid Railway token (`RAILWAY_TOKEN` or
  `RAILWAY_API_TOKEN`) in non-interactive environments.
- Recommended tenant value: `BETTER_AUTH_COOKIE_DOMAIN=.{tenant}.agentyx.one`
  (example: `.levinnovation.agentyx.one`).
