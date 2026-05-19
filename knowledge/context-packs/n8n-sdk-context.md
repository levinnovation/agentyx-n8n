# n8n SDK Context Pack

> Durable context for AI coding agents working with the Agentyx n8n SDLC.

## Identity

The Agentyx n8n SDK is a **deterministic, repo-driven workflow management layer** that sits between Git and n8n. It consists of:

- **Compiler service** (`services/n8n-yaml-compiler/`)
- **Custom nodes** (`services/n8n-node-sdk/`)
- **CLI client** (`cli/agentyx/`)
- **OpenCode skills** (`.opencode/skills/n8n-authoring/`, `n8n-deploy/`)

## Prime Rule

**YAML is the only editable source for n8n workflows, credentials, and variables.** Never edit `.json` workflow files directly. The compiler overwrites them.

## Architecture

```
Developer / Agent Skill
    ↓ agentyx CLI
n8n-yaml-compiler service (Railway)
    ↓ REST API (workflows)
    ↓ TypeORM + Postgres (credentials, variables, webhooks, audit)
n8n instance (queue-mode cluster)
```

## File Locations

| Concern | Path |
|---------|------|
| Workflow YAML source | `tenants/{t}/assets/workflows/n8n/{asset}/workflow.yaml` |
| Compiled workflow JSON | `tenants/{t}/assets/workflows/n8n/{asset}/workflow.json` |
| Asset metadata | `tenants/{t}/assets/workflows/n8n/{asset}/asset.yaml` |
| Credential YAML | `tenants/{t}/assets/credentials/{name}.credential.yaml` |
| Compiler service | `services/n8n-yaml-compiler/` |
| Custom nodes | `services/n8n-node-sdk/` |
| CLI source | `cli/agentyx/` |
| Authoring skill | `.opencode/skills/n8n-authoring/SKILL.md` |
| Deploy skill | `.opencode/skills/n8n-deploy/SKILL.md` |
| Credential schema | `standards/schemas/credential-spec.schema.json` |
| Compiler deployment schema | `standards/schemas/compiler-deployment.schema.json` |
| n8n node policy | `standards/policies/n8n-node-policy.md` |

## Audit Trail

Every deployment writes to `agentyx_audit.n8n_change_log` with:
- Git commit hash, author, branch
- Agent skill name, CLI version, request ID
- n8n version, instance URL
- Node-level and connection-level diffs
- Previous and new values (JSONB)

Query example:
```sql
SELECT action, object_name, node_changes, author, deployed_at
FROM agentyx_audit.n8n_change_log
WHERE tenant = 'levinnovation'
ORDER BY deployed_at DESC
LIMIT 10;
```

## Compiler Service Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/healthz` | GET | Health check |
| `/deploy` | POST | Deploy tenant assets |
| `/diff` | POST | Compare repo vs live |
| `/migrate` | POST | Pull live workflows into repo |
| `/audit` | GET | Query audit log |
| `/credentials/encrypt` | POST | Encrypt credential data |

## CLI Commands

```bash
agentyx n8n compile --tenant <t> --asset <a>
agentyx n8n deploy --tenant <t> --env <e>
agentyx n8n diff --tenant <t> --env <e>
agentyx n8n migrate --tenant <t> --env <e> --direction live-to-repo
agentyx n8n credentials encrypt --tenant <t> --file <f>
agentyx n8n audit --tenant <t> --since <date>
```

## Custom Node SDK (v1) — Implemented Nodes

All nodes live under `services/n8n-node-sdk/src/nodes/`. They are baked into the custom n8n Docker image (`ghcr.io/levinnovation/agentyx-n8n:latest`) built by `.github/workflows/build-n8n-image.yml`.

| Node | Type | Replaces |
|------|------|----------|
| `AgentyxTenantContext` | transform | Manual `Set` node with tenant fields |
| `AgentyxAIAgentBasicNode` | AI | `AI Agent` + `OpenRouter Chat Model` + `Redis Chat Memory` combo |
| `AgentyxComposioMcpToolNode` | AI | Generic `MCP Client Tool` with manual headers |
| `AgentyxChannelFormattedInputNode` | transform | 50-200 line JS code nodes for channel normalization |
| `AgentyxChannelFormattedOutputNode` | transform | 100-300 line JS code nodes for reply formatting + HTTP sending |
| `AgentyxCRMQuery` | transform | Manual `HTTP Request` nodes for Twenty CRM reads |
| `AgentyxCRMUpdate` | transform | Manual `HTTP Request` nodes for Twenty CRM writes |

### Credential Types

| Credential | Used By |
|------------|---------|
| `openrouterApi` | `AgentyxAIAgentBasicNode` |
| `composioMcp` | `AgentyxComposioMcpToolNode` |
| `kapsoApi` | `AgentyxChannelFormattedOutputNode` (WhatsApp) |
| `telegramBot` | `AgentyxChannelFormattedOutputNode` (Telegram) |
| `twentyCrmApi` | `AgentyxCRMQuery`, `AgentyxCRMUpdate` |
| `redisAccount` | `AgentyxAIAgentBasicNode` (memory) |

## Node Preference Policy

**Coding agents MUST prefer Agentyx nodes over generic n8n nodes.** See `standards/policies/n8n-node-preference.md` for the full matrix.

Deprecated patterns (do not use in new workflows):
- Inline JS code nodes > 20 lines for channel normalization
- Manual `AI Agent` + `OpenRouter Chat Model` + `Redis Chat Memory` wiring
- Generic `MCP Client Tool` with hardcoded headers
- Manual `HTTP Request` nodes for Twenty CRM operations

## When Editing This Area

1. Read ADR-0035.
2. Read the compiler runbook.
3. Update `workflow.yaml`, never `workflow.json`.
4. Run `make validate`.
5. Commit before deploy (audit trail requires commit hash).
6. Update this context pack if architecture changes.

## References

- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
- Compiler runbook: `knowledge/operations/n8n-compiler-runbook.md`
- SDK setup: `knowledge/operations/n8n-sdk-setup.md`
- Migration playbook: `knowledge/operations/n8n-migration-playbook.md`
