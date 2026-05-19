# Agentyx Composio MCP Tool Node

Encapsulates the Composio MCP Client Tool pattern with toolkit filtering, auto-account selection, and standardized headers.

## What it replaces

Replaces multiple `MCP Client Tool` nodes with manual header configuration:
- `MCP Slack Tool`
- `MCP Google Calendar Tool`
- `MCP Google Drive Tool`
- `MCP Tavily Tool`
- `MCP Gmail Tool`
- `MCP ClickUp Tool`

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| Toolkit | options | `GOOGLECALENDAR` | Filter by toolkit |
| Max Tools | number | 8 | Max tools to expose |
| Include Tools | json | `[]` | Whitelist specific tool names |
| Compressed Tools | boolean | true | Send x-compressed-tools header |
| Tool Verbosity | options | `brief` | `brief` or `full` |
| Entity ID | string | `={{ $env.COMPOSIO_ENTITY_ID }}` | x-entity-id header |
| User Prompt | string | expression | x-user-prompt header |
| Connected Account ID | string | expression | x-connected-account-id header |
| MCP Method | options | `tools/call` | `tools/list` or `tools/call` |
| Tool Name | string | "" | Required for tools/call |
| Tool Arguments | json | `{}` | Arguments for the tool |
| Timeout | number | 30000 | Request timeout ms |

## Credentials

- **Composio MCP** (`composioMcp`) — Required

## Output

```json
{
  "result": { ... },
  "error": null,
  "tool": "GOOGLECALENDAR_CREATE_EVENT",
  "toolkit": "GOOGLECALENDAR",
  "entity_id": "levinnovation-user-id",
  "metadata": { "timestamp": "...", "request_id": "..." }
}
```

## Usage in SDLC

Use this node whenever a workflow needs to call Composio tools. It automatically handles:
- Header injection (x-entity-id, x-user-prompt, x-max-tools, etc.)
- Toolkit filtering
- Tool whitelisting
- Compression

## References

- `knowledge/context-packs/n8n-sdk-context.md`
- `standards/policies/n8n-node-policy.md`
