# Change log: 2026-05-19 — CI fix, pre-built nodes, and Railway deployment

## What changed

### CI/CD pipeline (`.github/workflows/build-n8n-image.yml`)
- Fixed `REGISTRY` from `ghcr` → `ghcr.io` (required for docker/login-action).
- Replaced `deploy-railway` reusable workflow calls with inline steps in the caller job.  
  Matrix strategy is incompatible with `uses:` (reusable workflow call).
- Added SVG copy to dist/ during node build (tsc doesn't copy .svg → icons were missing).
- Changed Railway install from `curl | sh` to `curl | bash` (install script uses bashisms).
- Added `$HOME/.railway/bin` to `$GITHUB_PATH` after Railway CLI install.

### Deploy script (`scripts/deploy_n8n_workflows.py`)
- Fixed Python 3.9 type hint (`list[str] | None` → `Optional[list[str]]`).
- Added `id`, `active`, `description` to the list of stripped fields.  
  n8n API rejects these as read-only on PUT.

### Custom nodes build (services/n8n-node-sdk/)
- Removed `"type": "module"` from `package.json`. n8n community nodes require CommonJS.
- Changed tsconfig from `module: NodeNext` → `module: commonjs`.

### Dockerfile fork (levinnovation/agentyx-n8n `master` branch)
- Switched from **build-from-source** (installing npm, TypeScript, compiling in Docker)  
  to **pre-built artifacts** — `custom-nodes/` contains compiled `.js` + `.svg` files.
- Dockerfile now does `COPY custom-nodes/` only — no `RUN npm install`, no `tsc`.
- `.dockerignore` updated to allow `custom-nodes/**` in build context.
- `.gitignore` updated with `!custom-nodes/@levinnovation/n8n-nodes-agentyx/dist` exception.

### Infrastructure knowledge
- Moved `_reusable/railway-deploy.yml` → `railway-deploy.yml` (GitHub Actions no longer parses workflows in subdirectories).
- Updated `railway-deploy.yml` to use POSIX-compatible `[ ]` and `printenv` instead of bashisms (`[[ ]]`, `${!VAR}`).

## Why

The previous approach of building the custom nodes from source inside the Docker build had a cascade of failures:
1. `.dockerignore` excluded the SDK from build context
2. `npm ci` required lockfile (excluded by `.gitignore`)
3. `npm install` skipped devDependencies (no `tsc`)
4. Each fix required another ~3-minute Railway rebuild

The pre-built artifacts approach eliminates all these issues:
- No npm/TypeScript in Docker build
- Single COPY step (~1s)
- Build context is small and predictable

## Next steps (after Railway outage resolves)

1. `railway up --service agx-demo-n8n` from fork repo
2. Activate `demo-agentyx-nodes` v2 workflow via API
3. Test webhook POST to verify end-to-end execution
4. Deploy webhook + worker services with same image
5. If CI token is fixed, run `build-n8n-image.yml` to push GHCR image for non-linked services

## Files changed

### agentyx-vertical-assets (main branch)
- `.github/workflows/build-n8n-image.yml` — REGISTRY fix, inline deploy, SVG copy, Railway CLI PATH
- `.github/workflows/railway-deploy.yml` — moved from _reusable/, POSIX shell, curl|bash
- `.github/workflows/deploy-euromobilia-agent-railway.yml` — updated railway-deploy reference
- `.github/workflows/deploy-euromobilia-stack-railway.yml` — updated railway-deploy reference
- `Makefile` — removed broken validate targets
- `services/n8n-node-sdk/package.json` — removed `"type": "module"`
- `services/n8n-node-sdk/tsconfig.json` — changed to commonjs
- `services/n8n-yaml-compiler/Dockerfile.n8n` — global install path, N8N_CUSTOM_EXTENSIONS
- `scripts/deploy_n8n_workflows.py` — Python 3.9 compat, strip id/active/description
- `knowledge/change-log/2026-05-19-n8n-ci-fix-and-onboarding.md` — this file
- `knowledge/prompts/opencode/0012-n8n-workflow-developer-onboarding.md`

### agentyx-n8n (fork, master branch)
- `Dockerfile` — pre-built artifacts, removed npm/tsc build steps
- `.dockerignore` — allow `custom-nodes/**`
- `.gitignore` — allow `custom-nodes/dist` exception
- `custom-nodes/@levinnovation/n8n-nodes-agentyx/` — pre-built dist (JS + SVG) + package.json
- `services/n8n-node-sdk/` — removed (source belongs in assets repo)
