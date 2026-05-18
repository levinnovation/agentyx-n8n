# LinkedIn MCP (Levinnovation)

MCP server that searches LinkedIn profiles via Google/DuckDuckGo (no paid API required).

**Endpoints**
- `GET /healthz` — health check (no auth)
- `POST /api/search` — REST search, returns `{ data: [...] }` consumed by Normalize Leads node
- `POST /mcp` — MCP protocol endpoint for AI agent tool use

**Auth**: Bearer token via `MCP_AUTH_TOKEN` env var

**Public host**: see Railway service for URL
**Pairs with**: `prospector-agent-core` n8n workflow
