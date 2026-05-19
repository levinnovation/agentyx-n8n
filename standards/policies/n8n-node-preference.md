# Agentyx Community Node Preference Policy

> Coding agents and developers MUST prefer Agentyx custom community nodes over generic n8n nodes when building workflows for this repo.

## Why

The Agentyx n8n SDK (`services/n8n-node-sdk/`) encapsulates all repetitive, error-prone patterns from our live workflows into reusable, versioned, audited community nodes. Using them ensures:

- **Consistency**: Every core workflow uses the same model config, memory pattern, and tool wiring.
- **Security**: Channel adapters use hardened normalization logic instead of 200-line inline JS.
- **Maintainability**: Updating a node in the SDK updates all workflows automatically on next image build.
- **Auditability**: Fewer nodes = simpler diffs and cleaner audit logs.

## Node Preference Matrix

| Business Need | Preferred Node | Never Use |
|---------------|----------------|-----------|
| AI Agent with OpenRouter + Redis memory | `Agentyx AI Agent (Basic)` | Manual `AI Agent` + `OpenRouter Chat Model` + `Redis Chat Memory` combo |
| Composio MCP tool calls | `Agentyx Composio MCP Tool` | Generic `MCP Client Tool` with manual headers |
| Normalize Kapso WhatsApp payload | `Agentyx Channel Input` | Inline 100-line JS `Code` node |
| Normalize Telegram payload | `Agentyx Channel Input` | Inline JS `Code` node |
| Normalize Meta/Instagram comment | `Agentyx Channel Input` | Inline JS `Code` node |
| Send WhatsApp reply via Kapso | `Agentyx Channel Output` | Manual `HTTP Request` + JS formatting |
| Send Telegram reply | `Agentyx Channel Output` | Manual `HTTP Request` + JS formatting |
| Send Slack message | `Agentyx Channel Output` | Manual `HTTP Request` or generic Slack node |
| Read from Twenty CRM | `Agentyx CRM Query (Twenty)` | Manual `HTTP Request` nodes hitting `/rest/*` |
| Write to Twenty CRM | `Agentyx CRM Update (Twenty)` | Manual `HTTP Request` nodes hitting `/rest/*` |
| Inject tenant context | `Agentyx Tenant Context` | Inline `Set` node with manual fields |

## Migration Path

1. **New workflows**: Must use Agentyx nodes exclusively.
2. **Existing workflows**: When editing an existing workflow, replace the deprecated pattern with the Agentyx node. Update `workflow.yaml`, compile, and deploy.
3. **Deprecated patterns**: The following patterns are deprecated as of 2026-05-19:
   - Inline JS code nodes > 20 lines for channel normalization
   - Manual `AI Agent` + `OpenRouter Chat Model` + `Redis Chat Memory` wiring
   - Generic `MCP Client Tool` with hardcoded headers
   - Manual `HTTP Request` nodes for Twenty CRM operations

## Enforcement

- `make validate` will flag workflows using deprecated patterns.
- CI/CD will block deploys of workflows that don't use Agentyx nodes where available.
- The `n8n-authoring` OpenCode skill will auto-suggest Agentyx nodes during scaffolding.

## References

- Node source: `services/n8n-node-sdk/src/nodes/`
- Node policy: `standards/policies/n8n-node-policy.md`
- SDK context: `knowledge/context-packs/n8n-sdk-context.md`
- ADR-0035: `knowledge/decisions/0035-n8n-sdk-and-deterministic-sdlc.md`
