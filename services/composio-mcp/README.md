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

Debug connected-account visibility with:

```bash
curl -sS https://<your-service-host>/accounts \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>"
```

If `railway add` returns **Unauthorized**, run `railway login` again and rotate tokens that were exposed in shared logs.

## Security

- Rotate any API keys that appeared in chat or CI logs.
- Prefer `COMPOSIO_ALLOWED_TOOLKITS` / `COMPOSIO_ALLOWED_ACTIONS` in production to limit blast radius.
