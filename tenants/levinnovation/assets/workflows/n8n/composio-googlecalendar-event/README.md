# Composio Trigger: Google Calendar Event

Receives `GOOGLECALENDAR_EVENT_CREATED` (and compatible event payloads) from `composio-mcp` and exposes normalized event fields.

## Endpoint

- n8n webhook path: `composio/googlecalendar_google_calendar_event_created_trigger`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/composio/googlecalendar_google_calendar_event_created_trigger`

## Flow

1. `Webhook` receives Composio trigger payload.
2. `Trusted Proxy Secret OK?` validates `X-Auth-Proxy-Secret`.
3. `Normalize Trigger Payload` extracts event summary + start time.
4. `Respond Success` acknowledges the event.

## Required environment variable

- `N8N_AUTH_TRUSTED_PROXY_SECRET`

## Notes

- Duplicate this workflow with alternate paths if you enable additional Calendar trigger slugs (for example `GOOGLECALENDAR_EVENT_UPDATED`).
