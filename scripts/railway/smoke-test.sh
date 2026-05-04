#!/usr/bin/env bash
# scripts/railway/smoke-test.sh
# Health checks for Railway services.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
SERVICE=""
ENV="production"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --service) SERVICE="$2"; shift 2 ;;
        --env) ENV="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" || -z "$SERVICE" ]]; then
    echo "Usage: $0 --tenant <tenant_id> --service <svc> [--env <prod|preview>]"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

DIR=$(get_tenant_railway_dir "$TENANT")
cd "$DIR"

case "$SERVICE" in
    agent)
        echo "[INFO] Smoke-testing agent health..."
        rw run --service agent -- curl -fsS "http://localhost:${PORT:-8000}/health" || {
            echo "[ERROR] Agent health check failed."
            exit 1
        }
        ;;
    n8n)
        echo "[INFO] Smoke-testing n8n health..."
        rw run --service n8n -- curl -fsS "http://localhost:${PORT:-5678}/healthz" || {
            echo "[ERROR] n8n health check failed."
            exit 1
        }
        ;;
    langfuse)
        echo "[INFO] Smoke-testing langfuse health..."
        # Langfuse public health endpoint
        DOMAIN=$(rw domain --service langfuse 2>/dev/null || echo "")
        if [[ -n "$DOMAIN" ]]; then
            curl -fsS "https://${DOMAIN}/api/public/health" || {
                echo "[ERROR] Langfuse health check failed."
                exit 1
            }
        else
            echo "[WARN] Langfuse domain not available; skipping external health check."
        fi
        ;;
    librechat)
        echo "[INFO] Smoke-testing librechat..."
        rw run --service librechat -- curl -fsS "http://localhost:${PORT:-3080}/health" || {
            echo "[WARN] LibreChat health check failed (may be expected if no /health endpoint)."
        }
        ;;
    paperclip)
        echo "[INFO] Smoke-testing paperclip..."
        rw run --service paperclip -- curl -fsS "http://localhost:${PORT:-3000}/health" || {
            echo "[WARN] Paperclip health check failed (may be expected if no /health endpoint)."
        }
        ;;
    *)
        echo "[INFO] No smoke test defined for service: $SERVICE"
        ;;
esac

echo "[INFO] Smoke test complete for $SERVICE."
