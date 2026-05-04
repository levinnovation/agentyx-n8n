#!/usr/bin/env bash
# scripts/railway/bootstrap-tenant.sh
# One-time per-tenant Railway project bootstrap.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" ]]; then
    echo "Usage: $0 --tenant <tenant_id>"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

DIR=$(get_tenant_railway_dir "$TENANT")
if [[ ! -f "$DIR/railway.toml" ]]; then
    echo "[ERROR] railway.toml not found at $DIR/railway.toml"
    exit 1
fi

cd "$DIR"

# Login (no-op when RAILWAY_TOKEN is set)
rw login --browserless || true

# Init project if not already linked
if ! rw status >/dev/null 2>&1; then
    echo "[INFO] Creating Railway project for tenant: $TENANT"
    rw init --name "${TENANT}-stack"
else
    echo "[INFO] Project already linked."
fi

# Ensure production environment
if ! rw environment list --json 2>/dev/null | grep -q '"production"'; then
    echo "[INFO] Creating production environment"
    rw environment create production
fi

# Add Postgres plugin
if ! rw status --json 2>/dev/null | grep -qi 'postgres'; then
    echo "[INFO] Adding Postgres plugin"
    rw add --database postgres
else
    echo "[INFO] Postgres already present."
fi

# Parse services from railway.toml
echo "[INFO] Creating services from railway.toml..."
# Simple parsing: extract [service] section names
mapfile -t SERVICES < <(grep -E '^\[([a-z0-9-]+)\]$' railway.toml | sed 's/^\[//;s/\]$//' | grep -v '^build$')

for svc in "${SERVICES[@]}"; do
    # Skip optional flowise if not enabled
    if [[ "$svc" == "flowise" ]]; then
        FLOWISE_ENABLED=$(grep -A1 '^\[flowise\]' railway.toml | grep -i 'enabled' | head -n1 || true)
        if [[ -z "${FLOWISE_ENABLED:-}" ]]; then
            echo "[INFO] Skipping optional service: flowise"
            continue
        fi
    fi

    echo "[INFO] Ensuring service: $svc"
    # Railway CLI does not have a direct "service create" that is idempotent;
    # `railway up --detach` with the service name will create it if missing.
    # We use variables to configure the service after creation.
    rw variables --service "$svc" --set "RAILWAY_SERVICE_NAME=$svc" || true
done

# Sync variables for all services
echo "[INFO] Syncing variables..."
"${SCRIPT_DIR}/sync-vars.sh" --tenant "$TENANT"

# Set domains for public-facing services
echo "[INFO] Ensuring public domains..."
for svc in n8n librechat paperclip langfuse agentyx-portal; do
    if [[ " ${SERVICES[*]} " =~ " ${svc} " ]]; then
        echo "[INFO] Domain for $svc: $(rw domain --service "$svc" 2>/dev/null || echo 'N/A')"
    fi
done

echo "[INFO] Bootstrap complete for tenant: $TENANT"
echo "[INFO] Project ID: $(rw status --json 2>/dev/null | grep -oE '"id":"[^"]+"' | head -n1 | cut -d'"' -f4 || echo 'unknown')"
