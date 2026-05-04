#!/usr/bin/env bash
# scripts/railway/deploy-service.sh
# Per-service deploy used by CI.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
SERVICE=""
IMAGE=""
ENV="production"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --service) SERVICE="$2"; shift 2 ;;
        --image) IMAGE="$2"; shift 2 ;;
        --env) ENV="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" || -z "$SERVICE" ]]; then
    echo "Usage: $0 --tenant <tenant_id> --service <svc> [--image <ref>] [--env <prod|preview>]"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

DIR=$(get_tenant_railway_dir "$TENANT")
cd "$DIR"

echo "[INFO] Deploying service: $SERVICE (env: $ENV)"

# For agent service, update AGENT_IMAGE variable before redeploy
if [[ "$SERVICE" == "agent" && -n "${IMAGE:-}" ]]; then
    echo "[INFO] Setting AGENT_IMAGE=$IMAGE"
    rw variables --service agent --set "AGENT_IMAGE=${IMAGE}"
fi

# Redeploy the service
rw redeploy --service "$SERVICE" --environment "$ENV" --yes

# Poll for health
MAX_ATTEMPTS=30
ATTEMPT=0
while [[ $ATTEMPT -lt $MAX_ATTEMPTS ]]; do
    STATUS=$(rw status --service "$SERVICE" --environment "$ENV" --json 2>/dev/null | grep -oE '"status":"[^"]+"' | head -n1 | cut -d'"' -f4 || echo "unknown")
    echo "[INFO] Deploy status: $STATUS (attempt $((ATTEMPT+1))/$MAX_ATTEMPTS)"
    if [[ "$STATUS" == "SUCCESS" ]]; then
        echo "[INFO] Deploy succeeded."
        break
    fi
    if [[ "$STATUS" == "FAILED" ]]; then
        echo "[ERROR] Deploy failed."
        exit 1
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 10
done

if [[ $ATTEMPT -eq $MAX_ATTEMPTS ]]; then
    echo "[WARN] Deploy status polling timed out; proceeding to smoke test."
fi

# Run smoke test
"${SCRIPT_DIR}/smoke-test.sh" --tenant "$TENANT" --service "$SERVICE" --env "$ENV"
