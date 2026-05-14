# Channel Adapter: Kapso WhatsApp Meetings Agent

Adapter workflow for Kapso WhatsApp inbound events routed to the Sofer meetings agent.

## Endpoint

- n8n webhook path: `kapso/meetings-agent`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/kapso/meetings-agent`

## Security

- Requires `X-Auth-Proxy-Secret` to match `N8N_AUTH_TRUSTED_PROXY_SECRET`.
- Keep this endpoint behind auth-proxy only.

## Supported message types

- Text (auto-detects meeting URLs for Sofer intake)
- Image (with caption)
- Document (PDF, etc.)
- Voice messages
- Audio files

## Flow

1. Receive Kapso inbound webhook.
2. Normalize message payload to meetings envelope:
   - `trigger_source: kapso-wa`
   - `meeting_id` from conversation/phone
   - `meeting_url` parsed from message text when present
   - `message` from text/caption
   - `metadata` with Kapso message/customer fields
3. Execute `meetings-agent-core`.
4. Send Sofer `user_message` reply via Kapso outbound API.

## Required environment variables

- `N8N_AUTH_TRUSTED_PROXY_SECRET`
- `KAPSO_API_KEY`
- `KAPSO_BASE_URL`
- `KAPSO_PHONE_NUMBER_ID`
- `MEETINGS_AGENT_CORE_ID`

## Setup

After importing into n8n:
1. Update the `MEETINGS_AGENT_CORE_ID` placeholder in `Validate + Normalize` node.
2. Configure Kapso webhook for the target WhatsApp number to point to this endpoint.
3. Verify the n8n credentials for Kapso Header Auth.
4. Activate the workflow.
