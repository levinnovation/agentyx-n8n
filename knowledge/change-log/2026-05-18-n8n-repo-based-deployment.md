# n8n Railway deployment switched from GHCR image to repo-based (v2.21.2)

**Date:** 2026-05-18
**Author:** OpenCode Agent
**Tenant:** levinnovation (client-levinnovation-agentyx)
**Services:** agx-demo-n8n, agx-demo-n8n-worker, agx-demo-n8n-webhook

## Problem

The n8n main service (`agx-demo-n8n`) failed to deploy because Railway could not connect to the GHCR registry for the private image `ghcr.io/levinnovation/agentyx-n8n:latest`.

Error: "We were unable to connect to the registry for this image."

## Decision

Switch all three n8n queue-mode roles from **image-based** deployment to **repo-based** deployment using the `levinnovation/agentyx-n8n` GitHub repo (branch `master`).

Rationale:
- Eliminates GHCR registry authentication failures.
- Ensures the local `agentyx-n8n` clone (already at version `2.21.2`) is the canonical source of truth.
- Aligns with the `forks.yaml` policy which already declared `deploy_mode: repo` for `agentyx-n8n`.

## Changes Made

### 1. Local `agentyx-n8n` repo fixes
- Fixed `docker-entrypoint-wrapper.sh` to reference `/patch-auth-runtime.js` (was incorrectly referencing `/n8n-sso-patch.js` which was not copied into the image).
- Added `.dockerignore` to minimize build context upload size.
- Added `railway.toml` with `builder = "DOCKERFILE"` so Railway auto-detects the correct builder.
- Fixed remotes so `origin` points to `https://github.com/levinnovation/agentyx-n8n`.

### 2. Template and tenant config updates
- `templates/assets/railway-tenant-stack/railway.toml`: Replaced `image = "ghcr.io/levinnovation/agentyx-n8n:latest"` with `root = "."` + `builder = "DOCKERFILE"` for `n8n-main`, `n8n-worker`, `n8n-webhook`.
- `tenants/levinnovation/assets/deploy/railway/railway.toml`: Same.
- `tenants/euromobilia/assets/deploy/railway/railway.toml`: Same for the single `n8n` service.
- `templates/assets/railway-tenant-stack/template-config.json`: Switched n8n service sources from `image` to `repo: levinnovation/agentyx-n8n, branch: master`.
- `templates/assets/railway-tenant-stack/forks.yaml`: Corrected `agentyx-n8n` branch from `agentyx/main` to `master`.

### 3. Knowledge docs updated
- `knowledge/operations/n8n-queue-mode-runbook.md`: Updated canonical policy from image-based (`ghcr.io/levinnovation/agentyx-n8n:latest`) to repo-based (`levinnovation/agentyx-n8n` master branch, builder `DOCKERFILE`).

### 4. Deployment
- Deployed all three n8n services via `railway up` from the local `agentyx-n8n` directory:
  - `agx-demo-n8n` (main)
  - `agx-demo-n8n-worker`
  - `agx-demo-n8n-webhook`

Build logs confirm the Dockerfile correctly layers on top of `n8nio/n8n:2.21.2`, applies the SSO patch, and installs `n8n-nodes-mcp`.

## Verification

1. Monitor Railway deployment status for all three services.
2. Once green, verify n8n UI is reachable via `https://webhooks.n8n.agentyx.one`.
3. Run a smoke workflow to confirm execution mode is `queue` and workers are processing.

## Next Steps

- In the Railway dashboard, permanently change the source of the three n8n services from "Image" to "GitHub Repo" (`levinnovation/agentyx-n8n`, branch `master`) so future template deployments auto-deploy from the repo.
- Push the local `agentyx-n8n` wrapper script fix to `origin/master` so the remote repo stays in sync.
