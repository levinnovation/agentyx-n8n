# ADR-0035: n8n SDK and Deterministic SDLC

**Status:** Accepted  
**Date:** 2026-05-19  
**Deciders:** AI Team, Platform Ops

## Context

This repository owns 40+ n8n workflow JSON files across two tenants (`euromobilia`, `levinnovation`). Until now, the SDLC has been:

1. Edit workflows in the n8n UI (live).
2. Periodically export JSON and commit it.
3. Deploy via `scripts/import_n8n_workflow.py` (REST API upsert).

This creates drift between the repo and live n8n instances. Secrets are scattered. There is no audit trail of who changed what, when, or why. The n8n UI is treated as a secondary source of truth, which violates Constitution rule 10 (Runtime Agnosticism) and ADR-0018 (Git-first authoring).

We need a deterministic, repo-driven SDLC where:
- YAML specs are the **only** editable source for workflows, credentials, and variables.
- A compiler service translates YAML into n8n-native artifacts.
- A hybrid API/DB deployer pushes artifacts to n8n with full provenance tracking.
- An audit table captures every change at the node level.

## Decision

1. Introduce an **n8n SDK** consisting of:
   - `services/n8n-yaml-compiler/` — Runtime compiler service (Node/TypeScript, Express, TypeORM).
   - `services/n8n-node-sdk/` — Custom n8n community nodes package (`@levinnovation/n8n-nodes-agentyx`).
   - `cli/agentyx/` — CLI client (`@levinnovation/agentyx-cli`) for developers and CI/CD.
   - OpenCode skills: `n8n-authoring` and `n8n-deploy`.

2. Establish **YAML as the source of truth** for:
   - `workflow.yaml` — Replaces hand-edited JSON for all n8n workflows.
   - `*.credential.yaml` — Replaces credentials created in the n8n UI.
   - `asset.yaml` — Enhanced to reference YAML sources and declare compilation status.

3. The **compiler service** deploys via a **smart hybrid** strategy:
   - **REST API first** for workflows (`POST/PUT /api/v1/workflows`).
   - **Direct Postgres fallback** for credentials, variables, tags, webhooks, and shared permissions when the API is insufficient or lacks atomicity.
   - Uses **TypeORM entities imported from the n8n source** to stay schema-compatible.

4. **Comprehensive audit logging** in `agentyx_audit.n8n_change_log`:
   - Git commit hash, author, branch.
   - Agent skill name (e.g., `n8n-authoring`), CLI version, request ID.
   - n8n version and instance URL.
   - Node-level and connection-level diffs.
   - Previous and new values (JSONB).
   - Deployment status (success / failed / rolled_back).

5. **Migration mandate**: All live n8n workflows that do not exist in the repo, or are newer in the live instance, must be migrated into the repo via `agentyx n8n migrate --direction live-to-repo`. After migration, the repo is the **sole source of truth**; live UI edits are frozen.

## Consequences

### Positive

- **Deterministic deployments**: The same commit always produces the same n8n state.
- **Full audit trail**: Every node change is traceable to a Git commit and developer.
- **Credential governance**: Secrets live in YAML with vault references, never in UI.
- **Agent-assisted authoring**: OpenCode skills can scaffold, validate, compile, and deploy without touching the n8n UI.
- **Custom nodes**: Business-specific nodes (tenant context, Composio tool wrapper) become first-class n8n citizens.

### Negative

- **n8n version coupling**: TypeORM entities must be updated when n8n upgrades (mitigated by pinning version in `forks.yaml`).
- **Operational complexity**: One more service (compiler) to monitor in the Railway stack.
- **Migration effort**: 40+ workflows must be reviewed, migrated, and validated before cutover.
- **Team retraining**: Developers must stop using the n8n UI for production edits.

## Rejected Alternatives

- **UI-as-source-of-truth** — Rejected; violates Constitution and all prior n8n ADRs.
- **Raw SQL only** — Rejected; n8n REST API is safer for workflows. Direct SQL is reserved for API gaps.
- **No audit table** — Rejected; compliance and debugging require immutable change history.
- **Public npm package for CLI** — Rejected; CLI is private to `@levinnovation` org.

## Implementation

- `services/n8n-yaml-compiler/` — Compiler service code.
- `services/n8n-node-sdk/` — Custom nodes package.
- `cli/agentyx/` — CLI client source.
- `.opencode/skills/n8n-authoring/SKILL.md` — Scaffold/compile skill.
- `.opencode/skills/n8n-deploy/SKILL.md` — Deploy/migrate skill.
- `standards/schemas/credential-spec.schema.json` — Credential YAML schema.
- `standards/schemas/compiler-deployment.schema.json` — Deployment receipt schema.
- `standards/policies/n8n-node-policy.md` — Custom node governance.
- `knowledge/operations/n8n-compiler-runbook.md` — Operational procedures.
- `knowledge/operations/n8n-sdk-setup.md` — Developer onboarding.
- `knowledge/operations/n8n-migration-playbook.md` — Live-to-repo migration steps.
- `knowledge/context-packs/n8n-sdk-context.md` — Agent context pack.
- `knowledge/change-log/2026/05/2026-05-19-n8n-sdk-plan.md` — Implementation record.

## Follow-up

- Phase 1 (this PR): Foundation — ADR, knowledge, compiler skeleton, audit schema.
- Phase 2: Compiler core — YAML→JSON engine, deployers, audit logger.
- Phase 3: CLI & skills — agentyx CLI, OpenCode skills, Makefile targets.
- Phase 4: Migration — Live-to-repo for `euromobilia` and `levinnovation`.
- Phase 5: Cutover — Deploy compiler to Railway, deterministic CI/CD.
- Phase 6: Custom nodes — `n8n-node-sdk` nodes, custom n8n Docker image.
