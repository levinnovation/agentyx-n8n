# @levinnovation/n8n-nodes-agentyx

Custom n8n community nodes for the Agentyx vertical asset framework.

## Nodes

- `AgentyxTenantContext` — Injects tenant/domain/capability context into workflow execution
- `AgentyxCredential` — Reads credential YAML from repo path
- `AgentyxAuditQuery` — Queries the audit table from within a workflow
- `AgentyxComposioTool` — Composio MCP wrapper with auto-account selection

## Build

```bash
npm run build
```

## Install in n8n

The custom n8n Docker image (`ghcr.io/levinnovation/agentyx-n8n`) includes these nodes pre-installed.

## References

- `standards/policies/n8n-node-policy.md`
