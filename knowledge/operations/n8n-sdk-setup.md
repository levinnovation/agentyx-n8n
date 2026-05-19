# n8n SDK Setup Guide

> Developer onboarding for the Agentyx n8n deterministic SDLC.

## Prerequisites

- Node.js 20+ and npm 10+
- Python 3.11+ (for `make validate`)
- Git access to this repository
- Railway CLI (`npm i -g @railway/cli`) — optional, for inspecting live DB

## 1. Install the Agentyx CLI

```bash
npm install -g @levinnovation/agentyx-cli
agentyx --version
```

## 2. Configure CLI Context

Create `~/.agentyx/config.yaml`:

```yaml
defaultTenant: levinnovation
environments:
  dev:
    compilerUrl: https://compiler-dev.levinnovation.internal
    compilerToken: ${COMPILER_TOKEN_DEV}
  prod:
    compilerUrl: https://compiler-prod.levinnovation.internal
    compilerToken: ${COMPILER_TOKEN_PROD}
```

Tokens are distributed by platform ops via 1Password / Bitwarden.

## 3. Verify Connection

```bash
# Check repo vs live differences
agentyx n8n diff --tenant levinnovation --env dev
```

## 4. Your First Workflow (YAML → Deploy)

### Step 1: Scaffold
```bash
agentyx n8n scaffold \
  --tenant levinnovation \
  --domain customer-service \
  --capability lead-qualification \
  --asset my-first-workflow
```

This creates:
```
tenants/levinnovation/assets/workflows/n8n/my-first-workflow/
├── workflow.yaml      # ← YOU EDIT THIS
├── asset.yaml
├── README.md
└── .env.example
```

### Step 2: Edit `workflow.yaml`

```yaml
apiVersion: agentyx.io/v1
kind: N8nWorkflow
metadata:
  name: my-first-workflow
  tenant: levinnovation
  domain: customer-service
  capability: lead-qualification
  version: "1.0.0"
spec:
  trigger:
    type: webhook
    config:
      httpMethod: POST
      path: my-first-webhook
      responseMode: responseNode
  nodes:
    - name: Webhook
      type: webhook
      position: [240, 300]
      config:
        httpMethod: POST
        path: my-first-webhook
        responseMode: responseNode
    - name: Set Response
      type: set
      position: [440, 300]
      config:
        mode: manual
        values:
          - name: message
            value: "Hello from deterministic SDLC!"
  connections:
    - from: Webhook
      to: Set Response
```

### Step 3: Compile

```bash
agentyx n8n compile --tenant levinnovation --asset my-first-workflow
```

Generates `workflow.json` in the same directory.

### Step 4: Validate

```bash
make validate
```

### Step 5: Commit

```bash
git add tenants/levinnovation/assets/workflows/n8n/my-first-workflow/
git commit -m "feat(levi): add my-first-workflow for lead-qualification"
```

### Step 6: Deploy

```bash
agentyx n8n deploy --tenant levinnovation --env dev --asset my-first-workflow
```

Capture the receipt ID printed to stdout.

## 5. Working with Credentials

### Create a credential YAML

```bash
agentyx n8n credentials scaffold \
  --tenant levinnovation \
  --name slack-bot \
  --type slackOAuth2Api
```

Edit the generated file:
```yaml
# tenants/levinnovation/assets/credentials/slack-bot.credential.yaml
apiVersion: agentyx.io/v1
kind: N8nCredential
metadata:
  name: slack-bot
  tenant: levinnovation
spec:
  type: slackOAuth2Api
  data:
    clientId: "${VAULT::levinnovation/slack/client-id}"
    clientSecret: "${VAULT::levinnovation/slack/client-secret}"
    accessToken: "${VAULT::levinnovation/slack/access-token}"
```

### Encrypt and deploy

```bash
agentyx n8n credentials encrypt --tenant levinnovation --file slack-bot.credential.yaml
agentyx n8n deploy --tenant levinnovation --env dev
```

## 6. Multi-Channel Patterns

Follow ADR-0028 (core + channel adapters):

1. Create `my-agent-core/workflow.yaml` with `trigger.type: executeWorkflowTrigger`.
2. Create `chan-kapso-wa-my-agent/workflow.yaml` with `trigger.type: webhook` and an `executeWorkflow` node calling `my-agent-core`.
3. Compile both, commit, deploy together.

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `workflow.json` overwritten my hand-edits | You edited JSON directly | Always edit `workflow.yaml` and recompile |
| `credential encrypt` fails with "bad key" | `N8N_ENCRYPTION_KEY` mismatch | Ask ops for the correct key |
| Deploy shows no changes | `asset.yaml` status is `deployed` and no diff detected | Edit YAML, bump version, recompile |
| Audit log missing my name | You didn't commit before deploy | The CLI requires a clean commit hash |
| n8n UI shows old workflow | Cache / CDN | Hard-refresh; check `n8n-main` received the update |

## 8. Golden Rules

1. **YAML is truth**. Never hand-edit `.json` workflow files.
2. **Commit before deploy**. The audit trail requires a Git commit hash.
3. **Use skills**. Load `.opencode/skills/n8n-authoring/` in your IDE for guided scaffolding.
4. **Credentials in YAML**. No secrets in UI, no secrets in JSON, no secrets in chat.
5. **Review diffs**. Always run `agentyx n8n diff` before deploying to prod.

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- Compiler runbook: `knowledge/operations/n8n-compiler-runbook.md`
- Migration playbook: `knowledge/operations/n8n-migration-playbook.md`
