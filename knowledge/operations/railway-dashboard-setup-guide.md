# Railway Dashboard Setup Guide: better-auth + auth-proxy

**Date:** 2026-05-05
**Project:** client-demo-agentyx
**Repos:**
- https://github.com/levinnovation/agentyx-better-auth
- https://github.com/levinnovation/agentyx-auth-proxy

---

## Phase 1: Create better-auth Service

### Step 1.1 — Create Service
1. Go to Railway dashboard: https://railway.app/project/7d70063b-f1b4-415f-b57a-627d24ba0225
2. Click **"New"** → **"Service"** → **"GitHub Repo"**
3. Select: `levinnovation/agentyx-better-auth`
4. Name the service: `agx-demo-better-auth`
5. Branch: `main`
6. Root Directory: `.` (repo root)
7. Click **"Deploy"**

### Step 1.2 — Set Environment Variables
Go to the service → **Variables** tab. Add these:

```
PORT=3000
BETTER_AUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
BETTER_AUTH_DATABASE_URL=${{Postgres.DATABASE_URL}}?schema=better_auth
BETTER_AUTH_SECRET=OxRBohnFCoozb1tpZxiGJ3E8sPFiwPzG0YV250WmRH2kJ7Uq
BETTER_AUTH_TRUSTED_ORIGINS=https://demo.auth.agentyx.one,https://demo.chat.agentyx.one,https://demo.portal.agentyx.one,https://demo.n8n.agentyx.one,https://demo.flowise.agentyx.one,https://demo.paperclip.agentyx.one
GOOGLE_OAUTH_CLIENT_ID=<COPY_FROM_OLD_AUTH_SERVICE>
GOOGLE_OAUTH_CLIENT_SECRET=<COPY_FROM_OLD_AUTH_SERVICE>
GOOGLE_HD=agentyx.one
OIDC_ISSUER=https://demo.auth.agentyx.one
OIDC_JWKS_PRIVATE_KEY=W6sCi0XtErsJsCw_Bzo06MUl5A818NCw84M91Ovrl_f0URdOp0MghN0fBVKnsKN2
```

**Note:** Copy `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` from the old `agx-demo-auth` service variables.

### Step 1.3 — Add Custom Domain
1. Go to service → **Settings** → **Domains**
2. Click **"+ Custom Domain"**
3. Enter: `demo.auth.agentyx.one`
4. Verify DNS (should already be pointing to Railway from old auth service)

### Step 1.4 — Verify Deployment
Wait for deploy to succeed, then test:
```bash
curl https://demo.auth.agentyx.one/health
curl https://demo.auth.agentyx.one/.well-known/openid-configuration
```

---

## Phase 2: Create auth-proxy Service

### Step 2.1 — Create Service
1. Railway dashboard → **"New"** → **"Service"** → **"GitHub Repo"**
2. Select: `levinnovation/agentyx-auth-proxy`
3. Name the service: `agx-demo-auth-proxy`
4. Branch: `main`
5. Root Directory: `.` (repo root)
6. Click **"Deploy"**

### Step 2.2 — Set Environment Variables
Go to the service → **Variables** tab. Add these:

```
N8N_PUBLIC_HOST=demo.n8n.agentyx.one
FLOWISE_PUBLIC_HOST=demo.flowise.agentyx.one
PAPERCLIP_PUBLIC_HOST=demo.paperclip.agentyx.one
BETTER_AUTH_INTERNAL_URL=http://agx-demo-better-auth.railway.internal:3000
N8N_INTERNAL_URL=http://agx-demo-n8n.railway.internal:5678
FLOWISE_INTERNAL_URL=http://agx-demo-flowise.railway.internal:3000
PAPERCLIP_INTERNAL_URL=http://agx-demo-paperclip.railway.internal:3000
```

### Step 2.3 — Add Custom Domains
1. Go to service → **Settings** → **Domains**
2. Add each domain:
   - `demo.n8n.agentyx.one`
   - `demo.flowise.agentyx.one`
   - `demo.paperclip.agentyx.one`
3. Verify DNS for each

### Step 2.4 — Verify Deployment
```bash
curl -I https://demo.n8n.agentyx.one/
curl -I https://demo.flowise.agentyx.one/
curl -I https://demo.paperclip.agentyx.one/
```

---

## Phase 3: Reconfigure Other Services

### Step 3.1 — LibreChat
Update these variables in `agx-demo-librechat`:
```
OPENID_ISSUER=https://demo.auth.agentyx.one
```

### Step 3.2 — Langfuse
Update these variables in `agx-demo-langfuse`:
```
AUTH_CUSTOM_ISSUER=https://demo.auth.agentyx.one
```

### Step 3.3 — Agent
Update these variables in `agx-demo-agent`:
```
BETTER_AUTH_JWKS_URL=https://demo.auth.agentyx.one/.well-known/jwks.json
BETTER_AUTH_ISSUER=https://demo.auth.agentyx.one
```

### Step 3.4 — Portal
Update these variables in `agx-demo-portal`:
```
BETTER_AUTH_URL=https://demo.auth.agentyx.one
```

---

## Phase 4: Remove Old Auth Service

**ONLY after better-auth + auth-proxy are fully working!**

1. Go to `agx-demo-auth` service
2. **Settings** → **Delete Service**
3. Confirm deletion

---

## Phase 5: Test End-to-End

### Test 1: Google SSO
1. Open `https://demo.auth.agentyx.one`
2. Click "Sign in with Google"
3. Complete Google auth
4. Verify session cookie is set

### Test 2: Cookie Propagation
1. Open `https://demo.n8n.agentyx.one` in new tab
2. Should be logged in (no redirect to login)
3. Repeat for flowise and paperclip

### Test 3: LibreChat OIDC
1. Open LibreChat URL
2. Click "Sign in with Agentyx"
3. Should redirect to better-auth, then back to LibreChat

### Test 4: Paperclip Shadow User
1. First time accessing Paperclip via proxy
2. Check Paperclip DB for new user row
3. User should have email from Google account

### Test 5: Logout
1. Logout from any app
2. All apps should require re-auth

---

## Troubleshooting

### better-auth won't start
- Check Postgres connection: `BETTER_AUTH_DATABASE_URL` must include `?schema=better_auth`
- Check `BETTER_AUTH_SECRET` is set (min 32 chars)
- Check `BETTER_AUTH_URL` matches the public domain

### auth-proxy returns 502
- Check `BETTER_AUTH_INTERNAL_URL` uses the Railway internal hostname
- Check `N8N_INTERNAL_URL`, etc. use `.railway.internal` hostnames
- Verify better-auth is running and healthy

### Custom domains not working
- Check DNS points to Railway (CNAME to `*.up.railway.app`)
- In Railway, verify domain status is "Valid"
- May take 5-15 min for DNS to propagate

### Paperclip 403
- Check `PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET` matches between Paperclip and auth-proxy
- Verify auth-proxy sends `X-Auth-User` and `X-Auth-Email` headers
- Check Paperclip logs for header validation errors

---

*Generated by AI agent on 2026-05-05*
