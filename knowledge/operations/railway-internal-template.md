# Railway Internal Template — Agentyx Tenant Stack

**Status:** Draft (pending Railway template creation from `client-demo-agentyx`)
**Template source project:** [`client-demo-agentyx`](https://railway.com/project/7d70063b-f1b4-415f-b57a-627d24ba0225/)
**Workspace:** `levinnovation`
**Visibility:** Private (internal to LEV Innovation)

---

## Overview

This document describes how the `client-demo-agentyx` Railway project is saved as an **internal (unpublished) template** for instant per-tenant deployments.

Benefits of using a Railway template:

- **One-click provisioning** of the full Agentyx stack for a new tenant
- **Pre-populated environment variables** — no manual entry of 50+ vars per service
- **Auto-generated secrets** using Railway template functions (`${{secret(64)}}`)
- **Consistent service configuration** across all tenant projects
- **Faster onboarding** — new tenant deploy time drops from ~2 hours to ~15 minutes

---

## Services in the template

| Service | Source | Notes |
|---------|--------|-------|
| `Postgres` | `ghcr.io/railwayapp-templates/postgres-ssl:18` | Shared DB (multi-schema) |
| `MongoDB` | `mongo:8.0` | LibreChat document store |
| `meilisearch` | `getmeili/meilisearch:v1.9` | LibreChat search |
| `better-auth` | `levinnovation/agentyx-vertical-assets` | Root: `services/better-auth` |
| `auth-proxy` | `levinnovation/agentyx-vertical-assets` | Root: `services/auth-proxy` |
| `n8n` | `levinnovation/agentyx-n8n` | Branch: `master` |
| `librechat` | `levinnovation/agentyx-librechat` | Branch: `agentyx/main` |
| `portal` | `levinnovation/agentyx-client-portal` | Branch: `main` |
| `paperclip` | `levinnovation/agentyx-paperclip` | Branch: `agentyx/main` |
| `flowise` | `levinnovation/agentyx-flowise` | Branch: `agentyx/main` |

**Excluded from template:**
- `agx-demo-auth` — legacy auth service, superseded by `better-auth`

---

## How to create the template (one-time)

> **Prerequisites:** You must be a member of the `levinnovation` Railway workspace (e.g. `vflores@levinnovation.com` or Moshe's admin account).

### Step 1 — Open the source project

1. Go to the project dashboard:  
   <https://railway.com/project/7d70063b-f1b4-415f-b57a-627d24ba0225>

### Step 2 — Generate template

1. Click **Settings** (gear icon in the top-right of the project canvas)
2. Scroll down to **Generate Template from Project**
3. Click **Create Template**
4. You are taken to the **Template Composer**

### Step 3 — Configure each service in the composer

For every service, open the **Variables** tab and apply the values from [`template-config.json`](../../../templates/assets/railway-tenant-stack/template-config.json).

**Variable types:**

| Type | How to set | Example |
|------|-----------|---------|
| `preset` | Copy the literal value | `PORT=3000` |
| `secret` | Use Railway template function | `${{secret(64)}}` |
| `reference` | Reference another service | `${{Postgres.DATABASE_URL}}` |
| `tenant` | Leave empty or placeholder | Will be filled by post-deploy script |

**Critical secrets to set with `${{secret()}}`:**

- `BETTER_AUTH_SECRET` (better-auth) → `${{secret(64)}}`
- `OIDC_JWKS_PRIVATE_KEY` (better-auth) → `${{secret(64)}}`
- `TRUSTED_PROXY_SECRET` (auth-proxy) → `${{secret(64)}}`
- `N8N_ENCRYPTION_KEY` (n8n) → `${{secret(64)}}`
- `N8N_BASIC_AUTH_PASSWORD` (n8n) → `${{secret(32)}}`
- `CREDS_KEY`, `CREDS_IV`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (librechat) → `${{secret(64)}}`, `${{secret(32)}}`, etc.
- `MEILI_MASTER_KEY` (meilisearch, librechat, paperclip) → `${{secret(64)}}`
- `NEXTAUTH_SECRET` (portal, flowise) → `${{secret(64)}}`
- `PAPERCLIP_SECRETS_MASTER_KEY` (paperclip) → `${{secret(64)}}`
- `FLOWISE_SECRETKEY_OVERWRITE` (flowise) → `${{secret(64)}}`

**Cross-service references to set:**

```
# better-auth
BETTER_AUTH_DATABASE_URL = ${{Postgres.DATABASE_URL}}?schema=better_auth

# auth-proxy
BETTER_AUTH_INTERNAL_URL = better-auth.railway.internal:3000
N8N_INTERNAL_URL         = n8n.railway.internal:5678
FLOWISE_INTERNAL_URL     = flowise.railway.internal:3000
PAPERCLIP_INTERNAL_URL   = paperclip.railway.internal:3100
LIBRECHAT_INTERNAL_URL   = librechat.railway.internal:3080

# n8n
DB_POSTGRESDB_HOST     = ${{Postgres.PGHOST}}
DB_POSTGRESDB_PORT     = ${{Postgres.PGPORT}}
DB_POSTGRESDB_USER     = ${{Postgres.PGUSER}}
DB_POSTGRESDB_PASSWORD = ${{Postgres.PGPASSWORD}}
WEBHOOK_URL            = ${{RAILWAY_PUBLIC_DOMAIN}}

# librechat
MONGO_URI = ${{MongoDB.MONGO_URL}}
MEILI_HOST = http://meilisearch.railway.internal:7700

# portal
DATABASE_URL = ${{Postgres.DATABASE_URL}}?schema=portal

# paperclip
DATABASE_URL = ${{Postgres.DATABASE_URL}}?schema=paperclip
MEILI_URL    = http://meilisearch.railway.internal:7700

# flowise
DATABASE_HOST     = ${{Postgres.PGHOST}}
DATABASE_PORT     = ${{Postgres.PGPORT}}
DATABASE_USER     = ${{Postgres.PGUSER}}
DATABASE_PASSWORD = ${{Postgres.PGPASSWORD}}
DATABASE_URL      = ${{Postgres.DATABASE_URL}}?schema=flowise
```

**Sources to verify:**

| Service | Repo | Branch | Root Dir | Dockerfile |
|---------|------|--------|----------|------------|
| better-auth | `levinnovation/agentyx-vertical-assets` | `main` | `services/better-auth` | `services/better-auth/Dockerfile` |
| auth-proxy | `levinnovation/agentyx-vertical-assets` | `main` | `services/auth-proxy` | `services/auth-proxy/Dockerfile` |
| n8n | `levinnovation/agentyx-n8n` | `master` | `.` | `Dockerfile` |
| librechat | `levinnovation/agentyx-librechat` | `agentyx/main` | `.` | `/Dockerfile` |
| portal | `levinnovation/agentyx-client-portal` | `main` | `.` | `/Dockerfile` |
| paperclip | `levinnovation/agentyx-paperclip` | `agentyx/main` | `.` | `/Dockerfile` |
| flowise | `levinnovation/agentyx-flowise` | `agentyx/main` | `.` | `/Dockerfile` |

### Step 4 — Keep it private

1. In the Template Composer, do **NOT** click **Publish**
2. Click **Create Template** (or **Save**)
3. The template now lives in the `levinnovation` workspace's **Personal** templates tab
4. Only workspace members can see and deploy it

**To verify privacy:**
- Go to <https://railway.com/workspace/templates>
- The template should appear under **Personal**, not **Published**
- It should NOT appear on <https://railway.com/templates>

### Step 5 — Record the template code

After creation, Railway assigns a template code (short string like `abc123`).

1. Open the template details page
2. Copy the **Template Code** or the deploy URL
3. Record it in the team vault (1Password / Bitwarden) as `RAILWAY_AGENTYX_TEMPLATE_CODE`

---

## How to deploy a new tenant from the template

### Option A — Railway UI (recommended for first time)

1. Go to the template in your workspace: <https://railway.com/workspace/templates>
2. Click the template → **Deploy**
3. Railway creates a new project and provisions all services
4. Wait for services to deploy (Postgres and MongoDB first)
5. Note the new **Project ID**

### Option B — CLI + post-deploy script (recommended for automation)

```bash
# 1. Login
export RAILWAY_TOKEN=<token>
railway login --browserless

# 2. Create and link a new project
railway init --name "agx-tenant-name-prod"

# 3. Deploy the template (if you know the template code)
railway deploy -t <TEMPLATE_CODE>

# 4. Run post-deploy configuration
bash scripts/railway/configure-tenant-post-deploy.sh --tenant tenant-name
```

### Option C — GitHub Actions (fully automated)

Use the workflow `.github/workflows/bootstrap-tenant-from-template.yml` (see below).

---

## Post-deploy configuration

After the template deploys, run the configuration script to:

1. Set tenant-specific domains (`tenant.auth.agentyx.one`, etc.)
2. Synchronize shared secrets (`TRUSTED_PROXY_SECRET`, etc.)
3. Add custom domains to public-facing services
4. Generate per-service secrets

```bash
export RAILWAY_TOKEN=<token>
bash scripts/railway/configure-tenant-post-deploy.sh --tenant euromobilia
```

**What this script does NOT set (manual step):**

- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` (better-auth)
- `OPENAI_API_KEY` (if needed for RAG)
- Any tenant-specific API keys

---

## Secrets management

### Template-level secrets

Secrets marked with `${{secret()}}` in the template are **regenerated fresh** on every template deployment. This means:

- Each tenant gets unique `BETTER_AUTH_SECRET`, `NEXTAUTH_SECRET`, etc.
- No secret is leaked from the source project

### Shared secrets

Some secrets must be identical across services:

| Secret | Services |
|--------|----------|
| `TRUSTED_PROXY_SECRET` | auth-proxy, n8n, librechat, paperclip, flowise |

The `configure-tenant-post-deploy.sh` script synchronizes these automatically.

### External secrets

These must be added manually after deployment:

| Secret | Where to get it |
|--------|----------------|
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console |
| `OPENAI_API_KEY` | OpenAI dashboard |

---

## Troubleshooting

### Template not visible to team members

- Ensure the template was created while logged into the `levinnovation` workspace
- Check that team members are added to the workspace (not just individual projects)
- Unpublished templates are scoped to the workspace; they do not require publishing

### Services fail to deploy from template

1. Check that private repo access is granted to Railway for `levinnovation/*` repos
2. Verify branch names match exactly (`master` for n8n, `agentyx/main` for forks)
3. Check build logs for Dockerfile path errors

### Variables missing after template deploy

1. Open the new project's Variables tab
2. Compare with `template-config.json`
3. Railway sometimes skips empty variables — re-add them manually or run `configure-tenant-post-deploy.sh`

### Custom domains not working

1. Ensure DNS CNAME records point to `*.up.railway.app`
2. Wait 5–15 minutes for propagation
3. Verify in Railway dashboard that domain status shows "Valid"

---

## Related files

- `templates/assets/railway-tenant-stack/template-config.json` — Variable manifest
- `scripts/railway/configure-tenant-post-deploy.sh` — Post-deploy config
- `scripts/railway/export-template-vars.sh` — Export vars from reference project
- `knowledge/decisions/0010-per-tenant-railway-project-as-canonical-runtime.md` — Architecture decision
- `knowledge/change-log/2026/05/2026-05-06-auth-proxy-portal-cutover.md` — Auth proxy cutover
