# Runbook: Composio MCP for n8n AI Agent

## Purpose

The `composio-mcp` service exposes Composio tools over **MCP Streamable HTTP** so n8n **MCP Client Tool** nodes (connected to **AI Agent**) can discover and execute integrations without embedding the Composio API key in workflow JSON.

## Architecture

- **n8n** → Bearer `MCP_AUTH_TOKEN` → **composio-mcp** `/mcp` → Composio REST API (`x-api-key`).
- Health: `GET /healthz` (no auth).

## Deploy (Railway)

1. Service source: GitHub `levinnovation/agentyx-vertical-assets`, root directory `services/composio-mcp`, **Dockerfile** build.
2. Required variables:
   - `COMPOSIO_API_KEY`
   - `MCP_AUTH_TOKEN` (high-entropy secret; used by n8n as Bearer token)
   - `COMPOSIO_ENTITY_ID` (maps to Composio `user_id` on execute; set per tenant)
3. Optional hardening:
   - `COMPOSIO_ALLOWED_TOOLKITS` — comma-separated `toolkit_slug` values
   - `COMPOSIO_ALLOWED_ACTIONS` — comma-separated tool slugs (allowlist for list + execute)

See `services/composio-mcp/.env.example` for tuning variables.

## n8n node configuration

| Parameter | Value |
|-----------|--------|
| Endpoint | `https://<railway-public-host>/mcp` |
| Server Transport | Streamable HTTP |
| Authentication | Bearer Token |
| Token | Railway `MCP_AUTH_TOKEN` |

## Verification

1. `curl -sf https://<host>/healthz` → `{"ok":true,...}`
2. `curl -sS https://<host>/accounts -H "Authorization: Bearer <MCP_AUTH_TOKEN>"` → shows connected accounts by toolkit.
3. From n8n, open MCP Client Tool → run tool list (should show Composio slugs).
4. Execute a read-only tool, then a low-risk write in a test account.

## Logs

Structured JSON logs include:

- `mcp_list_tools`, `mcp_tool_ok`, `mcp_tool_failed`
- `correlationId` (also returned as `X-Request-Id`)

## Failure modes

| Symptom | Checks |
|---------|--------|
| 401 on `/mcp` | Bearer token mismatch; verify `MCP_AUTH_TOKEN` in n8n vs Railway |
| Composio 401/403 | Rotate `COMPOSIO_API_KEY`; confirm project key |
| Empty tool list | Adjust `COMPOSIO_ALLOWED_*`; increase `COMPOSIO_TOOLS_MAX`; check toolkits connected in Composio |
| Execute errors | Set `COMPOSIO_ENTITY_ID` / `COMPOSIO_CONNECTED_ACCOUNT_ID`; verify OAuth connection in Composio dashboard |
| Agent says it cannot send email | Check `/accounts` output for `gmail`; set `x-connected-account-id` in n8n MCP headers; optionally constrain with `COMPOSIO_ALLOWED_TOOLKITS=gmail,...` |

## Security

- Rotate any API keys or Railway tokens exposed in shared chat or terminal output.
- Never commit secrets; use Railway variables only.
