#!/usr/bin/env bash
# scripts/railway/rollback.sh
# Roll back to the previous successful deployment.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
SERVICE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --service) SERVICE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" || -z "$SERVICE" ]]; then
    echo "Usage: $0 --tenant <tenant_id> --service <svc>"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

DIR=$(get_tenant_railway_dir "$TENANT")
cd "$DIR"

echo "[INFO] Finding previous deployment for service: $SERVICE"
# Get deployments JSON and pick the second one (previous)
DEPLOYMENT_ID=$(rw deployments --service "$SERVICE" --json 2>/dev/null | jq -r '.[1].id // empty')

if [[ -z "$DEPLOYMENT_ID" || "$DEPLOYMENT_ID" == "null" ]]; then
    echo "[ERROR] No previous deployment found for rollback."
    exit 1
fi

echo "[INFO] Rolling back to deployment: $DEPLOYMENT_ID"
rw redeploy --deployment "$DEPLOYMENT_ID" --yes
