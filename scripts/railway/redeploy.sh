#!/usr/bin/env bash
# scripts/railway/redeploy.sh
# Fast restart without rebuilding.

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

echo "[INFO] Redeploying service: $SERVICE"
rw redeploy --service "$SERVICE" --yes
