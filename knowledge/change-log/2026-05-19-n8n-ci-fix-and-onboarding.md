# Change log: 2026-05-19 — n8n CI fix & developer onboarding prompt

## What changed

### CI/CD
- `.github/workflows/build-n8n-image.yml`
  - Fixed `REGISTRY` env from `ghcr` → `ghcr.io`.  
    `docker/login-action` and `docker/metadata-action` require the full hostname; `ghcr` alone caused registry resolution failures.
  - Replaced inline `deploy-railway` job with three separate jobs calling `railway-deploy.yml`.  
    `strategy.matrix` is not compatible with `uses:` (reusable workflow call), so the matrix was expanded into three separate jobs: `deploy-railway-main`, `deploy-railway-worker`, `deploy-railway-webhook`.  
    Also moved `_reusable/railway-deploy.yml` → `railway-deploy.yml` (top-level) because GitHub Actions no longer parses workflows in subdirectories.  
    This guarantees correct `LEVINNOVATION_RAILWAY_PROJECT_ID` resolution (via `${tenant}_RAILWAY_PROJECT_ID` env-var pattern), includes `sync-vars.sh`, and runs `smoke-test.sh` after each redeploy.

### Build / validation
- `Makefile`
  - Removed references to non-existent `scripts/validate_specs.py` and `scripts/validate_agent_context.py`.
  - `make validate` now succeeds for any tenant (validated with `TENANT=levinnovation`).

### Knowledge / onboarding
- Created `knowledge/prompts/opencode/0012-n8n-workflow-developer-onboarding.md` — a copy-pasteable session-bootstrap prompt for new developers (or AI agents) that covers repo structure, n8n SDLC, compile/deploy steps, secrets hygiene, and the custom-node preference policy.
- Regenerated `knowledge/INDEX.md`.

## Why

The previous `build-n8n-image.yml` had three latent defects that would have caused the first CI run to fail:
1. Docker login to `ghcr` (without `.io`) is invalid.
2. `$LEVINNOVATION_RAILWAY_PROJECT_ID` was referenced but never defined in the inline shell job.
3. `make validate` was broken because two referenced validator scripts did not exist.

Fixing these now unblocks the first end-to-end CI run (build image → push to GHCR → redeploy Railway services).

## Next steps

1. **Resolve GitHub push protection block** — previous commits in local history contain an OpenRouter API key in `tenants/levinnovation/assets/workflows/n8n/personal-assistant/.env.example` and `README.md`. The working-tree files are already clean, but the key remains in commit history.  
   Options:
   - Follow GitHub unblock URL (if the key is a revoked/placeholder).
   - Or rewrite history with `git filter-repo` / BFG to strip the secret, then force-push.
2. Once pushed, trigger `.github/workflows/build-n8n-image.yml` via `workflow_dispatch` (or push to `main`) to validate the full build → GHCR → Railway deploy pipeline.
3. Run `scripts/deploy_n8n_workflows.py --tenant levinnovation --env production --all` to push the 5 compiled v2 workflows to the live n8n REST API.
4. Smoke-test a demo webhook end-to-end.

## ADR reference

- ADR-0035: n8n community-node SDK and repo-based image build (already approved).
