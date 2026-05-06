#!/usr/bin/env bash
# scripts/railway/configure-tenant-post-deploy.sh
# Configure a freshly-deployed Railway project (from template) for a specific tenant.
# This sets tenant-specific domains, synchronizes shared secrets, and updates
# cross-service references.
#
# Usage:
#   export RAILWAY_TOKEN=<token>
#   bash scripts/railway/configure-tenant-post-deploy.sh --tenant <tenant_slug> [--project-id <id>]
#
# If --project-id is omitted, the script expects the current directory to be linked
# to the newly-created project (e.g. after running `railway init` or `railway link`).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/_lib.sh"

TENANT=""
PROJECT_ID=""
DOMAIN_ROOT="agentyx.one"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant) TENANT="$2"; shift 2 ;;
        --project-id) PROJECT_ID="$2"; shift 2 ;;
        --domain-root) DOMAIN_ROOT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ -z "$TENANT" ]]; then
    echo "Usage: $0 --tenant <tenant_slug> [--project-id <id>] [--domain-root <domain>]"
    exit 1
fi

require_env RAILWAY_TOKEN
check_railway_version

# ─── Link to project if ID provided ──────────────────────────
if [[ -n "$PROJECT_ID" ]]; then
    echo "[INFO] Linking to project: $PROJECT_ID"
    rw link "$PROJECT_ID"
fi

# Verify we're linked
if ! rw status >/dev/null 2>&1; then
    echo "[ERROR] Not linked to any Railway project."
    echo "[ERROR] Either run from a linked directory or pass --project-id."
    exit 1
fi

CURRENT_PROJECT=$(rw status --json 2>/dev/null | jq -r '.name // empty')
CURRENT_PROJECT_ID=$(rw status --json 2>/dev/null | jq -r '.id // empty')
echo "[INFO] Configuring tenant '$TENANT' in project: $CURRENT_PROJECT ($CURRENT_PROJECT_ID)"

# ─── Discover services ───────────────────────────────────────
mapfile -t SERVICES < <(rw status --json 2>/dev/null | jq -r '.services.edges[].node.name')

# Map template service names to actual deployed names
# Railway template deployment may rename services slightly
get_service_name() {
    local canonical="$1"
    for svc in "${SERVICES[@]}"; do
        if [[ "$svc" == "$canonical" || "$svc" == "agx-${TENANT}-${canonical}" || "$svc" == "${TENANT}-${canonical}" ]]; then
            echo "$svc"
            return 0
        fi
    done
    echo ""
}

POSTGRES_SVC=$(get_service_name "Postgres")
MONGO_SVC=$(get_service_name "MongoDB")
BETTER_AUTH_SVC=$(get_service_name "better-auth")
AUTH_PROXY_SVC=$(get_service_name "auth-proxy")
N8N_SVC=$(get_service_name "n8n")
LIBRECHAT_SVC=$(get_service_name "librechat")
PORTAL_SVC=$(get_service_name "portal")
PAPERCLIP_SVC=$(get_service_name "paperclip")
FLOWISE_SVC=$(get_service_name "flowise")
MEILISEARCH_SVC=$(get_service_name "meilisearch")

# ─── Generate shared secrets ─────────────────────────────────
echo ""
echo "[INFO] Generating shared secrets..."
TRUSTED_PROXY_SECRET=$(openssl rand -hex 32)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)

echo "  TRUSTED_PROXY_SECRET  = ${TRUSTED_PROXY_SECRET:0:8}..."
echo "  N8N_ENCRYPTION_KEY    = ${N8N_ENCRYPTION_KEY:0:8}..."

# ─── Helper: set variable on a service ───────────────────────
set_var() {
    local svc="$1"
    local key="$2"
    local value="$3"
    if [[ -z "$svc" ]]; then
        echo "[WARN] Service not found for variable: $key"
        return 0
    fi
    echo "[INFO] Setting $key on $svc"
    rw variables --service "$svc" --set "${key}=${value}" >/dev/null 2>&1 || {
        echo "[WARN] Failed to set $key on $svc"
    }
}

