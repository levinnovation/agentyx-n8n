#!/usr/bin/env bash
# scripts/railway/sync-vars.sh
# Push env vars from the calling environment into Railway services.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
SERVICE=""
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --service) SERVICE="$2"; shift 2 ;;
        --dry-run) DRY_RUN="true"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" ]]; then
    echo "Usage: $0 --tenant <tenant_id> [--service <svc>] [--dry-run]"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

DIR=$(get_tenant_railway_dir "$TENANT")
cd "$DIR"

# Determine which services to sync
if [[ -n "${SERVICE:-}" ]]; then
    SERVICES=("$SERVICE")
else
    mapfile -t SERVICES < <(find services -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)
fi

for svc in "${SERVICES[@]}"; do
    ENV_FILE="services/${svc}/.env.example"
    if [[ ! -f "$ENV_FILE" ]]; then
        echo "[WARN] No .env.example for service $svc; skipping."
        continue
    fi

    echo "[INFO] Syncing variables for service: $svc"
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ -z "$line" || "$line" =~ ^# ]] && continue
        # Extract key
        key="${line%%=*}"
        key="$(echo "$key" | xargs)"
        [[ -z "$key" ]] && continue

        value="${!key:-}"
        if [[ -z "$value" ]]; then
            echo "[ERROR] Variable $key is declared in $ENV_FILE but not set in environment."
            exit 1
        fi

        if [[ "$DRY_RUN" == "true" ]]; then
            echo "[DRY-RUN] railway variables --service $svc --set $key=$value"
        else
            rw variables --service "$svc" --set "${key}=${value}"
        fi
    done < "$ENV_FILE"
done

echo "[INFO] Variable sync complete."
