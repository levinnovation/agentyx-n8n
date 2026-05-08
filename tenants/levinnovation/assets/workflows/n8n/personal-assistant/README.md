# Personal Assistant (Levinnovation)

n8n workflow that deploys a conversational AI agent with Composio MCP tool access.

## Nodes

| Node | Type | Purpose |
|------|------|---------|
| Chat Trigger | `n8n-nodes-base.chatTrigger` | Accepts user messages via chat interface |
| AI Agent | `@n8n/n8n-nodes-langchain.agent` | Main reasoning agent with system prompt |
| OpenRouter Chat Model | `@n8n/n8n-nodes-langchain.lmChatOpenRouter` | LLM backend (OpenRouter — GPT-4.1-mini) |
| MCP Client Tool (Composio) | `@n8n/n8n-nodes-langchain.mcpClientTool` | Tool gateway to Composio integrations |

## Architecture

```
User ──▶ Chat Trigger ──▶ AI Agent ◀── OpenRouter Chat Model
                              │
                              ▼
                    MCP Client Tool (Composio)
                              │
                              ▼
                  https://agx-demo-composio-mcp-production.up.railway.app/mcp
```

## Setup

### 1. Import Workflow

In n8n:
1. **Settings** → **Export/Import** → **Import from File**
2. Select `personal-assistant.json`
3. Save

### 2. Configure Credentials

#### OpenRouter Chat Model
1. Open the **OpenRouter Chat Model** node
2. Click **Credentials** → **Create New** (OpenRouter API)
3. Enter your OpenRouter API key (from `.env`/vault; never commit it):
   ```
   <OPENROUTER_API_KEY>
   ```
4. Save

#### MCP Client Tool (Composio)
1. Open the **MCP Client Tool (Composio)** node
2. Click **Credentials** → **Create New** (HTTP Bearer Auth)
3. Enter the Bearer token (same value as composio-mcp `MCP_AUTH_TOKEN`):
   ```
   <MCP_AUTH_TOKEN>
   ```
4. Save

### 3. Configure MCP Client Tool

The node is pre-configured with:
- **Endpoint**: `https://agx-demo-composio-mcp-production.up.railway.app/mcp`
- **Server Transport**: `HTTP (Streamable)`
- **Authentication**: `Bearer Auth`
- **Tools to Include**: `All` *(safe — the server automatically curates tools)*
- **Headers** (values read from **n8n environment variables**, not literals in JSON):
  - `x-entity-id`: `={{ $env.COMPOSIO_ENTITY_ID }}`
  - `x-connected-account-id`: `={{ $env.COMPOSIO_CONNECTED_ACCOUNT_ID }}` *(optional if composio-mcp resolves accounts automatically)*
  - `x-user-prompt`: `={{ $('Chat Trigger').item.json.chatInput }}`

> ✅ **Smart Default Protection**: The composio-mcp server automatically curates a diverse subset of tools (max 50) based on connected OAuth accounts, category utility, and description quality. You no longer need to manually select tools to avoid token overflow.
>
> If you want **full control**, set `COMPOSIO_ALLOWED_TOOLKITS` or `COMPOSIO_ALLOWED_ACTIONS` on the Railway service.
>
> If the agent says it cannot send email even with Gmail connected, verify `x-user-prompt` is forwarded and validate that the toolkit is not excluded by `COMPOSIO_ALLOWED_*` env vars.

### 3b. Meta-tools exposed by composio-mcp

When no explicit allowlists are set on the composio-mcp service, the node can use:

- `composio_search_tools` (discover tools by natural language),
- `composio_execute_tool` (execute any discovered slug),
- `composio_initiate_connection` (start OAuth or API-key account creation when toolkit is allowlisted in `COMPOSIO_AUTO_CONNECT_TOOLKITS`),
- `composio_check_connection` (check connection status).

Example chat flow:
1. User: "send email to alice@example.com".
2. Agent uses `composio_initiate_connection` and returns a redirect URL if Gmail is not connected.
3. User approves OAuth in browser.
4. Agent retries execution (`GMAIL_SEND_EMAIL`) and succeeds.

### 4. Test

1. Open the workflow
2. Click **Chat** (bottom-right corner)
3. Send a message like: "What tools do you have access to?"
4. The agent should respond and list available Composio tools

## Environment Variables

The workflow references these Railway-level variables (set on `agx-demo-composio-mcp`):

| Variable | Value |
|----------|-------|
| `COMPOSIO_API_KEY` | *(Composio dashboard — set in Railway, not in git)* |
| `COMPOSIO_ENTITY_ID` | *(Your entity id — e.g. `pg-test-…`)* |
| `MCP_AUTH_TOKEN` | *(Random secret shared with n8n Bearer credential)* |
| `COMPOSIO_API_BASE` | `https://backend.composio.dev/api/v3.1` |

## Advanced: Context-Aware Tool Search

The composio-mcp server exposes a `/search-tools` endpoint for dynamic tool discovery:

```bash
curl -X POST https://agx-demo-composio-mcp-production.up.railway.app/search-tools \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"query": "send email via gmail", "max_results": 10}'
```

Response:
```json
{
  "query": "send email via gmail",
  "results": 10,
  "tools": [
    { "slug": "GMAIL_SEND_EMAIL", "name": "Send Email", "toolkit": "gmail" },
    ...
  ]
}
```

Use this endpoint to find specific tools when building custom workflows.

## Allowlists

To restrict which Composio tools are available, set these on the Railway service:

- `COMPOSIO_ALLOWED_TOOLKITS` — comma-separated toolkit slugs (e.g., `gmail,slack,notion`)
- `COMPOSIO_ALLOWED_ACTIONS` — comma-separated tool slugs

## Notes

- The **Chat Trigger** creates a persistent chat session URL per workflow
- The **AI Agent** system prompt instructs the agent to be helpful, concise, and professional
- Temperature is set to `0.7` for balanced creativity and determinism
- All executions are saved for debugging

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 401 on MCP | Verify Bearer token in credentials matches Railway `MCP_AUTH_TOKEN` |
| Empty tool list | Check `COMPOSIO_ALLOWED_*` variables; ensure OAuth connections in Composio dashboard |
| **Token limit exceeded** (`maximum context length is 128000 tokens`) | The server should prevent this automatically. If it happens, check `COMPOSIO_SMART_DEFAULT=true` is set on the Railway service, or manually set `COMPOSIO_ALLOWED_TOOLKITS` to restrict tools |
| OpenRouter errors | Verify OpenRouter API key is valid and has credits at https://openrouter.ai/settings/credits |
| Chat not responding | Ensure workflow is **Active** (toggle in top-right) |
