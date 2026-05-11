# Channel Adapter: Kapso WhatsApp Personal Assistant

Adapter workflow for Kapso WhatsApp inbound events for number `+1 (201) 534-7251`.

## Endpoint

- n8n webhook path: `kapso/personal-assistant`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/kapso/personal-assistant`

## Security

- Requires `X-Auth-Proxy-Secret` to match `N8N_AUTH_TRUSTED_PROXY_SECRET`.
- Keep this endpoint behind auth-proxy only.

## Runtime variables

- `N8N_AUTH_TRUSTED_PROXY_SECRET`
- `KAPSO_API_KEY`
- `KAPSO_BASE_URL`
- `KAPSO_PHONE_NUMBER_ID`
- `PERSONAL_ASSISTANT_CORE_WORKFLOW_ID`

## Flow

1. Receive Kapso inbound webhook.
2. Normalize message payload to canonical envelope.
3. Execute `personal-assistant-core`.
4. Send WhatsApp text reply via Kapso outbound API.