# ─── 1. Configure better-auth ────────────────────────────────
echo ""
echo "[INFO] Configuring better-auth..."
AUTH_DOMAIN="${TENANT}.auth.${DOMAIN_ROOT}"
TRUSTED_ORIGINS="https://${TENANT}.portal.${DOMAIN_ROOT},https://${TENANT}.auth.${DOMAIN_ROOT},https://${TENANT}.chat.${DOMAIN_ROOT},https://${TENANT}.n8n.${DOMAIN_ROOT},https://${TENANT}.flowise.${DOMAIN_ROOT},https://${TENANT}.paperclip.${DOMAIN_ROOT}"

set_var "$BETTER_AUTH_SVC" "BETTER_AUTH_URL" "https://${AUTH_DOMAIN}"
set_var "$BETTER_AUTH_SVC" "BETTER_AUTH_TRUSTED_ORIGINS" "$TRUSTED_ORIGINS"
set_var "$BETTER_AUTH_SVC" "OIDC_ISSUER" "https://${AUTH_DOMAIN}"

# ─── 2. Configure auth-proxy ─────────────────────────────────
echo ""
echo "[INFO] Configuring auth-proxy..."
set_var "$AUTH_PROXY_SVC" "BETTER_AUTH_PUBLIC_HOST" "${TENANT}.auth.${DOMAIN_ROOT}"
set_var "$AUTH_PROXY_SVC" "N8N_PUBLIC_HOST" "${TENANT}.n8n.${DOMAIN_ROOT}"
set_var "$AUTH_PROXY_SVC" "FLOWISE_PUBLIC_HOST" "${TENANT}.flowise.${DOMAIN_ROOT}"
set_var "$AUTH_PROXY_SVC" "PAPERCLIP_PUBLIC_HOST" "${TENANT}.paperclip.${DOMAIN_ROOT}"
set_var "$AUTH_PROXY_SVC" "LIBRECHAT_PUBLIC_HOST" "${TENANT}.chat.${DOMAIN_ROOT}"
set_var "$AUTH_PROXY_SVC" "TRUSTED_PROXY_SECRET" "$TRUSTED_PROXY_SECRET"

# ─── 3. Configure n8n ────────────────────────────────────────
echo ""
echo "[INFO] Configuring n8n..."
set_var "$N8N_SVC" "WEBHOOK_URL" "https://${TENANT}.n8n.${DOMAIN_ROOT}"
set_var "$N8N_SVC" "N8N_ENCRYPTION_KEY" "$N8N_ENCRYPTION_KEY"
set_var "$N8N_SVC" "N8N_AUTH_TRUSTED_PROXY_SECRET" "$TRUSTED_PROXY_SECRET"

# ─── 4. Configure librechat ──────────────────────────────────
echo ""
echo "[INFO] Configuring librechat..."
set_var "$LIBRECHAT_SVC" "LIBRECHAT_AUTH_TRUSTED_PROXY_SECRET" "$TRUSTED_PROXY_SECRET"
set_var "$LIBRECHAT_SVC" "RAG_API_URL" "http://rag-api.railway.internal:8000"

# ─── 5. Configure portal ─────────────────────────────────────
echo ""
echo "[INFO] Configuring portal..."
set_var "$PORTAL_SVC" "AGENTYX_CLIENT_SLUG" "$TENANT"
set_var "$PORTAL_SVC" "BETTER_AUTH_URL" "https://${TENANT}.auth.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "NEXT_PUBLIC_AUTH_URL" "https://${TENANT}.auth.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "NEXT_PUBLIC_BETTER_AUTH_URL" "https://${TENANT}.auth.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "NEXT_PUBLIC_N8N_URL" "https://${TENANT}.n8n.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "NEXT_PUBLIC_FLOWISE_URL" "https://${TENANT}.flowise.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "NEXT_PUBLIC_LIBRECHAT_URL" "https://${TENANT}.chat.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "NEXT_PUBLIC_PAPERCLIP_URL" "https://${TENANT}.paperclip.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "N8N_URL" "https://${TENANT}.n8n.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "FLOWISE_URL" "https://${TENANT}.flowise.${DOMAIN_ROOT}"
set_var "$PORTAL_SVC" "PAPERCLIP_URL" "https://${TENANT}.paperclip.${DOMAIN_ROOT}"

