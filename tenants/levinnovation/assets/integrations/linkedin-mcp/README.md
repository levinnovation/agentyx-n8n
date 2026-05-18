# LinkedIn MCP Integration (Levinnovation)

MCP server for LinkedIn profile search. Replaces paid RapidAPI dependency in the prospector workflow.

**Search backends (in priority order):**
1. Tavily API (when `TAVILY_API_KEY` is set) — most reliable
2. DuckDuckGo HTML — no API key, free
3. Google Search — fallback

**Endpoints:**
- `GET /healthz` — health check
- `POST /api/search` — REST: `{ query, limit }` → `{ data: [...] }`
- `POST /mcp` — MCP protocol for AI agents

**Asset:** `services/linkedin-mcp/`
**Deploy:** `tenants/levinnovation/assets/deploy/railway/services/linkedin-mcp/`
