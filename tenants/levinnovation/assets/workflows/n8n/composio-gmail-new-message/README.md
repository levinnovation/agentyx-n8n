# Composio Trigger: Gmail New Message

Receives `GMAIL_NEW_GMAIL_MESSAGE` trigger payloads from `composio-mcp` and normalizes key fields for downstream automations.

## Endpoint

- n8n webhook path: `composio/gmail_new_gmail_message`
- Full URL (through auth proxy): `https://levinnovation.n8n.agentyx.one/webhook/composio/gmail_new_gmail_message`

## Flow

1. `Webhook` receives Composio V3 event payload.
2. `Trusted Proxy Secret OK?` verifies `X-Auth-Proxy-Secret`.
3. `Normalize Trigger Payload` extracts `trigger_slug`, `user_id`, `trigger_id`, and subject.
4. `Respond Success` returns JSON acknowledgment.

## Required n8n environment variable

- `N8N_AUTH_TRUSTED_PROXY_SECRET`

## Notes

- This workflow is intentionally minimal and safe for first trigger validation.
- Extend after validation with:
  - Execute Workflow call into `personal-assistant`
  - Slack/CRM side effects
  - Idempotency guards by `metadata.log_id` (when present)
