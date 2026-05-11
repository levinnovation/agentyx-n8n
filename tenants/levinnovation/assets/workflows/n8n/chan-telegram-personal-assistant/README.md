# Channel Adapter: Telegram Personal Assistant

Webhook adapter for Telegram chats.

## Endpoint

- n8n webhook path: `telegram/personal-assistant`
- Full URL: `https://levinnovation.n8n.agentyx.one/webhook/telegram/personal-assistant`

## Security

- Validate `x-telegram-bot-api-secret-token` against `TELEGRAM_WEBHOOK_SECRET`.
- Optionally restrict users with `TELEGRAM_ALLOWED_USER_IDS` (comma-separated Telegram user IDs).

## Runtime variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_USER_IDS`
- `PERSONAL_ASSISTANT_CORE_WORKFLOW_ID`

## Telegram webhook setup

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://levinnovation.n8n.agentyx.one/webhook/telegram/personal-assistant",
    "secret_token":"'"${TELEGRAM_WEBHOOK_SECRET}"'"
  }'
```
