# Prompt log: 2026-05-07 — Composio MCP bridge for n8n

**Tool:** cursor  
**Date:** 2026-05-07  

## Goal

Implement a production-ready Composio MCP server (Streamable HTTP + dynamic tool discovery), register it in the Railway tenant stack template, add LEV Innovation integration metadata, and document n8n MCP Client Tool wiring.

## Context files read

- `AGENTS.md`, `CONSTITUTION.md` (implicit via workspace rules)
- `tenants/euromobilia/assets/agents/quotation-assistant/app/tools/composio.py`
- `templates/assets/railway-tenant-stack/template-config.json`, `railway.toml`

## Outcome

- New service: `services/composio-mcp/` (TypeScript, Dockerfile, tests, README, `.env.example`)
- Template + `railway.toml` entries for `composio-mcp`
- `tenants/levinnovation/assets/integrations/composio-mcp/` (`asset.yaml`, `README.md`)
- Knowledge: runbook, security preflight, change log; `knowledge/INDEX.md` regenerated
- Local `npm test` passes; Docker/Railway `add` blocked on environment (daemon / CLI unauthorized)

## Follow-ups

- Create Railway service `agx-demo-composio-mcp` (or template deploy) with root directory `services/composio-mcp`; set `COMPOSIO_*` and `MCP_AUTH_TOKEN`.
- Run `railway login` if CLI reports Unauthorized on `railway add`.
- Validate n8n MCP Client Tool against live `/mcp` after deploy.

## Original prompt

Stored in chat; summarized above.
