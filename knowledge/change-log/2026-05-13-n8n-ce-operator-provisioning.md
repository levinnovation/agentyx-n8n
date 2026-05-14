# 2026-05-13 — n8n CE operator provisioning (no OIDC SSO)

## Summary

Provisioned `igutt@levinnovation.com` as `global:owner` directly in
`n8n.user` on the levinnovation Railway stack, with initial password
`Master2025` (must be rotated on first login). Documented why true OIDC SSO
into n8n is not currently available and what the path forward is.

## Why

The user reported that clicking "Workflows" in the portal still showed n8n's
own login screen even after a successful portal sign-in. Investigation
confirmed n8n CE's OIDC SSO plugin is licensed-only:

```json
"sso":        { "oidc": { "loginEnabled": false } },
"enterprise": { "saml": false, "ldap": false, "oidc": false }
```

So `N8N_SSO_OIDC_LOGIN_ENABLED=true` and friends are ignored at runtime, and
Caddy `forward_auth` cannot hand off `X-Auth-Email` to n8n (CE has no
trusted-header mode).

## What changed

- New SQL migration:
  `tenants/levinnovation/assets/deploy/railway/migrations/005_n8n_operator_provisioning.sql`
  - Asserts `global:owner` / `global:member` roles exist in `n8n.role`.
  - Upserts `igutt@levinnovation.com` with `roleSlug='global:owner'`,
    bcrypt password hash for `Master2025`, `disabled=false`, `mfaEnabled=false`.
  - Backfills missing `n8n.project` (`type='personal'`) and
    `n8n.project_relation` (`role='project:personalOwner'`) rows for any
    user that doesn't already have one. **This step is mandatory** -- the
    n8n SPA calls `/rest/projects/personal` on login and returns 404 +
    cascading 401s in the browser console if the row is missing.
  - Idempotent: re-runnable without side effects.
- New ADR: `knowledge/decisions/0032-n8n-ce-operator-provisioning.md`
  - Captures the n8n CE constraint, the four options we evaluated, and why we
    chose per-user password provisioning over `N8N_USER_MANAGEMENT_DISABLED`
    or an auto-login shim.

## Live operations performed

Against the levinnovation Railway Postgres (n8n schema), in a single
transaction:

```sql
UPDATE n8n."user"
SET password   = '$2b$10$...Master2025 bcrypt...',
    "roleSlug" = 'global:owner',
    disabled   = false,
    "mfaEnabled"= false
WHERE email = 'igutt@levinnovation.com';
```

Verified end-to-end:

- Better Auth `sign-in/email` for `igutt@levinnovation.com` -> 200, cookie issued.
- n8n `/rest/login` with `Master2025` -> 200, `n8n-auth` JWT cookie issued
  (Max-Age 604800, ~7 days).
- `roleSlug` confirmed as `global:owner` in `n8n.user`.
- `/rest/projects/personal` -> 200 (after backfilling missing personal
  project for igutt; project id `HNIJY6yITWkTTRZP`).
- `/rest/workflows` -> 200 (46 workflows visible).
- `/rest/credentials` -> 200 (25 credentials visible).

## Trade-offs

- Per-user login screen still shows on first visit per browser; after that
  the n8n session cookie persists for ~7 days. This is "almost seamless"
  rather than true SSO.
- Initial password `Master2025` is committed in the migration script with an
  explicit "rotate on first login" requirement. Accept this for bootstrap;
  rotation is mandatory.
- Per-user audit, workflow ownership, and credential scoping inside n8n are
  preserved (no `N8N_USER_MANAGEMENT_DISABLED`).

## Follow-up

- Acquire n8n Enterprise license for native OIDC SSO via Better Auth, then
  retire migration 005.
- Add runbook: "First-time n8n login & password rotation for tenant
  operators" under `tenants/levinnovation/`.
- Consider an optional auto-login shim in the portal as a stop-gap if
  Enterprise is delayed.
