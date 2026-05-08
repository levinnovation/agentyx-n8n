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
3. Enter your OpenRouter API key:
   ```
   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
   ```
4. Save

#### MCP Client Tool (Composio)
1. Open the **MCP Client Tool (Composio)** node
2. Click **Credentials** → **Create New** (HTTP Bearer Auth)
3. Enter the Bearer token:
   ```
   dbf563c896989f102cb8d58e7e1a28ca891b73b0e46a1dc706584fa6a7746c72
   ```
4. Save

### 3. Configure MCP Client Tool

The node is pre-configured with:
- **Endpoint**: `https://agx-demo-composio-mcp-production.up.railway.app/mcp`
- **Server Transport**: `HTTP (Streamable)`
- **Authentication**: `Bearer Auth`
- **Tools to Include**: `Selected` *(you must pick specific tools — see below)*

Click **List Tools** to see available Composio tools, then select only the ones you need.

> ⚠️ **Token Limit Warning**: Loading ALL tools (~1000+) consumes ~128k tokens and exceeds the model's context window. Always select a small subset (5–20 tools) relevant to your use case.

### 4. Test

1. Open the workflow
2. Click **Chat** (bottom-right corner)
3. Send a message like: "What tools do you have access to?"
4. The agent should respond and list available Composio tools

## Environment Variables

The workflow references these Railway-level variables (set on `agx-demo-composio-mcp`):

| Variable | Value |
|----------|-------|
| `COMPOSIO_API_KEY` | `ak_SfPCPakYY4ZZadH4f0Gg` |
| `COMPOSIO_ENTITY_ID` | `pg-test-d706a027-57a4-4c4f-bbbd-61d919b73f83` |
| `MCP_AUTH_TOKEN` | `dbf563c896989f102cb8d58e7e1a28ca891b73b0e46a1dc706584fa6a7746c72` |
| `COMPOSIO_API_BASE` | `https://backend.composio.dev/api/v3.1` |

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
| **Token limit exceeded** (`maximum context length is 128000 tokens`) | You loaded too many tools. Open MCP Client Tool node → change **Tools to Include** to `Selected` → pick only 5–20 tools |
| OpenRouter errors | Verify OpenRouter API key is valid and has credits at https://openrouter.ai/settings/credits |
| Chat not responding | Ensure workflow is **Active** (toggle in top-right) |
