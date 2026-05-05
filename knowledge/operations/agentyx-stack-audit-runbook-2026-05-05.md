# Agentyx Stack — Full Audit & Runbook (2026-05-05)

## TL;DR for Moshe (WhatsApp copy/paste)

```
*Agentyx Stack Audit — May 5*

🔍 FOUND:
• agx-demo-auth = OLD custom auth gateway (NOT better-auth)
• better-auth + auth-proxy = NEVER deployed (only in repo code)
• All custom domains route through old auth gateway
• n8n + paperclip returning 502 via custom domains
• LibreChat + flowise working

✅ WORKING:
• Auth gateway: demo.auth.agentyx.one (OIDC, proxy)
• Flowise: demo.flowise.agentyx.one
• LibreChat: direct Railway URL
• Portal: demo.portal.agentyx.one

🔴 BROKEN:
• n8n custom domain: 502 (works via auth proxy path)
• paperclip custom domain: 502 (403 via auth proxy)

❌ BLOCKED:
• Railway API token = READ-ONLY (can't create services)
• Can't deploy better-auth/auth-proxy via CLI/API

📋 NEEDS MANUAL RAILWAY DASHBOARD:
1. Create agx-demo-better-auth service (from services/better-auth/)
2. Create agx-demo-auth-proxy service (from services/auth-proxy/)
3. Set env vars for both services
4. Repoint domains OR keep old auth for now
5. Fix n8n/paperclip 502 errors

⏱️ Est: 2-3h
💬 Need project token with write perms OR dashboard access
```

---

## Architecture Reality Check

### What Was Planned (ADRs)
- **ADR-0012**: better-auth + auth-proxy (Caddy forward_auth)
- **ADR-0014**: Migrate all apps to better-auth canonical
- **ADR-0017**: SSO gateway with custom domains

### What's Actually Deployed
- **agx-demo-auth**: Custom Node.js auth gateway (`levinnovation/agentyx-auth-service`)
  - OIDC provider
  - Reverse proxy (`/proxy/:service/*`)
  - Google Workspace SSO
  - NOT better-auth
- **better-auth**: Code exists in repo, NEVER deployed
- **auth-proxy**: Code exists in repo, NEVER deployed

### Service Health Matrix

| Service | Custom Domain | Direct URL | Auth Proxy | Status |
|---------|--------------|------------|------------|--------|
| **Auth** | demo.auth.agentyx.one | N/A | N/A | ✅ Working |
| **n8n** | demo.n8n.agentyx.one | 404 (pubnet off) | /proxy/n8n/ = 200 | ⚠️ Domain broken |
| **Flowise** | demo.flowise.agentyx.one | 404 (pubnet off) | /proxy/flowise/ = 200 | ⚠️ Domain broken |
| **Paperclip** | demo.paperclip.agentyx.one | 404 (pubnet off) | /proxy/paperclip/ = 403 | 🔴 Broken |
| **LibreChat** | (none) | 200 | N/A | ✅ Working |
| **Portal** | demo.portal.agentyx.one | N/A | N/A | ✅ Working |
| **Langfuse** | (none) | N/A | N/A | ✅ Deployed |
| **RAG API** | (none) | N/A | N/A | ✅ Deployed |

### DNS Configuration
All custom domains resolve to different Railway edge IPs but seem to route through the auth service:
- `demo.auth.agentyx.one` → 66.33.22.49
- `demo.n8n.agentyx.one` → 66.33.22.129
- `demo.flowise.agentyx.one` → 66.33.22.98
- `demo.paperclip.agentyx.one` → (same pattern)
- `demo.portal.agentyx.one` → (same pattern)

### Auth Flow Analysis
1. **Old auth gateway** handles all SSO/OIDC
2. **LibreChat** configured with `OPENID_ISSUER` → should point to auth service
3. **Langfuse** configured with `AUTH_CUSTOM_ISSUER` → should point to auth service
4. **n8n/Flowise/Paperclip** proxied through auth gateway
5. **Agent** configured with `BETTER_AUTH_JWKS_URL` → points to non-existent better-auth

### Paperclip 403 Issue
When accessing via auth proxy (`/proxy/paperclip/`), Paperclip returns 403. This is because:
- Paperclip has `PAPERCLIP_AUTH_TRUSTED_PROXY=true`
- It expects `X-Auth-User-*` headers from the proxy
- The old auth gateway may not send the headers Paperclip expects
- OR the `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET` is misconfigured

### n8n/Flowise 502 Issue
Custom domains return 502 from Railway edge. This is likely because:
- Public Networking is disabled on these services (correct for security)
- But custom domains in Railway need Public Networking to be enabled OR
- The domains are misconfigured in Railway dashboard

---

## Immediate Fixes (No New Services Needed)

### Fix 1: Paperclip Trusted Proxy
The old auth gateway needs to send the correct headers to Paperclip. Check:
1. Does the auth gateway send `X-Auth-User-Id` and `X-Auth-User-Email`?
2. Is `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET` set correctly in both auth gateway and Paperclip?

### Fix 2: n8n/Flowise Custom Domains
Options:
A. Re-enable Public Networking on n8n/flowise (security risk)
B. Configure custom domains in Railway to route correctly
C. Route all traffic through auth proxy path (e.g., `demo.auth.agentyx.one/proxy/n8n/`)

