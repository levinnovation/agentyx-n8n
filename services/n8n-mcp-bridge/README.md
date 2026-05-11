# n8n MCP Bridge

MCP server that exposes selected n8n workflows as callable tools.

## Endpoints

- `GET /healthz` health check
- `POST /mcp` MCP Streamable HTTP endpoint

## Environment

- `MCP_AUTH_TOKEN` bearer token required on `/mcp`
- `N8N_BRIDGE_SECRET` forwarded to n8n adapters as `X-N8N-Bridge-Secret`
- `N8N_TOOLS_REGISTRY_JSON` JSON array of exposed tools

## Registry item

```json
{
  "tool": "personal_assistant_chat",
  "title": "LEV Personal Assistant",
  "description": "Chat with LEV assistant workflow.",
  "webhook_url": "https://levinnovation.n8n.agentyx.one/webhook/librechat/personal-assistant",
  "input_schema": {
    "type": "object",
    "properties": {
      "message": { "type": "string" }
    },
    "required": ["message"]
  }
}
```
