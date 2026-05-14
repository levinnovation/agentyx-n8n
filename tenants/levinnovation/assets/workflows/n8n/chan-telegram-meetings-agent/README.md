# Channel Adapter: Telegram Meetings Agent (ScribeBot)

Adapter workflow for Telegram inbound events routed to the Sofer meetings agent via t.me/levinnovation_scribebot.

## Endpoint

- n8n webhook path: `telegram/meetings-agent`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/telegram/meetings-agent`

## Telegram Webhook Registration

After importing and activating this workflow, register the webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://levinnovation.n8n.agentyx.one/webhook/telegram/meetings-agent"}'
```

Verify registration:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Security

- The Telegram Bot API sends updates directly to the n8n webhook.
- Consider adding auth-proxy if exposing the webhook publicly.

## Supported message types

- Text (auto-detects meeting URLs for Sofer intake)
- Image (with caption)
- Document
- Voice messages

## Flow

1. Receive Telegram inbound webhook.
2. Normalize message payload to meetings envelope:
   - `trigger_source: telegram`
   - `meeting_id` from chat ID
   - `meeting_url` auto-detected from message text
   - `message` from text/caption
3. Execute `meetings-agent-core` (workflow ID: `yMhnGt1bBWUjBTZ5`).
4. Format Sofer `user_message` as Telegram HTML.
5. Send reply via Telegram Bot API with `parse_mode: HTML`.

## Required environment variables

- `TELEGRAM_MEETINGS_BOT_TOKEN` — Bot token for t.me/levinnovation_scribebot

## Setup

After importing into n8n:
1. Set `TELEGRAM_MEETINGS_BOT_TOKEN` in n8n environment.
2. Register the Telegram webhook (see above).
3. Activate the workflow.
4. Test by sending a message to t.me/levinnovation_scribebot.