# ─── 6. Configure paperclip ──────────────────────────────────
echo ""
echo "[INFO] Configuring paperclip..."
set_var "$PAPERCLIP_SVC" "PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET" "$TRUSTED_PROXY_SECRET"
set_var "$PAPERCLIP_SVC" "PAPERCLIP_ALLOWED_HOSTNAMES" "paperclip.railway.internal,${TENANT}.paperclip.${DOMAIN_ROOT}"
set_var "$PAPERCLIP_SVC" "BETTER_AUTH_TRUSTED_ORIGINS" "https://${TENANT}.paperclip.${DOMAIN_ROOT},https://${TENANT}.auth.${DOMAIN_ROOT}"

# ─── 7. Configure flowise ────────────────────────────────────
echo ""
echo "[INFO] Configuring flowise..."
set_var "$FLOWISE_SVC" "FLOWISE_AUTH_TRUSTED_PROXY_SECRET" "$TRUSTED_PROXY_SECRET"
set_var "$FLOWISE_SVC" "NEXTAUTH_URL" "https://${TENANT}.flowise.${DOMAIN_ROOT}"

# ─── 8. Add custom domains ───────────────────────────────────
echo ""
echo "[INFO] Adding custom domains..."

add_domain() {
    local svc="$1"
    local domain="$2"
    if [[ -z "$svc" ]]; then
        echo "[WARN] Service not found for domain: $domain"
        return 0
    fi
    echo "[INFO] Adding domain $domain to $svc"
    rw domain --service "$svc" "$domain" 2>/dev/null || echo "[WARN] Domain $domain may already exist or failed"
}

add_domain "$BETTER_AUTH_SVC" "${TENANT}.auth.${DOMAIN_ROOT}"
add_domain "$N8N_SVC" "${TENANT}.n8n.${DOMAIN_ROOT}"
add_domain "$FLOWISE_SVC" "${TENANT}.flowise.${DOMAIN_ROOT}"
add_domain "$PAPERCLIP_SVC" "${TENANT}.paperclip.${DOMAIN_ROOT}"
add_domain "$LIBRECHAT_SVC" "${TENANT}.chat.${DOMAIN_ROOT}"
add_domain "$PORTAL_SVC" "${TENANT}.portal.${DOMAIN_ROOT}"

# ─── 9. Summary ──────────────────────────────────────────────
echo ""
echo "========================================"
echo "Tenant Configuration Complete"
echo "========================================"
echo "Tenant:       $TENANT"
echo "Project:      $CURRENT_PROJECT"
echo "Project ID:   $CURRENT_PROJECT_ID"
echo ""
echo "Domains:"
echo "  https://${TENANT}.auth.${DOMAIN_ROOT}"
echo "  https://${TENANT}.portal.${DOMAIN_ROOT}"
echo "  https://${TENANT}.n8n.${DOMAIN_ROOT}"
echo "  https://${TENANT}.flowise.${DOMAIN_ROOT}"
echo "  https://${TENANT}.paperclip.${DOMAIN_ROOT}"
echo "  https://${TENANT}.chat.${DOMAIN_ROOT}"
echo ""
echo "Next steps:"
echo "  1. Add Google OAuth credentials to better-auth:"
echo "       GOOGLE_OAUTH_CLIENT_ID"
echo "       GOOGLE_OAUTH_CLIENT_SECRET"
echo "  2. Verify DNS records point to Railway"
echo "  3. Add any additional secrets (OpenAI keys, etc.)"
echo "  4. Run Postgres bootstrap migrations if needed"
echo "  5. Deploy services via Railway dashboard or:"
echo "       railway up --service <service>"
echo ""
echo "Dashboard: https://railway.com/project/$CURRENT_PROJECT_ID"
