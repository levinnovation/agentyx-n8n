# 2026-05-07 — Composio MCP smart account selection

## Summary

Updated `services/composio-mcp` to fix Composio v3.1 connected-account parsing,
add ranked connected-account selection per toolkit, support per-request account
overrides, and expose an authenticated `/accounts` debug endpoint.

## Files

- `services/composio-mcp/src/composio.ts` — v3.1 parsing, connected account
  registry, execution precedence, debug summary API
- `services/composio-mcp/src/server.ts` — singleton client, MCP header
  pass-through, `/accounts` endpoint
- `services/composio-mcp/src/composio.test.ts` — parser, precedence, ranking
  tests
- `services/composio-mcp/.env.example` — header + fallback account docs
- `services/composio-mcp/README.md` — account selection and `/accounts` usage
- `knowledge/operations/composio-mcp-n8n-runbook.md` — operator verification
  and troubleshooting update
- `tenants/levinnovation/assets/workflows/n8n/personal-assistant/README.md` —
  n8n header usage guidance

## Operational notes

- Use `GET /accounts` with MCP Bearer auth to validate account visibility:
  `curl -sS https://<host>/accounts -H "Authorization: Bearer <token>"`.
- For deterministic execution in n8n, set `x-connected-account-id` on MCP
  requests.
