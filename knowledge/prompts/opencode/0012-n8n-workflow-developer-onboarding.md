# Prompt log: 2026-05-19 — n8n Workflow Developer Onboarding

**Tool:** opencode
**Date:** 2026-05-19

## Goal

Provide a reusable chat-session bootstrap prompt so any new developer (or AI agent) can immediately understand the n8n SDLC, repository structure, and safe workflow for editing/deploying n8n workflows without breaking production.

## Context files read

- `AGENTS.md`
- `CONSTITUTION.md`
- `DOMAIN_MODEL.md`
- `knowledge/context-packs/repo-context.md`
- `knowledge/operations/n8n-compiler-runbook.md`
- `knowledge/operations/n8n-sdk-setup.md`
- `standards/policies/n8n-node-preference.md`

## Outcome

Created reusable onboarding prompt:
- `knowledge/prompts/opencode/0012-n8n-workflow-developer-onboarding.md`

Updated knowledge:
- `knowledge/change-log/2026-05-19-n8n-ci-fix-and-onboarding.md`
- `knowledge/INDEX.md` (regenerated via `make knowledge-index`)

## Follow-ups

1. Share the prompt below with new team members via wiki / Notion / onboarding doc.
2. Keep prompt updated when custom node set changes (currently 7 nodes + 7 credentials).

## Original prompt

```text
# Agentyx n8n Workflow Developer — Session Bootstrap

You are working inside the **agentyx-vertical-assets** repository.  
Before touching any n8n workflow, custom node, or deployment config, follow this exact boot sequence.

## 1. Read the ground rules (non-negotiable)

1. `AGENTS.md` — Prime rule: no top-level `agents/`, `workflows/`, `apps/` folders. Everything lives under `tenants/{tenant}/domains/{domain}/...` or `tenants/{tenant}/assets/...`.
2. `CONSTITUTION.md` — Prompts are first-class versioned assets. Infrastructure is versioned. Secrets never committed.
3. `DOMAIN_MODEL.md` — Tenant → Domain → Capability → Asset.
4. `standards/policies/n8n-node-preference.md` — When building workflows, prefer Agentyx custom nodes over stock n8n nodes or raw JS code nodes.

## 2. Understand the n8n SDLC (read these docs)

- `knowledge/operations/n8n-sdk-setup.md` — How the 7 custom nodes + 7 credentials are built, tested, and packaged.
- `knowledge/operations/n8n-compiler-runbook.md` — YAML → JSON compiler (`scripts/compile_n8n_asset.py`).
- `knowledge/operations/n8n-queue-mode-runbook.md` — Railway topology: `n8n-main`, `n8n-worker`, `n8n-webhook`, `redis`.

## 3. Locate the asset you need to edit

Canonical path:
```
tenants/{tenant}/assets/workflows/n8n/{asset-name}/
  workflow.yaml      # ⬅️ SOURCE OF TRUTH (human-editable)
  workflow.json      # ⬅️ GENERATED (do NOT hand-edit)
  asset.yaml         # metadata, dependencies, tags
  README.md          # runbook / setup notes
  .env.example       # non-secret env var template
```

If the asset does not exist, scaffold it first:
```bash
make scaffold-asset TENANT=levinnovation DOMAIN=customer-service CAPABILITY=lead-qualification ASSET=my-new-workflow TARGET=n8n
```

## 4. Edit workflow.yaml (never workflow.json)

- Use the **Agentyx custom node IDs** whenever possible:
  - `@levinnovation/n8n-nodes-agentyx.aiAgentBasic`
  - `@levinnovation/n8n-nodes-agentyx.composioMcpTool`
  - `@levinnovation/n8n-nodes-agentyx.channelFormattedInput`
  - `@levinnovation/n8n-nodes-agentyx.channelFormattedOutput`
  - `@levinnovation/n8n-nodes-agentyx.crmQuery`
  - `@levinnovation/n8n-nodes-agentyx.crmUpdate`
  - `@levinnovation/n8n-nodes-agentyx.tenantContext`
- Prefer **credential references** over hard-coded API keys.
- Add `description` fields so the compiler can generate human-readable node names.

## 5. Compile before deploying

```bash
# Single asset
make compile-n8n TENANT=levinnovation DOMAIN=customer-service CAPABILITY=lead-qualification ASSET=my-new-workflow

# Or compile all v2 assets for a tenant
python scripts/compile_n8n_asset.py --tenant levinnovation --all
```

Validate the repo after any change:
```bash
make validate
```

## 6. Deploy compiled JSONs to live n8n (parallel migration, zero downtime)

**Never overwrite live workflows directly.**  
The v2 workflows run in parallel until explicitly activated.

```bash
python scripts/deploy_n8n_workflows.py \
  --tenant levinnovation \
  --env production \
  --all \
  --n8n-url https://levinnovation.n8n.agentyx.one \
  --api-key $N8N_API_KEY
```

Verify in the n8n UI that workflows appear as **inactive** copies, then activate manually after smoke testing.

## 7. If you need a new custom node or credential type

1. Implement it under `services/n8n-node-sdk/src/nodes/` or `services/n8n-node-sdk/src/credentials/`.
2. Add the SVG icon under `services/n8n-node-sdk/src/nodes/{nodeName}.svg`.
3. Register it in `services/n8n-node-sdk/package.json` (`n8n.nodes` / `n8n.credentials`).
4. Rebuild the custom Docker image:
   ```bash
   # Local test
   docker build -f services/n8n-yaml-compiler/Dockerfile.n8n -t agentyx-n8n:latest .
   ```
5. Update the node-preference policy doc if the new node replaces an old pattern.

## 8. Secrets hygiene (hard stop)

- `.env.example` files may contain **placeholder** keys only (e.g., `sk-or-v1-REPLACE-ME`).
- Real keys live in:
  - Railway service variables (`railway variables`)
  - n8n credential vault (never exported to JSON)
  - 1Password / Doppler (human-accessible)
- If you accidentally commit a real secret, **do not push**. Run `git commit --amend` or `git rebase -i` to remove it, then rotate the key immediately.

## 9. Before ending the session

1. `make validate` passes.
2. `make knowledge-index` is up to date if you added/removed knowledge files.
3. Commit message follows convention: `feat(n8n): …`, `fix(ci): …`, `docs(knowledge): …`.
4. ADR created if the change is architectural (new node, new deploy pattern, etc.).
5. Change record created under `knowledge/change-log/`.

---

**Quick checklist for this chat session:**
- [ ] Read `AGENTS.md` + `repo-context.md`
- [ ] Read `n8n-node-preference.md`
- [ ] Confirm I am editing `.yaml`, not `.json`
- [ ] Confirm I will not commit real secrets
- [ ] Confirm I will update `knowledge/` if the change is architectural
```
