#!/usr/bin/env bash
set -euo pipefail

: "${N8N_BASE_URL:=https://levinnovation.n8n.agentyx.one}"
: "${N8N_MCP_URL:=https://agx-demo-n8n-mcp-bridge-production.up.railway.app/mcp}"
: "${N8N_MCP_AUTH_TOKEN:=}"
: "${N8N_BRIDGE_SECRET:=}"
: "${TELEGRAM_BOT_TOKEN:=}"
: "${TELEGRAM_WEBHOOK_SECRET:=}"
: "${TELEGRAM_CHAT_ID:=}"
: "${KAPSO_WEBHOOK_SECRET:=}"
: "${N8N_AUTH_TRUSTED_PROXY_SECRET:=}"

echo "[1/4] LibreChat adapter webhook smoke"
if [[ -z "${N8N_BRIDGE_SECRET}" ]]; then
  echo "  - SKIP: N8N_BRIDGE_SECRET not set"
else
  curl -fsS "${N8N_BASE_URL}/webhook/librechat/personal-assistant" \
    -H "Content-Type: application/json" \
    -H "X-N8N-Bridge-Secret: ${N8N_BRIDGE_SECRET}" \
    -d '{"message":"Smoke from multichannel script","conversation_id":"smoke-conv","user_id":"smoke-user","metadata":{"source":"script"}}' \
    | sed 's/^/  - /'
fi

echo "[2/4] Telegram adapter webhook registration + optional send"
if [[ -z "${TELEGRAM_BOT_TOKEN}" || "${TELEGRAM_BOT_TOKEN}" == "REQUIRED_SET_ME" ]]; then
  echo "  - SKIP: TELEGRAM_BOT_TOKEN missing"
else
  curl -fsS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${N8N_BASE_URL}/webhook/telegram/personal-assistant\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\"}" \
    | sed 's/^/  - /'

  if [[ -n "${TELEGRAM_CHAT_ID}" ]]; then
    curl -fsS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\":\"${TELEGRAM_CHAT_ID}\",\"text\":\"Smoke test from n8n multichannel rollout\"}" \
      | sed 's/^/  - /'
  else
    echo "  - SKIP sendMessage: TELEGRAM_CHAT_ID not set"
  fi
fi

echo "[3/4] Kapso WA adapter webhook smoke"
if [[ -z "${N8N_AUTH_TRUSTED_PROXY_SECRET}" ]]; then
  echo "  - SKIP: N8N_AUTH_TRUSTED_PROXY_SECRET not set"
else
  curl -fsS "${N8N_BASE_URL}/webhook/kapso/personal-assistant" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Proxy-Secret: ${N8N_AUTH_TRUSTED_PROXY_SECRET}" \
    -d '{"conversation":{"id":"smoke-conv","phone_number":"12015347251","contact_name":"Smoke Test"},"message":{"id":"smoke-msg","type":"text","from":"12015347251","text":{"body":"Smoke from Kapso adapter"}}}' \
    | sed 's/^/  - /'
fi

echo "[4/4] n8n MCP bridge tools/list + tool/call"
if [[ -z "${N8N_MCP_AUTH_TOKEN}" ]]; then
  echo "  - SKIP: N8N_MCP_AUTH_TOKEN missing"
else
  curl -fsS "${N8N_MCP_URL}" \
    -H "Authorization: Bearer ${N8N_MCP_AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
    | sed 's/^/  - /'

  curl -fsS "${N8N_MCP_URL}" \
    -H "Authorization: Bearer ${N8N_MCP_AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"personal_assistant_chat","arguments":{"message":"Hola desde smoke","conversation_id":"smoke-conv","user_id":"smoke-user"}}}' \
    | sed 's/^/  - /'
fi

echo "Done."
