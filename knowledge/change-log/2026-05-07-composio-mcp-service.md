# 2026-05-07 — Composio MCP HTTP service

## Summary

Added production-oriented `services/composio-mcp` (Streamable HTTP + Composio v3.1 tools API), registered it in the Railway tenant stack template, and documented LEV Innovation integration metadata plus runbooks.

## Files

- `services/composio-mcp/` — Node service, Dockerfile, tests
- `templates/assets/railway-tenant-stack/template-config.json` — `composio-mcp` service template
- `templates/assets/railway-tenant-stack/railway.toml` — `[composio-mcp]` block
- `tenants/levinnovation/assets/integrations/composio-mcp/` — asset + README
- `knowledge/operations/composio-mcp-n8n-runbook.md`
- `knowledge/operations/composio-mcp-security-preflight.md`

## Operational notes

Railway service must be created with root directory `services/composio-mcp`. If `railway add` fails with **Unauthorized**, re-authenticate with `railway login`.
