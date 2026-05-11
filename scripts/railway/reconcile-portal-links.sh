#!/usr/bin/env bash
# scripts/railway/reconcile-portal-links.sh
# Idempotently enforce tenant-scoped portal/auth URL variables from a slug.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
SERVICE_PORTAL="portal"
SERVICE_AUTH="better-auth"
DOMAIN_ROOT="agentyx.one"
EXPECTED_PORTAL_REPO="${EXPECTED_PORTAL_REPO:-levinnovation/agentyx-client-portal}"
EXPECTED_PORTAL_BRANCH="${EXPECTED_PORTAL_BRANCH:-main}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --portal-service) SERVICE_PORTAL="$2"; shift 2 ;;
        --auth-service) SERVICE_AUTH="$2"; shift 2 ;;
        --domain-root) DOMAIN_ROOT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" ]]; then
    echo "Usage: $0 --tenant <tenant_slug> [--portal-service <name>] [--auth-service <name>] [--domain-root <domain>]"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

AUTH_URL="https://${TENANT}.auth.${DOMAIN_ROOT}"
N8N_URL="https://${TENANT}.n8n.${DOMAIN_ROOT}"
FLOWISE_URL="https://${TENANT}.flowise.${DOMAIN_ROOT}"
LIBRECHAT_URL="https://${TENANT}.chat.${DOMAIN_ROOT}"
PAPERCLIP_URL="https://${TENANT}.paperclip.${DOMAIN_ROOT}"

set_var() {
    local svc="$1"
    local key="$2"
    local value="$3"
    echo "[INFO] Setting ${key} on ${svc}"
    rw variables --service "$svc" --set "${key}=${value}" >/dev/null
}

verify_portal_source() {
    local svc="$1"
    local repo branch

    repo=$(railway service list --json 2>/dev/null | jq -r --arg svc "$svc" '.[] | select(.name == $svc) | .source.repo // ""')
    if [[ -z "$repo" ]]; then
        echo "[ERROR] Could not resolve source repo for service '$svc'."
        exit 1
    fi
    if [[ "$repo" != "$EXPECTED_PORTAL_REPO" ]]; then
        echo "[ERROR] Portal service '$svc' source repo mismatch."
        echo "        expected: $EXPECTED_PORTAL_REPO"
        echo "        actual:   $repo"
        exit 1
    fi

    branch=$(railway deployment list --service "$svc" --limit 1 --json 2>/dev/null | jq -r '.[0].meta.branch // ""')
    if [[ -n "$branch" && "$branch" != "$EXPECTED_PORTAL_BRANCH" ]]; then
        echo "[ERROR] Portal service '$svc' source branch mismatch."
        echo "        expected: $EXPECTED_PORTAL_BRANCH"
        echo "        actual:   $branch"
        exit 1
    fi
    echo "[INFO] Portal source verified: $repo @ ${branch:-unknown}"
}

safe_redeploy() {
    local svc="$1"
    local state
    state=$(railway deployment list --service "$svc" --limit 1 --json 2>/dev/null | jq -r '.[0].status // ""')
    if [[ "$state" == "BUILDING" || "$state" == "DEPLOYING" ]]; then
        echo "[INFO] Skipping redeploy for $svc (current status: $state)"
        return 0
    fi
    if rw redeploy --service "$svc" >/dev/null 2>&1; then
        echo "[INFO] Triggered redeploy for $svc"
    else
        echo "[WARN] Could not redeploy $svc (likely transitional state). Continuing."
    fi
}

echo "[INFO] Reconciling portal links for tenant '${TENANT}'"
verify_portal_source "$SERVICE_PORTAL"
set_var "$SERVICE_PORTAL" "AGENTYX_CLIENT_SLUG" "$TENANT"
set_var "$SERVICE_PORTAL" "BETTER_AUTH_URL" "$AUTH_URL"
set_var "$SERVICE_PORTAL" "NEXT_PUBLIC_AUTH_URL" "$AUTH_URL"
set_var "$SERVICE_PORTAL" "NEXT_PUBLIC_BETTER_AUTH_URL" "$AUTH_URL"
set_var "$SERVICE_PORTAL" "NEXT_PUBLIC_N8N_URL" "$N8N_URL"
set_var "$SERVICE_PORTAL" "NEXT_PUBLIC_FLOWISE_URL" "$FLOWISE_URL"
set_var "$SERVICE_PORTAL" "NEXT_PUBLIC_LIBRECHAT_URL" "$LIBRECHAT_URL"
set_var "$SERVICE_PORTAL" "NEXT_PUBLIC_PAPERCLIP_URL" "$PAPERCLIP_URL"
set_var "$SERVICE_PORTAL" "N8N_URL" "$N8N_URL"
set_var "$SERVICE_PORTAL" "FLOWISE_URL" "$FLOWISE_URL"
set_var "$SERVICE_PORTAL" "PAPERCLIP_URL" "$PAPERCLIP_URL"
set_var "$SERVICE_PORTAL" "LIBRECHAT_URL" "$LIBRECHAT_URL"

echo "[INFO] Reconciling better-auth tenant cookie scope"
set_var "$SERVICE_AUTH" "BETTER_AUTH_URL" "$AUTH_URL"
set_var "$SERVICE_AUTH" "BETTER_AUTH_COOKIE_DOMAIN" ".${TENANT}.${DOMAIN_ROOT}"

echo "[INFO] Done. Triggering explicit rebuilds for deterministic client env uptake."
safe_redeploy "$SERVICE_AUTH"
safe_redeploy "$SERVICE_PORTAL"

echo "[OK] Reconciliation complete for tenant '${TENANT}'."
