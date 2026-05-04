# How to Replicate Reference Project to Scratch

**Goal:** Copy all services and their configuration from the read-only reference project (`7d70063b-f1b4-415f-b57a-627d24ba0225`) to the scratch project (`2321232d-b384-45b3-8f0c-e608ddb688d1`).

## Prerequisites

- Railway CLI installed (`npm install -g @railway/cli` or via Homebrew)
- Logged in to Railway (`railway login`) with an account that has access to **both** projects
- This repo cloned locally

## Method 1: Automated script (recommended)

```bash
cd /path/to/agentyx-vertical-assets
chmod +x scripts/railway/replicate-reference-to-scratch.sh
bash scripts/railway/replicate-reference-to-scratch.sh
```

The script will:
1. List all services from the reference project
2. Create matching services in the scratch project
3. Copy images, start commands, and variables
4. Print a summary

## Method 2: Manual replication

### Step 1 — Link to reference and list services

```bash
railway link --project 7d70063b-f1b4-415f-b57a-627d24ba0225
railway service list
```

### Step 2 — For each service, note its config

```bash
# Get service variables
railway variables --service <svc-name> --json

# Get service details (image, start command, etc.)
railway service info --service <svc-name> --json
```

### Step 3 — Link to scratch and recreate

```bash
railway link --project 2321232d-b384-45b3-8f0c-e608ddb688d1

# Create service
railway service create <svc-name>

# Set image (if image-based)
railway up --service <svc-name> --image <image-ref> --detach

# Or set source (if repo-based)
railway service update --service <svc-name> --root-directory <dir>

# Copy variables one by one
railway variables --service <svc-name> --set KEY=VALUE
```

### Step 4 — Deploy all services

```bash
for svc in $(railway service list --json | jq -r '.[].name'); do
    railway up --service "$svc" --detach
done
```

## Method 3: From repo railway.toml (if reference is inaccessible)

If you cannot access the reference project directly, use the canonical definition in this repo:

```bash
cd tenants/euromobilia/assets/deploy/railway
railway link --project 2321232d-b384-45b3-8f0c-e608ddb688d1
bash ../../../scripts/railway/bootstrap-tenant.sh --tenant euromobilia
```

This uses `railway.toml` as the source of truth and creates all defined services.

## Post-replication checklist

- [ ] All services appear in the scratch project dashboard
- [ ] Postgres plugin is created (or existing one is linked)
- [ ] Variables are set for each service
- [ ] Services are deployed (`railway up`)
- [ ] Smoke tests pass (`scripts/railway/smoke-test.sh`)
- [ ] Public domains are set for web-facing services

## Troubleshooting

- **"Unauthorized"** — You need access to both projects. Ask the workspace owner to invite you.
- **Service creation fails** — The service may already exist. Delete it first or use `railway service update`.
- **Variables not copying** — Some variables may be secrets that don't show in `railway variables --json`. You'll need to set those manually from your password manager.
