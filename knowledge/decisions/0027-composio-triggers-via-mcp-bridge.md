# ADR-0027: Composio triggers via composio-mcp bridge to n8n webhooks

**Status:** Accepted  
**Date:** 2026-05-08

## Context

LEV Innovation requires event-driven automations from Composio-connected apps into n8n queue-mode workflows.

Composio delivers trigger events to a single webhook endpoint per project, while n8n workflows are organized by independent webhook paths. The existing `services/composio-mcp` service already centralizes Composio credentials, account selection, and operational auth.

## Decision

1. Extend `services/composio-mcp` with:
   - signature-verified trigger ingress at `POST /webhooks/composio`,
   - trigger admin endpoints under `/triggers/*`,
   - webhook subscription bootstrap endpoint `POST /triggers/webhook-subscription/ensure`.
2. Verify Composio signatures using `COMPOSIO_WEBHOOK_SECRET` and `webhook-id`, `webhook-signature`, `webhook-timestamp` headers.
3. Fan out verified payloads to n8n webhook URLs by trigger slug:
   - target pattern: `${N8N_WEBHOOK_URL_BASE}/composio/<trigger_slug_lowercase>`.
4. Protect n8n ingress with trusted-proxy header:
   - `X-Auth-Proxy-Secret: ${N8N_TRUSTED_PROXY_SECRET}`.
5. Version trigger receiver workflows in tenant assets:
   - `composio-gmail-new-message`,
   - `composio-googlecalendar-event`,
   - `composio-clickup-task` (prepared even when trigger type is unavailable in current toolkit catalog).

## Consequences

### Positive

- Single operational control point for Composio trigger lifecycle and signature verification.
- No secret exposure in n8n workflow JSON.
- Deterministic routing from trigger slug to workflow path.
- Reuses existing MCP auth and observability patterns.

### Negative

- Adds HTTP routing responsibility to `composio-mcp` beyond MCP tool serving.
- Trigger availability remains toolkit-dependent in Composio (for this rollout, ClickUp trigger type discovery returned no supported trigger slugs).

## Operational notes

- `COMPOSIO_WEBHOOK_SECRET` must be rotated and stored as Railway variable.
- n8n workflows validate `N8N_AUTH_TRUSTED_PROXY_SECRET` before processing.
- For polling triggers (such as Gmail), expect delivery lag per Composio polling schedule.
