# Composio MCP HTTP server

Production MCP server exposing [Composio](https://composio.dev) tools over **Streamable HTTP** for n8n **MCP Client Tool** nodes (and other MCP clients).

## Features

- Dynamic tool discovery via `GET {COMPOSIO_API_BASE}/tools` (pagination + optional toolkit filters).
- Tool execution via `POST {COMPOSIO_API_BASE}/tools/execute/{slug}` with retries on 429/5xx.
- Bearer auth on `/mcp` (`MCP_AUTH_TOKEN`).
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

If `railway add` returns **Unauthorized**, run `railway login` again and rotate tokens that were exposed in shared logs.

## Security

- Rotate any API keys that appeared in chat or CI logs.
- Prefer `COMPOSIO_ALLOWED_TOOLKITS` / `COMPOSIO_ALLOWED_ACTIONS` in production to limit blast radius.
