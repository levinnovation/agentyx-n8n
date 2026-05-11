# Runbook: Composio triggers -> composio-mcp -> n8n

## Purpose

Operate Composio trigger ingestion and routing into n8n workflows for LEV Innovation.

## Prerequisites

- `agx-demo-composio-mcp` deployed with trigger routes.
- `agx-demo-n8n` webhook routing operational.
- Connected accounts exist for target toolkits and user id (`levinnovation-user-id`).

## Required variables (`agx-demo-composio-mcp`)

- `COMPOSIO_API_KEY`
- `MCP_AUTH_TOKEN`
- `COMPOSIO_WEBHOOK_SECRET`
- `N8N_WEBHOOK_URL_BASE` (example: `https://levinnovation.n8n.agentyx.one/webhook`)
- `N8N_TRUSTED_PROXY_SECRET` (same as n8n `N8N_AUTH_TRUSTED_PROXY_SECRET`)
- Optional: `COMPOSIO_WEBHOOK_TOLERANCE_SEC` (default 300)

## 1) Ensure webhook subscription

```bash
curl -sS -X POST https://levinnovation.mcp.agentyx.one/triggers/webhook-subscription/ensure \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url":"https://levinnovation.mcp.agentyx.one/webhooks/composio","enabled_events":["composio.trigger.message"]}'
```

Response includes `subscription_id` and a fresh `secret`. Store secret in Railway variable `COMPOSIO_WEBHOOK_SECRET`.

## 2) Discover trigger types

```bash
curl -sS "https://levinnovation.mcp.agentyx.one/triggers/types?toolkit=gmail" \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>"
```

Repeat for `googlecalendar` and other toolkits.

## 3) Create active trigger instances

```bash
curl -sS -X POST https://levinnovation.mcp.agentyx.one/triggers/instances \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"trigger_slug":"GMAIL_NEW_GMAIL_MESSAGE","user_id":"levinnovation-user-id"}'
```

```bash
curl -sS -X POST https://levinnovation.mcp.agentyx.one/triggers/instances \
  -H "Authorization: Bearer <MCP_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"trigger_slug":"GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER","user_id":"levinnovation-user-id"}'
```

## 4) Verify forwarding

1. Trigger source event in app (new email / calendar event).
2. Check composio-mcp logs:

```bash
railway logs --service agx-demo-composio-mcp --since 30m --filter "composio_trigger_"
```

3. Confirm n8n execution on corresponding webhook workflow.

## 5) Manage lifecycle

- List active:
  - `GET /triggers/instances`
- Disable:
  - `POST /triggers/instances/{id}/disable`
- Enable:
  - `POST /triggers/instances/{id}/enable`
- Delete:
  - `DELETE /triggers/instances/{id}`

## Troubleshooting

| Symptom | Checks |
|---|---|
| `invalid_signature` on `/webhooks/composio` | Verify webhook secret rotation and `COMPOSIO_WEBHOOK_SECRET` value. |
| 502 forwarding error | Ensure `N8N_WEBHOOK_URL_BASE` path exists and n8n receiver workflow is active. |
| Trigger create `TriggerTypeNotFound` | Re-run `/triggers/types` for toolkit; slug may be unavailable in current Composio catalog/project. |
| Event reaches n8n but workflow rejects | Check `N8N_AUTH_TRUSTED_PROXY_SECRET` equality with `N8N_TRUSTED_PROXY_SECRET`. |

## Polling caveat

Some toolkits use polling triggers (for example Gmail), which can delay event delivery based on Composio polling cadence.
