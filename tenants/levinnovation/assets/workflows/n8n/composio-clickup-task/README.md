# Composio Trigger: ClickUp New Task

Receives `CLICKUP_NEW_TASK` trigger payloads from `composio-mcp` and emits normalized task fields.

## Endpoint

- n8n webhook path: `composio/clickup_new_task`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/composio/clickup_new_task`

## Flow

1. `Webhook` receives Composio trigger payload.
2. `Trusted Proxy Secret OK?` validates `X-Auth-Proxy-Secret`.
3. `Normalize Trigger Payload` extracts task name + status.
4. `Respond Success` returns acknowledgment JSON.

## Required environment variable

- `N8N_AUTH_TRUSTED_PROXY_SECRET`

## Notes

- If your active trigger slug differs (for example `CLICKUP_TASK_UPDATED`), duplicate this workflow with a matching path.
