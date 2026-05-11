# Channel Adapter: LibreChat Personal Assistant

Webhook adapter used by `n8n-mcp-bridge` so LibreChat can invoke LEV n8n workflows as MCP tools.

## Endpoint

- n8n webhook path: `librechat/personal-assistant`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/librechat/personal-assistant`

## Security

- Requires header `X-N8N-Bridge-Secret` to match `N8N_BRIDGE_SECRET`.

## Runtime variables

- `N8N_BRIDGE_SECRET`
- `PERSONAL_ASSISTANT_CORE_WORKFLOW_ID`

## Request body

```json
{
  "message": "string",
  "conversation_id": "string",
  "user_id": "string",
  "metadata": {}
}
```
