# Channel Adapter: Kapso WhatsApp Customer Service

Adapter workflow for Kapso WhatsApp inbound events for number `+1 (201) 534-7251`.

## Endpoint

- n8n webhook path: `kapso/customer-service`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/kapso/customer-service`

## Security

- Requires `X-Auth-Proxy-Secret` to match `N8N_AUTH_TRUSTED_PROXY_SECRET`.
- Keep this endpoint behind auth-proxy only.

## Supported message types

- Text
- Image (with caption)
- Document (PDF, etc.)
- Voice messages
- Audio files

## Flow

1. Receive Kapso inbound webhook.
2. Normalize message payload to canonical envelope.
3. Execute `customer-service-core`.
4. Send WhatsApp text reply via Kapso outbound API.

## Required environment variables

- `N8N_AUTH_TRUSTED_PROXY_SECRET`
- `KAPSO_API_KEY`
- `KAPSO_BASE_URL`
- `KAPSO_PHONE_NUMBER_ID`
- `CUSTOMER_SERVICE_CORE_WORKFLOW_ID`

## Setup

After importing into n8n:
1. Update the `CUSTOMER_SERVICE_CORE_ID` placeholder in `Validate + Normalize` node.
2. Configure Kapso webhook to point to this endpoint.
3. Activate the workflow.
