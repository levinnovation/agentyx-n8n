# n8n MCP Integration

## What

[n8n-mcp](https://github.com/czlonkowski/n8n-mcp) (Model Context Protocol) lets AI assistants
(Claude, Cursor, etc.) discover n8n nodes, validate configs, and generate workflow JSON
via natural language — "vibe coding" for n8n flows.

## Architecture

```
AI Assistant (Cursor/Claude)
    ↓ MCP stdio/http
n8n-mcp server
    ↓ REST API
n8n instance (Railway)
    ↓ reads/writes
Git-repo workflow JSON (source of truth)
```

## Setup

### 1. Local IDE (Cursor)

Copy `.cursor/mcp.json` from this repo to your Cursor workspace:

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://your-n8n-instance.com/api/v1",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

Restart Cursor. The AI can now:
- `search_nodes` — find n8n nodes by keyword
- `get_node` — get node properties and examples
- `validate_node` — check config before building
- `validate_workflow` — validate complete workflow JSON
- `n8n_create_workflow` — deploy to n8n for testing

### 2. Git-First Workflow

```
1. Developer: "Create a webhook → Slack notification workflow"
2. AI (via MCP): discovers nodes → validates configs → generates JSON
3. AI: writes to tenants/euromobilia/assets/workflows/n8n/my-workflow.json
4. Developer: make validate → git commit → PR
5. CI: imports to dev n8n → tests → merge
6. CD: imports to prod n8n
```

### 3. Railway Service (optional, team shared)

Add to `railway.toml`:

```toml
[n8n-mcp]
image = "ghcr.io/czlonkowski/n8n-mcp:latest"
startCommand = "node dist/mcp/index.js --http"

[n8n-mcp.variables]
N8N_API_URL = "http://n8n.railway.internal:5678/api/v1"
N8N_API_KEY = "${N8N_API_KEY}"
MCP_MODE = "http"
PORT = "3000"
AUTH_TOKEN = "${N8N_MCP_AUTH_TOKEN}"
```

## Security

- **NEVER** edit production workflows directly with AI
- Always make a copy before AI-assisted edits
- Test in dev environment first
- Export backups before deploying

## References

- [n8n-mcp GitHub](https://github.com/czlonkowski/n8n-mcp)
- [n8n MCP Self-Hosting Guide](https://github.com/czlonkowski/n8n-mcp/blob/main/docs/SELF_HOSTING.md)
