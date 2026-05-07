# Security preflight: Composio MCP + Railway

Before relying on the Composio MCP bridge in production:

1. **Composio**: rotate `COMPOSIO_API_KEY` if it appeared in chat, issues, or logs; update Railway service variables.
2. **Railway CLI**: if `~/.railway/config.json` (or terminal output) leaked `accessToken` / `refreshToken`, run `railway logout` and `railway login` on affected machines.
3. **MCP_AUTH_TOKEN**: generate a new random secret for production; update n8n MCP Client Tool and Railway together.
4. Confirm no secrets are present in committed workflow JSON or repo docs.
