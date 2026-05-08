# 2026-05-07 — composio-mcp horizontal scaling baseline

## Summary

Scaled `agx-demo-composio-mcp` on Railway to a 3-replica baseline and codified
deploy settings in repo so the existing public URL remains the load-balancer
entry point.

## Files

- `services/composio-mcp/railway.toml` — added deploy replica/health/restart settings.
- `templates/assets/railway-tenant-stack/template-config.json` — added
  `composio-mcp.deploy` defaults with `numReplicas = 3`.
- `services/composio-mcp/README.md` — documented Railway horizontal scaling behavior.
- `knowledge/operations/composio-mcp-n8n-runbook.md` — added scaling procedure and load-balancing notes.
- `knowledge/decisions/0024-composio-mcp-horizontal-scaling.md` — ADR for this decision.

## Operational notes

- Applied in `client-levinnovation-agentyx` production via `railway up` from
  `services/composio-mcp`.
- Confirmed service at `3` configured and `3` running replicas in `us-west2`.
- Validated `/healthz` and MCP traffic distribution across three deployment
  instance IDs in Railway HTTP logs.
