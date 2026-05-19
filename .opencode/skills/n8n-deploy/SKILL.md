---
name: n8n-deploy
description: Deploy and migrate n8n workflows via the agentyx CLI
license: MIT
compatibility: opencode
metadata:
  audience: developers, ai-agents, devops
  workflow: n8n-sdlc
---

## When to use

When the user wants to:
- Deploy workflows to dev or prod
- Compare repo vs live n8n state
- Migrate live workflows into the repo
- Roll back a workflow
- Query the audit log
- Encrypt credentials

## Workflow

1. **Verify git state**: Ensure working directory is clean or changes are committed.
2. **Diff**: Run `agentyx n8n diff --tenant ... --env ...` to see pending changes.
3. **Deploy**: Run `agentyx n8n deploy --tenant ... --env ... --asset ...` (or `--all`).
4. **Capture receipt**: Save the deployment receipt ID printed to stdout.
5. **Update status**: Set `asset.yaml` status to `deployed`.
6. **Verify**: Run `agentyx n8n audit --tenant ... --since today` to confirm the audit entry exists.

## Rules

- **Always commit before deploying** — the audit trail requires a Git commit hash.
- **Always capture the deployment receipt ID** — it is the proof of deployment.
- **Never deploy to prod without diff review** — run `agentyx n8n diff` first.
- **If migration needed**: Use `agentyx n8n migrate --direction live-to-repo` to pull live changes, then review before committing.
- **Credentials are deployed with workflows** — ensure `*.credential.yaml` files are committed before deploying.

## Example

User: "Deploy the customer-service-core changes to prod"

Skill actions:
1. Check git status: `git status`
2. If uncommitted changes, advise commit first.
3. Run diff: `agentyx n8n diff --tenant levinnovation --env prod`
4. Present diff summary to user.
5. If user approves: `agentyx n8n deploy --tenant levinnovation --env prod --asset customer-service-core`
6. Capture receipt ID and update `asset.yaml` status.
7. Verify audit: `agentyx n8n audit --tenant levinnovation --workflow customer-service-core --since today`

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- Compiler runbook: `knowledge/operations/n8n-compiler-runbook.md`
- SDK setup: `knowledge/operations/n8n-sdk-setup.md`
- Migration playbook: `knowledge/operations/n8n-migration-playbook.md`
