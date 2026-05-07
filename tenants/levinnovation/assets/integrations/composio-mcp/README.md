# Composio MCP integration (LEV Innovation)

This asset documents the **Composio MCP HTTP bridge** so n8n **AI Agent** flows can call Composio tools via an **MCP Client Tool** node.

## Operator links

- Implementation: [`services/composio-mcp/README.md`](../../../../../services/composio-mcp/README.md)
- Runbook: [`knowledge/operations/composio-mcp-n8n-runbook.md`](../../../../../knowledge/operations/composio-mcp-n8n-runbook.md)

## Quick checklist

1. Deploy the `composio-mcp` Railway service (Dockerfile under `services/composio-mcp`).
2. Set `COMPOSIO_API_KEY`, `COMPOSIO_ENTITY_ID`, and `MCP_AUTH_TOKEN`.
3. In n8n, point MCP Client Tool to `https://<host>/mcp` with Bearer auth.
4. Prefer `COMPOSIO_ALLOWED_TOOLKITS` or `COMPOSIO_ALLOWED_ACTIONS` in production.
