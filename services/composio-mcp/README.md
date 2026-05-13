# Composio MCP HTTP server

Production MCP server exposing [Composio](https://composio.dev) tools over **Streamable HTTP** for n8n **MCP Client Tool** nodes (and other MCP clients).

## Features

- Dynamic tool discovery via `GET {COMPOSIO_API_BASE}/tools` (pagination + optional toolkit filters).
- Tool execution via `POST {COMPOSIO_API_BASE}/tools/execute/{slug}` with retries on 429/5xx.
- Bearer auth on `/mcp` (`MCP_AUTH_TOKEN`).
- `GET /accounts` debug endpoint (auth required) to inspect connected account visibility.
- `GET /healthz` for load balancers (no auth).
- Structured JSON logs with `correlationId` (from `X-Request-Id` or generated).

## Local run

```bash
cp .env.example .env
# edit .env — set COMPOSIO_API_KEY and MCP_AUTH_TOKEN
export $(grep -v '^#' .env | xargs)
npm install
npm run build
npm start
```

## Docker

```bash
docker build -t composio-mcp:local .
docker run --rm -p 3000:3000 \
  -e COMPOSIO_API_KEY="$COMPOSIO_API_KEY" \
  -e MCP_AUTH_TOKEN="$MCP_AUTH_TOKEN" \
  -e COMPOSIO_ENTITY_ID="$COMPOSIO_ENTITY_ID" \
  composio-mcp:local
```

## Railway

1. Create a service from repo `levinnovation/agentyx-vertical-assets` with **Root Directory** `services/composio-mcp` and **Dockerfile** build.
2. Set variables from [`.env.example`](./.env.example).
3. Deploy and note the public HTTPS URL.

### Horizontal scaling (Railway)

- `services/composio-mcp/railway.toml` sets `numReplicas = 3` as the baseline.
- Railway's edge proxy keeps the same public service URL and load balances requests round-robin across healthy replicas.
- Each replica keeps its own in-memory cache (tool catalog and connected accounts), refreshed lazily with a 5-minute TTL.
- Keep n8n endpoint unchanged: `https://<your-service-host>/mcp`.

### n8n MCP Client Tool

| Field | Value |
|--------|--------|
| Endpoint | `https://<your-service-host>/mcp` |
| Server Transport | Streamable HTTP |
| Authentication | Bearer Token |
| Token | Same as `MCP_AUTH_TOKEN` |

### Account selection precedence

When executing tools, the server selects `connected_account_id` in this order:

1. `x-connected-account-id` request header.
2. Best connected account for the tool toolkit and entity (server-side auto-pick).
3. `COMPOSIO_CONNECTED_ACCOUNT_ID` environment variable fallback.
4. No account id (Composio default behavior).

Optional per-request headers on `/mcp`:

- `x-entity-id` to override the execution user/entity.
- `x-connected-account-id` to force a specific connected account.
- `x-user-prompt` to pass the latest user request for prompt-aware tool ranking.
- `x-allowed-toolkits` (CSV) to enforce server-side toolkit filtering for list/search surfaces.
- `x-compressed-tools` (`1|true|yes`) to enable compressed MCP tool exposure.
- `x-tool-verbosity` (`none|minimal|brief`) to control compressed tool schema verbosity.

### Prompt-inferred tools + meta-tools

When no explicit allowlists are set (`COMPOSIO_ALLOWED_TOOLKITS` and `COMPOSIO_ALLOWED_ACTIONS` are empty), the server can infer relevant tools per request:

1. `tools/list` uses `x-user-prompt` (or JSON-RPC `params._meta.userPrompt`) to rank tools by relevance.
2. If prompt inference is unavailable, smart default curation is used.
3. The server prepends synthetic discovery tools:
   - `composio_search_tools`
   - `composio_execute_tool`

When compressed mode is enabled (`x-compressed-tools`), the server also exposes:

- `composio_list_tools` (compact discovery list)
- `composio_get_tool_schema` (on-demand full schema for one slug)

This allows the LLM to discover and execute tools dynamically in-session without restarting MCP sessions.

`composio_search_tools` behavior:

- First uses local ranked catalog search.
- If local results miss specific intent terms (for example, query contains `gmail` but local results do not), it falls back to Composio planner search and maps returned slugs back to local schemas.
- Controlled by `COMPOSIO_SEARCH_PLANNER_FALLBACK` (default `true`).

### Auto-create connected accounts

Auto-creation is opt-in with:

- `COMPOSIO_AUTO_CONNECT_TOOLKITS` (CSV toolkit allowlist, e.g. `gmail,slack`)

When this allowlist is non-empty, two extra meta-tools are exposed:

- `composio_initiate_connection`:
  - OAuth toolkits return `redirect_url` for user approval.
  - API-key toolkits accept `credentials` object and create immediately.
- `composio_check_connection`: checks a connected account status.

Execution fallback:

- If a tool call fails due to missing connection and toolkit is allowlisted, the server returns structured `missing_connection` guidance with `redirect_url` when available.

Guardrails:

- Feature is disabled by default (empty allowlist).
- Logs never include credential values (only credential key names).
- API-key creation is only via explicit `composio_initiate_connection` calls.

Debug connected-account visibility with:

```bash
curl -sS https://<your-service-host>/accounts \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>"
```

If `railway add` returns **Unauthorized**, run `railway login` again and rotate tokens that were exposed in shared logs.

## Security

- Rotate any API keys that appeared in chat or CI logs.
- Prefer `COMPOSIO_ALLOWED_TOOLKITS` / `COMPOSIO_ALLOWED_ACTIONS` in production to limit blast radius.
