# Change Log - 2026-05-08 - Composio triggers via MCP bridge

## Summary

Implemented trigger ingestion and management in `services/composio-mcp`, routed verified events into n8n webhook workflows, and added tenant workflow assets for Gmail / Google Calendar / ClickUp trigger receivers.

## What changed

- Added `services/composio-mcp/src/triggers.ts`:
  - trigger type listing,
  - active trigger instance list/create/enable/disable/delete,
  - webhook subscription list/create/update/secret-rotate helpers,
  - signature verification helper and n8n forwarding helper.
- Extended `services/composio-mcp/src/server.ts` with:
  - `POST /webhooks/composio` (signature verification + fan-out to n8n),
  - `/triggers/types`,
  - `/triggers/instances` + lifecycle routes,
  - `/triggers/webhook-subscription/ensure`.
- Added tests in `services/composio-mcp/src/triggers.test.ts`.
- Added operator CLI script:
  - `scripts/composio/triggers/manage.sh`.
- Added workflow assets under:
  - `tenants/levinnovation/assets/workflows/n8n/composio-gmail-new-message/`,
  - `tenants/levinnovation/assets/workflows/n8n/composio-googlecalendar-event/`,
  - `tenants/levinnovation/assets/workflows/n8n/composio-clickup-task/`.
- Updated service docs:
  - `services/composio-mcp/.env.example`,
  - `services/composio-mcp/README.md`.

## Runtime rollout performed

- Deployed updated `agx-demo-composio-mcp`.
- Ensured Composio webhook subscription for:
  - `https://levinnovation.mcp.agentyx.one/webhooks/composio`,
  - enabled event `composio.trigger.message`.
- Set `agx-demo-composio-mcp` vars:
  - `COMPOSIO_WEBHOOK_SECRET`,
  - `N8N_WEBHOOK_URL_BASE`,
  - `N8N_TRUSTED_PROXY_SECRET`,
  - `COMPOSIO_TRIGGER_FORWARD_UNKNOWN=false`.
- Created active trigger instances:
  - `GMAIL_NEW_GMAIL_MESSAGE`,
  - `GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER`.

## Known limitations observed

- Composio trigger type discovery for ClickUp returned zero trigger types in this project context.
- Creating `CLICKUP_NEW_TASK` returned `TriggerTypeNotFound`.
- ClickUp workflow asset remains versioned and ready; provisioning must resume when Composio exposes supported ClickUp trigger slug(s).
