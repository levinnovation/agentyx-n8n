# Change Record: SSO Gateway + Custom Domains + Paperclip Trusted Proxy + RAG

**Date:** 2026-05-04
**Tenant:** euromobilia (demo stack)
**Project:** `client-demo-agentyx` (`7d70063b-f1b4-415f-b57a-627d24ba0225`)
**ADR:** ADR-0017

## Summary

Consolidate the demo stack under a single SSO gateway with custom per-backend domains, fix critical misconfigurations discovered during audit, add RAG API for LibreChat, and lay the groundwork for per-client Railway project onboarding.

## Changes

### Phase 0 — Immediate Fixes

1. **n8n database URL**
   - Remove incorrect `DATABASE_URL` from `agx-demo-n8n` service variables.
   - Confirm `DB_POSTGRESDB_DATABASE=n8n` is authoritative.

2. **Auth gateway backend URLs**
   - Update `BACKEND_FLOWISE`, `BACKEND_N8N`, `BACKEND_PAPERCLIP`, `BACKEND_LIBRECHAT` to use `*.railway.internal` endpoints.

3. **Cookie domain**
   - Update `COOKIE_DOMAIN` from `.agentyx.app` to `.agentyx.one`.
   - Update `BETTER_AUTH_TRUSTED_ORIGINS` to include all `*.agentyx.one` subdomains.

### Phase 1 — SSO Gateway + Custom Domains

4. **Auth service env vars**
   - Add `CLIENT_SLUG=demo`.
   - Add `PORTAL_URL=https://demo.portal.agentyx.one`.
   - Add `BETTER_AUTH_URL=https://demo.auth.agentyx.one`.
   - Update `BETTER_AUTH_TRUSTED_ORIGINS` comma-separated list.

5. **Custom domains (Railway)**
   - `demo.flowise.agentyx.one` → `agx-demo-flowise`
   - `demo.n8n.agentyx.one` → `agx-demo-n8n`
   - `demo.paperclip.agentyx.one` → `agx-demo-paperclip`
   - `demo.chat.agentyx.one` → `agx-demo-librechat`

6. **Disable Public Networking**
   - Turn off Public Networking on Flowise, n8n, Paperclip, LibreChat after domains verify.

### Phase 2 — Paperclip Trusted Proxy

7. **Paperclip env vars**
   - Add `PAPERCLIP_AUTH_TRUSTED_PROXY=true`.
   - Add `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET` (shared secret for header signing).
   - Update `BETTER_AUTH_TRUSTED_ORIGINS`.

8. **Paperclip code changes**
   - Modify `actorMiddleware` to read `X-Auth-User-*` headers.
   - Implement `ensureLocalUser()` for shadow-user upsert.

### Phase 3 — RAG API

9. **RAG API service**
   - Create `agx-demo-rag-api` in Railway.
   - Deploy image `registry.librechat.ai/danny-avila/librechat-rag-api-dev-lite:latest`.
   - Configure `librechat_rag` Postgres DB connection.
   - Configure LibreChat `RAG_API_URL`.

### Phase 4 — Multi-Client Onboarding

10. **Bootstrap script**
    - Create `scripts/railway/bootstrap-client-project.sh`.
    - Automates project creation, DB bootstrap, service deploy, domain config, and env var sync.

## Rollback

- If custom domains fail, re-enable Public Networking on affected backends.
- If SSO cookie breaks, revert `COOKIE_DOMAIN` and `BETTER_AUTH_TRUSTED_ORIGINS`.
- Keep a snapshot of current env vars before any change.

## Verification

- [ ] n8n health check passes with corrected DB.
- [ ] Auth gateway health check passes with private backend URLs.
- [ ] Login on portal creates cookie valid on all `*.agentyx.one` subdomains.
- [ ] Each custom domain resolves and serves its backend.
- [ ] Direct `*.up.railway.app` URLs for backends return 403 or timeout after Public Networking is disabled.
- [ ] Paperclip creates shadow user on first gateway-proxied request.
- [ ] LibreChat RAG endpoint responds to health check.
