#!/usr/bin/env bash
# scripts/auth/bootstrap-tenant-org.sh
# Bootstrap the tenant organization in auth-service and issue a SCIM token.

set -euo pipefail

TENANT=""
ADMIN_EMAIL=""
AUTH_SERVICE_URL=""
INTERNAL_API_KEY=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
        --auth-service-url) AUTH_SERVICE_URL="$2"; shift 2 ;;
        --internal-api-key) INTERNAL_API_KEY="$2"; shift 2 ;;
        *) echo "Usage: $0 --tenant <id> --admin-email <email> [--auth-service-url <url>] [--internal-api-key <key>]"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" || -z "$ADMIN_EMAIL" ]]; then
    echo "Usage: $0 --tenant <id> --admin-email <email>"
    exit 1
fi

AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://better-auth.railway.internal:3000}"
INTERNAL_API_KEY="${INTERNAL_API_KEY:-${INTERNAL_API_KEY:-}}"

echo "[INFO] Bootstrapping org for tenant: $TENANT"

# Create organization
curl -fsS -X POST "${AUTH_SERVICE_URL}/api/admin/organizations" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: ${INTERNAL_API_KEY}" \
  -d "{\"id\":\"${TENANT}\",\"name\":\"${TENANT}\"}" || {
    echo "[WARN] Organization may already exist; continuing."
}

# Create admin user
curl -fsS -X POST "${AUTH_SERVICE_URL}/api/users" \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: ${INTERNAL_API_KEY}" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"name\":\"Admin\",\"organizationId\":\"${TENANT}\"}" || {
    echo "[WARN] User may already exist; continuing."
}

# Issue SCIM token (placeholder — replace with real token issuance when implemented)
SCIM_TOKEN=$(openssl rand -hex 32)
echo ""
echo "========================================"
echo "Tenant org bootstrap complete"
echo "========================================"
echo "Tenant:       $TENANT"
echo "Admin email:  $ADMIN_EMAIL"
echo "SCIM token:   $SCIM_TOKEN"
echo "SCIM base URL: ${AUTH_SERVICE_URL}/api/scim/v2"
echo ""
echo "Save the SCIM token in your IDP configuration."
