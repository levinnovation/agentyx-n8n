# Channel Adapter: Telegram Customer Service

Webhook adapter for Telegram chats.

## Endpoint

- n8n webhook path: `telegram/customer-service`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/telegram/customer-service`

## Security

- Validate `x-telegram-bot-api-secret-token` against `TELEGRAM_WEBHOOK_SECRET`.
- Optionally restrict users with `TELEGRAM_ALLOWED_USER_IDS`.

## Supported message types

- Text
- Photo (with caption)
- Document
- Voice message

## Flow

1. Receive Telegram webhook update.
2. Normalize to canonical envelope.
3. Execute `customer-service-core`.
4. Reply via Telegram Bot API `sendMessage`.

## Required environment variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_USER_IDS`
- `CUSTOMER_SERVICE_CORE_WORKFLOW_ID`

## Telegram webhook setup

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://levinnovation.n8n.agentyx.one/webhook/telegram/customer-service",
    "secret_token":"'"${TELEGRAM_WEBHOOK_SECRET}"'"
  }'
```

## Setup

After importing into n8n:
1. Update the `CUSTOMER_SERVICE_CORE_ID` placeholder in `Validate + Normalize` node.
2. Run the webhook setup command above.
3. Activate the workflow.
