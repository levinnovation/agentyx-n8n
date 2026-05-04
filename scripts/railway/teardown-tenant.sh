#!/usr/bin/env bash
# scripts/railway/teardown-tenant.sh
# Decommission a tenant Railway project. Fails closed by default.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
CONFIRM_DESTROY="false"
ALLOW_BROAD_TOKEN="false"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --confirm-destroy) CONFIRM_DESTROY="true"; shift ;;
        --allow-broad-token) ALLOW_BROAD_TOKEN="true"; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" ]]; then
    echo "Usage: $0 --tenant <tenant_id> [--confirm-destroy] [--allow-broad-token]"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

DIR=$(get_tenant_railway_dir "$TENANT")
cd "$DIR"

# Token scope check (best-effort)
TOKEN_INFO=$(rw whoami --json 2>/dev/null || echo "{}")
IS_PROJECT_TOKEN=$(echo "$TOKEN_INFO" | grep -q '"project"' && echo "true" || echo "false")
if [[ "$IS_PROJECT_TOKEN" != "true" && "$ALLOW_BROAD_TOKEN" != "true" ]]; then
    echo "[ERROR] Detected a broad (non-project-scoped) token."
    echo "        Teardown with a broad token is dangerous. Use --allow-broad-token to override."
    exit 1
fi

if [[ "$CONFIRM_DESTROY" != "true" ]]; then
    echo "[ERROR] Teardown is destructive. Pass --confirm-destroy to proceed."
    exit 1
fi

echo "[WARN] Deleting preview environment..."
rw environment delete preview --yes || true

echo "[WARN] Deleting tenant project..."
rw delete --yes

echo "[INFO] Teardown complete for tenant: $TENANT"
