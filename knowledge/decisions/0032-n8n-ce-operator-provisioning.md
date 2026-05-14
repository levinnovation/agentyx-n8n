# ADR-0032: n8n CE operator provisioning without OIDC SSO

## Status
Accepted

## Date
2026-05-13

## Context

Tenant operators authenticate against Better Auth via the Caddy `auth-proxy`
and then expect to land on linked services (Workflows / n8n, LibreChat,
Paperclip, Flowise) without seeing a second login screen.

This works for LibreChat, Paperclip, and Flowise because either:

- the service is a custom app that trusts the `X-Auth-Email` header forwarded
  by Caddy `forward_auth`, or
- access control is fully delegated to the auth-proxy.

It does **not** work for n8n. Investigation of the live instance returned:

```json
"sso": {
  "oidc": { "loginEnabled": false, "loginUrl": ".../rest/sso/oidc/login" }
},
"enterprise": { "saml": false, "ldap": false, "oidc": false }
```

`enterprise.oidc: false` confirms that n8n Community Edition does **not** honor
the `N8N_SSO_OIDC_*` env vars at runtime: OIDC SSO is gated by the n8n
Enterprise license. n8n CE has no native trusted-header login either, so
Caddy's `X-Auth-Email` cannot be exchanged for an n8n session.

For the levinnovation tenant we have 7 operators already provisioned in
`n8n.user` (vflores, igutt, fleon, evargas, moshe, raquel, moshe.rosenstock16).
Workflows and credentials are owned per-user, so per-user audit inside n8n is
valuable and we do not want to collapse identity.

We considered four paths:

1. n8n Enterprise license: real OIDC SSO, clean, but cost and licensing setup.
2. Auto-login shim: portal proxies `/rest/login` with stored per-user n8n
   passwords. Requires storing each user's n8n password encrypted in portal
   storage. Operational overhead and added attack surface.
3. `N8N_USER_MANAGEMENT_DISABLED=true`: removes the n8n login screen entirely
   and collapses identity to the implicit owner. Sacrifices per-user audit and
   per-user workflow ownership inside n8n.
4. Per-user n8n password provisioning with a known initial password; rely on
   the n8n session cookie to persist ~7 days after the first manual login.

## Decision

Adopt path 4 for now, with path 1 (Enterprise OIDC) as the documented
follow-up when budget allows.

Concretely:

1. Each tenant operator is provisioned in `n8n.user` with `roleSlug =
   'global:owner'` or `'global:member'` as appropriate, and a bcrypt password
   hash that the operator MUST rotate via the n8n profile screen on first
   login.
2. **Every operator also needs a row in `n8n.project` (`type='personal'`)
   and `n8n.project_relation` (`role='project:personalOwner'`).** n8n's UI
   onboarding flow creates these rows automatically when a user is invited;
   when we provision via raw SQL, we must create them explicitly. Without
   them, `/rest/projects/personal` returns 404 after login and the n8n SPA
   bails out (the user sees what looks like a failed login).
3. The provisioning is codified in the tenant repository under
   `tenants/<tenant>/assets/deploy/railway/migrations/` so it is reproducible
   across redeploys and disaster-recovery rebuilds.
3. The portal sidebar "Workflows" link continues to point at the n8n root
   URL. Caddy `forward_auth` gates access (so only Better-Auth-authenticated
   tenant members reach n8n at all), then n8n's own session takes over after
   one in-browser `/rest/login`.
4. `N8N_USER_MANAGEMENT_DISABLED` is left **unset / false** so per-user
   ownership and audit inside n8n are preserved.

## Initial provisioning for levinnovation

See `tenants/levinnovation/assets/deploy/railway/migrations/005_n8n_operator_provisioning.sql`.

- `igutt@levinnovation.com` -> `global:owner`, initial password `Master2025`
  (rotate on first login).

Other existing operators retain their current roles and passwords.

## Consequences

### Positive

- Preserves per-user ownership, audit, and credential scoping inside n8n.
- No new infrastructure or secrets to manage.
- Reproducible: the SQL migration captures the provisioning step.
- Caddy `forward_auth` still enforces tenant membership at the edge.

### Negative

- Not fully seamless: each operator must perform one manual n8n login per
  browser. After that the n8n session cookie persists ~7 days.
- Initial passwords are written into the migration script. They are
  documented as rotate-on-first-login, but they exist in repo history. We
  accept this for bootstrap accounts; rotation is mandatory.
- Until we either license n8n Enterprise or implement an auto-login shim,
  the SSO experience differs from LibreChat / Paperclip / Flowise.

## Rejected alternatives

- `N8N_USER_MANAGEMENT_DISABLED=true`: collapses per-user identity, loses
  audit and per-user workflow ownership.
- Storing per-user n8n passwords in the portal and auto-POSTing
  `/rest/login`: too much attack surface for the current value.

## Follow-up

- Acquire n8n Enterprise license and switch to true OIDC SSO via Better Auth.
  At that point this provisioning script can be deprecated in favor of SCIM
  / JIT provisioning.
- Add a runbook section to `tenants/levinnovation/` explaining password
  rotation on first login.
- Optional: build a portal "Open Workflows" CTA that POSTs `/rest/login`
  with a one-time, short-lived password kept in an encrypted portal table,
  enabling true one-click handoff without Enterprise.
