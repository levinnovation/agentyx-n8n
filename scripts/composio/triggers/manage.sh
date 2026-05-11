#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${COMPOSIO_MCP_BASE_URL:-https://levinnovation.mcp.agentyx.one}"
AUTH_TOKEN="${MCP_AUTH_TOKEN:-}"

usage() {
  cat <<'EOF'
Usage:
  manage.sh list-types [--toolkit TOOLKIT]
  manage.sh ensure-webhook [--url URL]
  manage.sh create --slug TRIGGER_SLUG [--user-id USER_ID] [--account-id CONNECTED_ACCOUNT_ID] [--config JSON]
  manage.sh list [--user-id USER_ID] [--trigger-name TRIGGER_NAME] [--connected-account-id CONNECTED_ACCOUNT_ID]
  manage.sh enable TRIGGER_ID
  manage.sh disable TRIGGER_ID
  manage.sh delete TRIGGER_ID

Environment:
  MCP_AUTH_TOKEN        Required (Bearer token for composio-mcp admin endpoints)
  COMPOSIO_MCP_BASE_URL Optional (default: https://levinnovation.mcp.agentyx.one)
EOF
}

require_auth() {
  if [[ -z "$AUTH_TOKEN" ]]; then
    echo "ERROR: MCP_AUTH_TOKEN is required." >&2
    exit 1
  fi
}

api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  require_auth
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${BASE_URL}${path}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$body"
  else
    curl -sS -X "$method" "${BASE_URL}${path}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}"
  fi
}

cmd="${1:-}"
if [[ -z "$cmd" ]]; then
  usage
  exit 1
fi
shift || true

case "$cmd" in
  list-types)
    toolkit=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --toolkit) toolkit="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [[ -n "$toolkit" ]]; then
      api GET "/triggers/types?toolkit=${toolkit}"
    else
      api GET "/triggers/types"
    fi
    ;;

  ensure-webhook)
    webhook_url="${BASE_URL}/webhooks/composio"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --url) webhook_url="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    api POST "/triggers/webhook-subscription/ensure" "{\"webhook_url\":\"${webhook_url}\",\"enabled_events\":[\"composio.trigger.message\"]}"
    ;;

  create)
    slug=""
    user_id=""
    account_id=""
    config='{}'
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --slug) slug="$2"; shift 2 ;;
        --user-id) user_id="$2"; shift 2 ;;
        --account-id) account_id="$2"; shift 2 ;;
        --config) config="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    if [[ -z "$slug" ]]; then
      echo "ERROR: --slug is required" >&2
      exit 1
    fi
    body='{"trigger_slug":"'"$slug"'","trigger_config":'"$config"'}'
    if [[ -n "$user_id" ]]; then
      body='{"trigger_slug":"'"$slug"'","user_id":"'"$user_id"'","trigger_config":'"$config"'}'
    fi
    if [[ -n "$account_id" ]]; then
      if [[ -n "$user_id" ]]; then
        body='{"trigger_slug":"'"$slug"'","user_id":"'"$user_id"'","connected_account_id":"'"$account_id"'","trigger_config":'"$config"'}'
      else
        body='{"trigger_slug":"'"$slug"'","connected_account_id":"'"$account_id"'","trigger_config":'"$config"'}'
      fi
    fi
    api POST "/triggers/instances" "$body"
    ;;

  list)
    user_id=""
    trigger_name=""
    connected_account_id=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --user-id) user_id="$2"; shift 2 ;;
        --trigger-name) trigger_name="$2"; shift 2 ;;
        --connected-account-id) connected_account_id="$2"; shift 2 ;;
        *) echo "Unknown option: $1" >&2; exit 1 ;;
      esac
    done
    query=""
    [[ -n "$user_id" ]] && query="${query}user_id=${user_id}&"
    [[ -n "$trigger_name" ]] && query="${query}trigger_name=${trigger_name}&"
    [[ -n "$connected_account_id" ]] && query="${query}connected_account_id=${connected_account_id}&"
    if [[ -n "$query" ]]; then
      query="?${query%&}"
    fi
    api GET "/triggers/instances${query}"
    ;;

  enable)
    id="${1:-}"
    [[ -z "$id" ]] && { echo "ERROR: trigger id required" >&2; exit 1; }
    api POST "/triggers/instances/${id}/enable"
    ;;

  disable)
    id="${1:-}"
    [[ -z "$id" ]] && { echo "ERROR: trigger id required" >&2; exit 1; }
    api POST "/triggers/instances/${id}/disable"
    ;;

  delete)
    id="${1:-}"
    [[ -z "$id" ]] && { echo "ERROR: trigger id required" >&2; exit 1; }
    api DELETE "/triggers/instances/${id}"
    ;;

  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 1
    ;;
esac
