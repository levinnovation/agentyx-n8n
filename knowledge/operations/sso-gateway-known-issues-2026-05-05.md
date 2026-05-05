# SSO Gateway Stack — Known Issues & Next Steps

**Date:** 2026-05-05
**Project:** `client-demo-agentyx`
**ADR:** ADR-0017

## ✅ Completed Today

1. **Bootstrap script fixes** (`scripts/railway/bootstrap-client-project.sh`)
   - Fixed `WEBHOOK_URL` to use explicit custom domain instead of unresolved `RAILWAY_PUBLIC_DOMAIN`
   - Fixed `PAPERCLIP_DATABASE_URL` and `LANGFUSE_DATABASE_URL` to be conditional on `DATABASE_URL` env var
   - Fixed `RAG_OPENAI_API_KEY` to use actual value instead of literal string
   - Added auto-generation for `N8N_ENCRYPTION_KEY` and `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET`
   - Added `PAPERCLIP_ALLOWED_HOSTNAMES` and `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET` to Paperclip env vars
   - Added `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET` to auth service env vars

2. **Railway config updates**
   - Added `PAPERCLIP_ALLOWED_HOSTNAMES` to both template and tenant `railway.toml`

3. **Live Paperclip fix**
   - Set `PAPERCLIP_ALLOWED_HOSTNAMES=agx-demo-paperclip.railway.internal,demo.paperclip.agentyx.one` on `agx-demo-paperclip` via Railway API

4. **Documentation updates**
   - Updated ADR-0017 with 502 known issue
   - Updated change-log with completed items

## 🔴 Outstanding: Direct Domain 502s

### Symptoms
| Domain | Status | Public URL | Path Proxy |
|--------|--------|------------|------------|
| `demo.flowise.agentyx.one` | ✅ 200 | 404 (pubnet off) | ✅ 200 |
| `demo.n8n.agentyx.one` | ❌ 502 | 404 (pubnet off) | ✅ 200 |
| `demo.paperclip.agentyx.one` | ❌ 502 | 404 (pubnet off) | ✅ 200 |
| `demo.chat.agentyx.one` | ❌ 502 | 404 (pubnet off) | ✅ 200 |

All services are deployed successfully. Path proxies through `demo.auth.agentyx.one/proxy/*` work perfectly. Only Flowise custom domain works directly.

### Investigation Tried
1. ✅ Set `PORT` env var on n8n (5678), paperclip (3100), librechat (3080)
2. ✅ Redeployed all three services
3. ✅ Set `healthcheckPath` on all three services
4. ✅ Redeployed again

Result: 502s persist.

### Likely Causes
- **Railway edge routing bug** with non-3000 ports when Public Networking is disabled
- Flowise works because it listens on 3000 (Railway default) or has a different `railway.toml` / Dockerfile configuration
- All services return `x-railway-fallback: true`, meaning Railway edge cannot establish a healthy connection to the origin

### Recommended Next Steps
1. **Railway dashboard** — Check custom domain target port configuration manually
2. **Railway support** — Open ticket for 502 on custom domains with disabled Public Networking
3. **Workaround** — Route all traffic through auth gateway path proxy (already working)

## ⏳ Remaining Tasks

### 1. OPENAI_API_KEY for RAG API
- Set `OPENAI_API_KEY` env var on `agx-demo-rag-api` service
- Required for LibreChat vector embeddings to work

### 2. End-to-End Login Test
- Test sign-up on `demo.auth.agentyx.one`
- Verify cookie is valid on `*.agentyx.one`
- Test Paperclip shadow user creation via path proxy
- Test LibreChat OIDC login

### 3. Railway Template Save
- Save `client-demo-agentyx` as a Railway template for instant per-client onboarding
- Requires Railway Pro plan

### 4. Public Networking Decision
- Once direct domains work (or if we accept path proxy as canonical), disable Public Networking on all backend services
- Currently path proxy works but direct domains are unreliable

## Quick Commands

### Check domain health
```bash
curl -sI https://demo.n8n.agentyx.one/
curl -sI https://demo.flowise.agentyx.one/
curl -sI https://demo.paperclip.agentyx.one/
curl -sI https://demo.chat.agentyx.one/
```

### Check path proxy health
```bash
curl -sI https://demo.auth.agentyx.one/proxy/n8n/
curl -sI https://demo.auth.agentyx.one/proxy/flowise/
curl -sI https://demo.auth.agentyx.one/proxy/paperclip/
curl -sI https://demo.auth.agentyx.one/proxy/librechat/
```

### Set OPENAI_API_KEY
```bash
curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST https://backboard.railway.app/graphql/v2 \
  -d '{"query":"mutation { variableUpsert(input: {environmentId: \"25f67019-670d-4b50-978a-b0aa7ec4623f\", name: \"RAG_OPENAI_API_KEY\", projectId: \"7d70063b-f1b4-415f-b57a-627d24ba0225\", serviceId: \"9a626b80-0054-4c2f-b1b0-9377e94ed5ba\", value: \"<your-key>\"}) }"}'
```
