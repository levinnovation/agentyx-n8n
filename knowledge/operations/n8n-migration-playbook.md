# n8n Migration Playbook

> How to migrate live n8n workflows into the repo as YAML source of truth.

## When to Use This Playbook

- Initial setup of deterministic SDLC (ADR-0035).
- When live n8n has drifted from the repo.
- After a developer edited workflows in the n8n UI instead of Git.
- When onboarding a new tenant.

## Pre-Migration Checklist

1. **Announce freeze**: Notify all operators that live n8n UI edits are frozen during migration.
2. **Back up live n8n**: Export all workflows via n8n UI → "Download" as a safety net.
3. **Verify compiler service** is running and connected to the target n8n instance.
4. **Ensure audit table exists**: `agentyx_audit.n8n_change_log` must be present.

## Phase 1: Automated Discovery

```bash
agentyx n8n migrate \
  --tenant levinnovation \
  --env dev \
  --direction live-to-repo \
  --output-dir ./migration-levinnovation/
```

This produces:
```
migration-levinnovation/
├── workflows/
│   └── {workflow-name}/
│       ├── workflow.yaml       # Reconstructed YAML
│       ├── workflow.json       # Exact n8n export (reference)
│       ├── asset.yaml          # Generated metadata
│       └── README.md           # Auto-generated docs
├── credentials/
│   └── {name}.credential.yaml  # Stub with type, data marked MIGRATED
└── report.json                 # Summary of all migrated objects
```

## Phase 2: Credential Sanitization (Manual)

**CRITICAL**: Credential YAMLs contain `data: [MIGRATED_FROM_LIVE — MANUAL_ENTRY_REQUIRED]`.

For each credential:
1. Retrieve the real secret from your vault (1Password, Bitwarden, etc.).
2. Fill in the `data:` block with vault references:
   ```yaml
   data:
     accessToken: "${VAULT::levinnovation/slack/access-token}"
   ```
3. Do **not** commit literal secrets.
4. Mark as sanitized in a comment:
   ```yaml
   # SANITIZED: 2026-05-19 by ops@levinnovation.com
   ```

## Phase 3: Workflow Review

For each migrated `workflow.yaml`:

1. **Verify trigger**: Does the trigger type match the capability? (webhook for channels, schedule for batch, executeWorkflowTrigger for cores).
2. **Check node types**: Are all node types supported by the compiler? If a node uses a custom community node not yet in `n8n-node-sdk`, flag it.
3. **Validate connections**: Ensure the `connections:` block matches the live JSON.
4. **Check tags**: Are tags meaningful and consistent? Rename if needed.
5. **Add variables**: If the workflow uses n8n instance variables, extract them into `spec.variables`.

## Phase 4: Capability Reconciliation

1. Compare migrated assets against `capability.yaml` `assets:` lists.
2. Add missing references.
3. Remove assets that are no longer used.
4. Update `status:` to `migrated` for all migrated assets.

## Phase 5: Test Compilation

```bash
# Compile all migrated assets
for asset in $(ls migration-levinnovation/workflows/); do
  agentyx n8n compile --tenant levinnovation --asset "$asset"
done

# Validate repo state
make validate
```

Fix any compilation errors before proceeding.

## Phase 6: Dry-Run Deploy

```bash
agentyx n8n deploy \
  --tenant levinnovation \
  --env dev \
  --all \
  --dry-run
```

Review the diff output carefully. Ensure no unintended changes.

## Phase 7: Actual Deploy

```bash
agentyx n8n deploy \
  --tenant levinnovation \
  --env dev \
  --all
```

## Phase 8: Verification

1. Open n8n UI and verify workflow names, tags, and activation status match.
2. Run a test execution for each critical workflow.
3. Check the audit table:
   ```sql
   SELECT object_name, action, deployed_at, author
   FROM agentyx_audit.n8n_change_log
   WHERE tenant = 'levinnovation'
   ORDER BY deployed_at DESC;
   ```

## Phase 9: Commit and Lock

```bash
git add tenants/levinnovation/assets/workflows/n8n/
git add tenants/levinnovation/assets/credentials/
git commit -m "feat(levi): migrate all live n8n workflows to deterministic YAML SDLC"
git push
```

After push, communicate to the team:
> "All n8n changes must now go through Git + agentyx CLI. Live UI edits will be overwritten on next deploy."

## Rollback (If Migration Corrupts Live State)

1. Stop the compiler service or disable its CI pipeline.
2. Restore the pre-migration n8n backup (exported in Phase 1).
3. Re-import via n8n UI or `scripts/import_n8n_workflow.py`.
4. Investigate the failed asset YAMLs before retrying.

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- Compiler runbook: `knowledge/operations/n8n-compiler-runbook.md`
- SDK setup: `knowledge/operations/n8n-sdk-setup.md`
