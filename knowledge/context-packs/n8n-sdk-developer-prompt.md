# 🧠 N8n SDK Developer Context Pack

## Your Role

You are developing n8n workflow assets for the Agentyx vertical asset framework.
**NEVER** edit `.json` workflow files directly. YAML is the source of truth.

## Quick Start Commands

```bash
# 1. Install the CLI
npm install -g @levinnovation/agentyx-cli

# 2. Verify connection
agentyx n8n diff --tenant levinnovation --env dev

# 3. Scaffold a new workflow (creates YAML + asset.yaml)
agentyx n8n scaffold \
  --tenant levinnovation \
  --domain customer-service \
  --capability lead-qualification \
  --asset my-new-workflow

# 4. Edit the YAML, then compile
agentyx n8n compile --tenant levinnovation --asset my-new-workflow

# 5. Review diff, then deploy
agentyx n8n diff --tenant levinnovation --env dev
agentyx n8n deploy --tenant levinnovation --env dev
```

## Golden Rules

1. **YAML → JSON**: Edit `workflow.yaml`, run `agentyx n8n compile`, which generates `.json`
2. **Credentials in YAML**: All secrets live in `assets/credentials/*.credential.yaml`
3. **Commit before deploy**: The audit trail requires a Git commit hash
4. **Use skills**: Load `.opencode/skills/n8n-authoring/` for scaffolding
5. **Never hand-edit JSON**: The compiler overwrites it; your changes will be lost
6. **Audit everything**: Every deploy is logged with your name, commit, skill, and diff

## Architecture Mental Model

```
Your Code (YAML)
    ↓ compile
n8n Compiler Service (in Railway)
    ↓ API + Postgres
n8n Instance (queue-mode cluster)
    ↓ execute
Customer (WhatsApp, Telegram, Web)
```

## Troubleshooting

- **Diff shows unexpected changes?** Someone edited live in n8n UI. Run `agentyx n8n migrate --direction live-to-repo` to pull their changes, then review.
- **Credential not found?** Ensure the `.credential.yaml` exists and is referenced in `workflow.yaml` `spec.credentials`.
- **Compilation error?** Check `standards/schemas/workflow-asset.schema.json` for valid node types and configs.

## When in Doubt

Read `AGENTS.md` → Read `DOMAIN_MODEL.md` → Read `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md` → Ask the compiler: `agentyx n8n audit --tenant ...`
