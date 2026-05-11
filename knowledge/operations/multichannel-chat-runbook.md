# Runbook: LEV multi-channel chat adapters

## Scope

Operate Telegram, Kapso WhatsApp, and LibreChat adapter workflows for LEV personal assistant.

## n8n workflows

- `Personal Assistant Core (Levinnovation)`
- `Channel Adapter - Telegram Personal Assistant`
- `Channel Adapter - Kapso WA Personal Assistant`
- `Channel Adapter - LibreChat Personal Assistant`

## Required variables

On `agx-demo-n8n` and `agx-demo-n8n-webhook`:

- `PERSONAL_ASSISTANT_CORE_WORKFLOW_ID`
- `N8N_BRIDGE_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_USER_IDS`
- `KAPSO_API_KEY`
- `KAPSO_BASE_URL`
- `KAPSO_PHONE_NUMBER_ID`
- `KAPSO_WEBHOOK_SECRET`

## Telegram setup

1. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`.
2. Register webhook:

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://levinnovation.n8n.agentyx.one/webhook/telegram/personal-assistant\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\"}"
```

3. Send test message from allowed account.

## Kapso setup

1. Configure Kapso inbound webhook URL:
   - `https://levinnovation.n8n.agentyx.one/webhook/kapso/personal-assistant`
2. Ensure auth-proxy trusted secret reaches n8n (`X-Auth-Proxy-Secret`).
3. Set Kapso outbound vars (`KAPSO_API_KEY`, `KAPSO_BASE_URL`, `KAPSO_PHONE_NUMBER_ID`).
4. Send a WhatsApp test message to `+1 (201) 534-7251`.

## Smoke test

Run:

```bash
scripts/n8n/multichannel-smoke.sh
```

Optional environment variables for smoke:

- `N8N_AUTH_TRUSTED_PROXY_SECRET`
- `N8N_BRIDGE_SECRET`
- `N8N_MCP_AUTH_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_CHAT_ID`
