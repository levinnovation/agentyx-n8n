# Runbook: n8n MCP bridge

## Service

- Name: `agx-demo-n8n-mcp-bridge`
- Source: `services/n8n-mcp-bridge`
- Health: `GET /healthz`
- MCP endpoint: `POST /mcp`

## Variables

- `MCP_AUTH_TOKEN` (bearer required on `/mcp`)
- `N8N_BRIDGE_SECRET` (forwarded to n8n adapter as `X-N8N-Bridge-Secret`)
- `N8N_TOOLS_REGISTRY_JSON` (tool registry)

## Registry format

```json
[
  {
    "tool": "personal_assistant_chat",
    "title": "LEV Personal Assistant",
    "description": "Chat with LEV personal-assistant n8n workflow.",
    "webhook_url": "https://levinnovation.n8n.agentyx.one/webhook/librechat/personal-assistant",
    "input_schema": {
      "type": "object",
      "properties": {
        "message": { "type": "string" }
      },
      "required": ["message"]
    }
  }
]
```

## Smoke

```bash
curl -sS "https://agx-demo-n8n-mcp-bridge-production.up.railway.app/healthz"
```

```bash
curl -sS "https://agx-demo-n8n-mcp-bridge-production.up.railway.app/mcp" \
  -H "Authorization: Bearer ${N8N_MCP_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## LibreChat integration

Add bridge server in LibreChat runtime config (`librechat.yaml`) with streamable HTTP transport and bearer header.