**Recommendation**: Keep Public Networking disabled. Route everything through the auth gateway. Update DNS/custom domain config in Railway to point all domains to the auth service.

---

## Migration Path to better-auth + auth-proxy

### Phase 1: Deploy New Services (Manual Railway Dashboard)

#### Step 1: Create agx-demo-better-auth
1. Railway dashboard → New Service → Empty Service
2. Name: `agx-demo-better-auth`
3. Connect to GitHub repo: `levinnovation/agentyx-vertical-assets`
4. Set root directory: `tenants/euromobilia/assets/deploy/railway/services/better-auth`
5. Deploy

#### Step 2: Set better-auth env vars
```
PORT=3000
BETTER_AUTH_URL=https://demo.auth.agentyx.one
BETTER_AUTH_DATABASE_URL=${Postgres.DATABASE_URL}?schema=better_auth
BETTER_AUTH_SECRET=<generate-random-32-char-string>
BETTER_AUTH_TRUSTED_ORIGINS=https://demo.auth.agentyx.one,https://demo.chat.agentyx.one,https://demo.portal.agentyx.one
GOOGLE_OAUTH_CLIENT_ID=<from-existing-project-var>
GOOGLE_OAUTH_CLIENT_SECRET=<from-existing-project-var>
GOOGLE_HD=agentyx.one
OIDC_ISSUER=https://demo.auth.agentyx.one
OIDC_JWKS_PRIVATE_KEY=<generate-or-reuse-from-old-auth>
```

#### Step 3: Create agx-demo-auth-proxy
1. Railway dashboard → New Service → Empty Service
2. Name: `agx-demo-auth-proxy`
3. Connect to GitHub repo: `levinnovation/agentyx-vertical-assets`
4. Set root directory: `tenants/euromobilia/assets/deploy/railway/services/auth-proxy`
5. Deploy

#### Step 4: Set auth-proxy env vars
```
N8N_PUBLIC_HOST=demo.n8n.agentyx.one
FLOWISE_PUBLIC_HOST=demo.flowise.agentyx.one
PAPERCLIP_PUBLIC_HOST=demo.paperclip.agentyx.one
BETTER_AUTH_INTERNAL_URL=http://agx-demo-better-auth.railway.internal:3000
N8N_INTERNAL_URL=http://agx-demo-n8n.railway.internal:5678
FLOWISE_INTERNAL_URL=http://agx-demo-flowise.railway.internal:3000
PAPERCLIP_INTERNAL_URL=http://agx-demo-paperclip.railway.internal:3000
```

### Phase 2: Domain Migration
1. In Railway dashboard, detach custom domains from old auth service
2. Attach `demo.auth.agentyx.one` to `agx-demo-better-auth`
3. Attach `demo.n8n.agentyx.one` to `agx-demo-auth-proxy`
4. Attach `demo.flowise.agentyx.one` to `agx-demo-auth-proxy`
5. Attach `demo.paperclip.agentyx.one` to `agx-demo-auth-proxy`

### Phase 3: App Reconfiguration
1. **LibreChat**: Update `OPENID_ISSUER` to point to better-auth
2. **Langfuse**: Update `AUTH_CUSTOM_ISSUER` to point to better-auth
3. **Agent**: Update `BETTER_AUTH_JWKS_URL` to point to better-auth
4. **Portal**: Update `BETTER_AUTH_URL` to point to better-auth

### Phase 4: Remove Old Auth
1. Delete `agx-demo-auth` service from Railway
2. Archive `levinnovation/agentyx-auth-service` repo (if it exists)

---

## Code Readiness Checklist

- [x] `services/better-auth/` — code complete, Dockerfile ready
- [x] `services/auth-proxy/` — code complete, Dockerfile ready
- [x] `railway.toml` — service blocks defined
- [x] Paperclip trusted proxy code — merged
- [x] LibreChat OIDC config — configured
- [x] Agent JWT verification — configured

---

## Testing Checklist (Post-Migration)

- [ ] Google SSO login on auth domain
- [ ] Cookie valid on all `*.agentyx.one` subdomains
- [ ] n8n accessible after login
- [ ] Flowise accessible after login
- [ ] Paperclip accessible after login + shadow user created
- [ ] LibreChat OIDC login works
- [ ] LibreChat chat with OpenRouter works
- [ ] Langfuse OIDC login works
- [ ] Agent API accepts JWT from better-auth
- [ ] Direct Railway URLs return 403/404 (no public access)

---

## Files Modified Today

1. `tenants/euromobilia/assets/deploy/railway/railway.toml` — cleaned up LibreChat vars
2. `templates/assets/railway-tenant-stack/railway.toml` — synced template
3. `knowledge/decisions/0018-n8n-mcp-for-ai-assisted-workflow-authoring.md` — new ADR
4. `knowledge/INDEX.md` — regenerated (105 files)
5. `.railway/config.json` — updated token
6. External: `levinnovation/agentyx-librechat` — librechat.yaml + scrubResponse.js
7. External: `levinnovation/agentyx-n8n` — thin-layer Dockerfile + CI
8. External: `levinnovation/agentyx-paperclip` — trusted_proxy TypeScript fix

---

*Generated by AI agent on 2026-05-05*
