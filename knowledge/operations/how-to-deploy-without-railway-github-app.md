# How to Deploy Without Railway GitHub App

**Problem:** The `levinnovation` GitHub organization does not allow installing the Railway GitHub App, so we cannot connect fork repos directly as service sources.

**Solution:** Build Docker images from the fork repos, push them to GHCR (GitHub Container Registry), and deploy the pre-built images to Railway.

## Architecture

```
levinnovation/agentyx-auth-service (repo)
         ↓ git clone
    Docker build
         ↓ docker push
ghcr.io/levinnovation/agentyx-auth-service:latest
         ↓ GraphQL API
    Railway service (image source)
```

## Method 1: GitHub Actions (CI/CD)

### Setup

1. Ensure `GHCR_TOKEN` secret is set in this repo:
   - Go to Settings → Secrets and variables → Actions
   - Add `GHCR_TOKEN` (GitHub personal access token with `read:packages`, `write:packages`, `delete:packages`)

2. Ensure `RAILWAY_TOKEN` secret is set for deploying to Railway.

### Build all images

```bash
# Trigger manually via GitHub UI
# Actions → Build and Push All Fork Images → Run workflow
```

Or push to main:
```bash
git push origin main
```

This will:
1. Build all 5 fork images in parallel
2. Push to GHCR with `:latest` and commit SHA tags
3. Deploy the new images to Railway automatically

### Build single image

```bash
# Trigger manually via GitHub UI
# Actions → Build Auth Service Image → Run workflow
```

## Method 2: Local build (operator)

### Prerequisites

- Docker Desktop installed and running
- GitHub personal access token with `write:packages` scope
- Railway CLI logged in (`railway login`)

### Build and push all images

```bash
export GHCR_USER=your-github-username
export GHCR_TOKEN=ghp_xxxxxxxxxxxx

bash scripts/forks/build-and-push-images.sh all
```

### Build single image

```bash
bash scripts/forks/build-and-push-images.sh auth
```

Valid targets: `auth`, `portal`, `librechat`, `flowise`, `paperclip`

### Deploy to Railway

```bash
bash scripts/railway/deploy-ghcr-images.sh
```

This updates each Railway service to use the `:latest` GHCR image and triggers a deploy.

## Method 3: Manual (one-off)

### Build and push

```bash
# Clone fork
git clone https://github.com/levinnovation/agentyx-auth-service.git
cd agentyx-auth-service
git checkout agentyx/main

# Build
docker build -t ghcr.io/levinnovation/agentyx-auth-service:latest .

# Login to GHCR
echo $GHCR_TOKEN | docker login ghcr.io -u $GHCR_USER --password-stdin

# Push
docker push ghcr.io/levinnovation/agentyx-auth-service:latest
```

### Update Railway service

```bash
# Using Railway CLI
railway link --project 2321232d-b384-45b3-8f0c-e608ddb688d1
railway service link agx-demo-auth
railway up --image ghcr.io/levinnovation/agentyx-auth-service:latest --detach
```

Or use the GraphQL script:
```bash
bash scripts/railway/deploy-ghcr-images.sh
```

## Image tags

| Tag | Purpose |
|-----|---------|
| `:latest` | Always the most recent build. Used by Railway. |
| `:<commit-sha>` | Immutable tag for the specific commit. For rollbacks. |
| `:YYYYMMDD-HHMMSS` | Timestamp tag (local builds only). |

## Rolling back

If a deployment breaks, roll back to the previous image:

```bash
# List available tags
curl -s -H "Authorization: Bearer $GHCR_TOKEN" \
  https://ghcr.io/v2/levinnovation/agentyx-auth-service/tags/list | jq .

# Deploy previous tag
bash scripts/railway/deploy-ghcr-images.sh  # update script to use specific tag
```

Or via Railway dashboard:
1. Go to the service → Deployments
2. Find the previous successful deployment
3. Click "Redeploy"

## Troubleshooting

- **"denied" when pushing to GHCR** — Check that your token has `write:packages` scope and that the GitHub org allows package creation.
- **Railway service doesn't update** — The GraphQL mutation requires the OAuth token from `railway login` (not a project token). Ensure `~/.railway/config.json` has valid OAuth tokens.
- **Image pull errors in Railway** — GHCR images are private by default. Ensure the Railway service has registry credentials configured, or make the package public in GitHub settings.
