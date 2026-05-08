#!/usr/bin/env bash
# scripts/railway/bootstrap-client-project.sh
# Bootstrap a new per-client Railway project with the full Agentyx stack.
# Requires: Railway CLI with valid OAuth token, Moshe's account token for API calls.
#
# Usage:
#   export RAILWAY_TOKEN="<moshe-account-token>"
#   export GHCR_USER="<github-user>"
#   export GHCR_TOKEN="<github-pat>"
#   bash scripts/railway/bootstrap-client-project.sh <client-slug> <admin-email>
#
# Example:
#   bash scripts/railway/bootstrap-client-project.sh acme admin@acme.com

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_SLUG="${1:-}"
ADMIN_EMAIL="${2:-}"
RAILWAY_TOKEN="${RAILWAY_TOKEN:-}"
DATABASE_URL="${DATABASE_URL:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"

if [[ -z "$CLIENT_SLUG" || -z "$ADMIN_EMAIL" ]]; then
    echo "Usage: $0 <client-slug> <admin-email>"
    echo ""
    echo "Environment variables (optional but recommended):"
    echo "  RAILWAY_TOKEN              - Railway account token (required)"
    echo "  DATABASE_URL               - Postgres connection string (e.g. postgresql://... )"
    echo "  OPENAI_API_KEY             - OpenAI API key for RAG embeddings"
    echo "  PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET - Shared secret for Paperclip trusted proxy"
    echo "  N8N_ENCRYPTION_KEY         - n8n encryption key (auto-generated if empty)"
    exit 1
fi

if [[ -z "$RAILWAY_TOKEN" ]]; then
    echo "[ERROR] RAILWAY_TOKEN must be set. Use Moshe's account token."
    exit 1
fi

# Generate secrets if not provided
if [[ -z "${N8N_ENCRYPTION_KEY:-}" ]]; then
    N8N_ENCRYPTION_KEY="$(openssl rand -hex 32)"
    echo "[INFO] Generated N8N_ENCRYPTION_KEY"
fi
if [[ -z "${PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET:-}" ]]; then
    PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET="$(openssl rand -hex 32)"
    echo "[INFO] Generated PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET"
fi

PROJECT_NAME="agentyx-${CLIENT_SLUG}-prod"
ORG="levinnovation"
DOMAIN_ROOT="agentyx.one"

# ─── GraphQL helper ──────────────────────────────────────────
graphql() {
    local query="$1"
    curl -s -H "Authorization: Bearer $RAILWAY_TOKEN" \
         -H "Content-Type: application/json" \
         -X POST https://backboard.railway.app/graphql/v2 \
         -d "{\"query\":$query}"
}

# ─── 1. Create project ───────────────────────────────────────
echo ""
echo "========================================"
echo "Bootstrapping: $PROJECT_NAME"
echo "========================================"

echo ""
echo "[1/8] Creating Railway project..."
CREATE_QUERY="{\"query\":\"mutation { projectCreate(input: {name: \\\"$PROJECT_NAME\\\"}) { id name } }\"}"
PROJECT_RESULT=$(graphql "$CREATE_QUERY")
PROJECT_ID=$(echo "$PROJECT_RESULT" | jq -r '.data.projectCreate.id // empty')

if [[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]]; then
    echo "[ERROR] Failed to create project:"
    echo "$PROJECT_RESULT" | jq .
    exit 1
fi

echo "  [OK] Project created: $PROJECT_ID"

# Get default environment
ENV_QUERY="{\"query\":\"query { project(id: \\\"$PROJECT_ID\\\") { environments { edges { node { id name } } } } }\"}"
ENV_RESULT=$(graphql "$ENV_QUERY")
ENV_ID=$(echo "$ENV_RESULT" | jq -r '.data.project.environments.edges[0].node.id // empty')
echo "  [OK] Environment: $ENV_ID"

# ─── 2. Add databases ────────────────────────────────────────
echo ""
echo "[2/8] Adding databases (Postgres, MongoDB, Redis)..."

# Note: Railway plugins (Postgres, MongoDB) must be added via dashboard or CLI.
# The API does not expose plugin creation. This step is manual or uses Railway CLI.
echo "  [WARN] Postgres, MongoDB, and Redis must be added via Railway dashboard"
echo "         or 'railway add' CLI command. Skipping automated DB creation."
echo "         After adding Postgres, run:"
echo "           psql \"\$PGURL\" -f tenants/euromobilia/assets/deploy/railway/migrations/postgres-bootstrap.sql"

# ─── 3. Create services ──────────────────────────────────────
echo ""
echo "[3/8] Creating services..."

create_service() {
    local name="$1"
    local query="{\"query\":\"mutation { serviceCreate(input: {name: \\\"$name\\\", projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\"}) { id } }\"}"
    local result=$(graphql "$query")
    echo "$result" | jq -r '.data.serviceCreate.id // empty'
}

AUTH_SVC=$(create_service "agx-${CLIENT_SLUG}-auth")
PORTAL_SVC=$(create_service "agx-${CLIENT_SLUG}-portal")
N8N_MAIN_SVC=$(create_service "agx-${CLIENT_SLUG}-n8n-main")
N8N_WORKER_SVC=$(create_service "agx-${CLIENT_SLUG}-n8n-worker")
N8N_WEBHOOK_SVC=$(create_service "agx-${CLIENT_SLUG}-n8n-webhook")
FLOWISE_SVC=$(create_service "agx-${CLIENT_SLUG}-flowise")
PAPERCLIP_SVC=$(create_service "agx-${CLIENT_SLUG}-paperclip")
LIBRECHAT_SVC=$(create_service "agx-${CLIENT_SLUG}-librechat")
RAG_SVC=$(create_service "agx-${CLIENT_SLUG}-rag-api")
LANGFUSE_SVC=$(create_service "agx-${CLIENT_SLUG}-langfuse")
AGENT_SVC=$(create_service "agx-${CLIENT_SLUG}-agent")
REDIS_SVC=$(create_service "agx-${CLIENT_SLUG}-redis")

echo "  [OK] Services created"

# ─── 4. Connect repos ────────────────────────────────────────
echo ""
echo "[4/8] Connecting fork repos..."

connect_repo() {
    local svc_id="$1"
    local repo="$2"
    local branch="$3"
    local query="{\"query\":\"mutation { serviceConnect(id: \\\"$svc_id\\\", input: {repo: \\\"$repo\\\", branch: \\\"$branch\\\"}) { id } }\"}"
    graphql "$query" >/dev/null
    echo "  [OK] $repo ($branch)"
}

connect_repo "$AUTH_SVC"     "$ORG/agentyx-auth-service"     "main"
connect_repo "$PORTAL_SVC"   "$ORG/agentyx-client-portal"    "agentyx/main"
connect_repo "$N8N_MAIN_SVC" "$ORG/agentyx-n8n"              "master"
connect_repo "$N8N_WORKER_SVC" "$ORG/agentyx-n8n"            "master"
connect_repo "$N8N_WEBHOOK_SVC" "$ORG/agentyx-n8n"           "master"
connect_repo "$FLOWISE_SVC"  "$ORG/agentyx-flowise"          "agentyx/main"
connect_repo "$PAPERCLIP_SVC" "$ORG/agentyx-paperclip"       "agentyx/main"
connect_repo "$LIBRECHAT_SVC" "$ORG/agentyx-librechat"       "agentyx/main"

# RAG API uses official image, not a repo
RAG_QUERY="{\"query\":\"mutation { serviceInstanceUpdate(serviceId: \\\"$RAG_SVC\\\", environmentId: \\\"$ENV_ID\\\", input: {source: {image: \\\"registry.librechat.ai/danny-avila/librechat-rag-api-dev-lite:latest\\\"}}) }\"}"
graphql "$RAG_QUERY" >/dev/null
echo "  [OK] RAG API (official image)"

# Langfuse uses official image
LANGFUSE_QUERY="{\"query\":\"mutation { serviceInstanceUpdate(serviceId: \\\"$LANGFUSE_SVC\\\", environmentId: \\\"$ENV_ID\\\", input: {source: {image: \\\"ghcr.io/langfuse/langfuse:3.52\\\"}}) }\"}"
graphql "$LANGFUSE_QUERY" >/dev/null
echo "  [OK] Langfuse (official image)"

# ─── 5. Add custom domains ───────────────────────────────────
echo ""
echo "[5/8] Adding custom domains..."

create_domain() {
    local svc_id="$1"
    local domain="$2"
    local port="$3"
    local query="{\"query\":\"mutation { customDomainCreate(input: {domain: \\\"$domain\\\", environmentId: \\\"$ENV_ID\\\", projectId: \\\"$PROJECT_ID\\\", serviceId: \\\"$svc_id\\\", targetPort: $port}) { id } }\"}"
    graphql "$query" >/dev/null
    echo "  [OK] $domain"
}

create_domain "$AUTH_SVC"      "${CLIENT_SLUG}.auth.${DOMAIN_ROOT}"     3000
create_domain "$PORTAL_SVC"   "${CLIENT_SLUG}.portal.${DOMAIN_ROOT}"   3000
create_domain "$FLOWISE_SVC"  "${CLIENT_SLUG}.flowise.${DOMAIN_ROOT}"  3000
create_domain "$N8N_MAIN_SVC" "${CLIENT_SLUG}.n8n.${DOMAIN_ROOT}"      5678
create_domain "$PAPERCLIP_SVC" "${CLIENT_SLUG}.paperclip.${DOMAIN_ROOT}" 3100
create_domain "$LIBRECHAT_SVC" "${CLIENT_SLUG}.chat.${DOMAIN_ROOT}"     3080

# ─── 6. Set environment variables ────────────────────────────
echo ""
echo "[6/8] Setting environment variables..."

upsert_var() {
    local svc_id="$1"
    local name="$2"
    local value="$3"
    local query="{\"query\":\"mutation { variableUpsert(input: {environmentId: \\\"$ENV_ID\\\", name: \\\"$name\\\", projectId: \\\"$PROJECT_ID\\\", serviceId: \\\"$svc_id\\\", value: \\\"$value\\\"}) }\"}"
    graphql "$query" >/dev/null
}

# Auth service
upsert_var "$AUTH_SVC" "CLIENT_SLUG" "$CLIENT_SLUG"
upsert_var "$AUTH_SVC" "COOKIE_DOMAIN" ".$DOMAIN_ROOT"
upsert_var "$AUTH_SVC" "PORTAL_URL" "https://${CLIENT_SLUG}.portal.${DOMAIN_ROOT}"
upsert_var "$AUTH_SVC" "BETTER_AUTH_URL" "https://${CLIENT_SLUG}.auth.${DOMAIN_ROOT}"
upsert_var "$AUTH_SVC" "BETTER_AUTH_TRUSTED_ORIGINS" "https://${CLIENT_SLUG}.portal.${DOMAIN_ROOT},https://${CLIENT_SLUG}.auth.${DOMAIN_ROOT},https://${CLIENT_SLUG}.flowise.${DOMAIN_ROOT},https://${CLIENT_SLUG}.n8n.${DOMAIN_ROOT},https://${CLIENT_SLUG}.paperclip.${DOMAIN_ROOT},https://${CLIENT_SLUG}.chat.${DOMAIN_ROOT}"
upsert_var "$AUTH_SVC" "BACKEND_FLOWISE" "http://agx-${CLIENT_SLUG}-flowise.railway.internal:3000"
upsert_var "$AUTH_SVC" "BACKEND_N8N" "http://agx-${CLIENT_SLUG}-n8n-main.railway.internal:5678"
upsert_var "$AUTH_SVC" "BACKEND_PAPERCLIP" "http://agx-${CLIENT_SLUG}-paperclip.railway.internal:3100"
upsert_var "$AUTH_SVC" "BACKEND_LIBRECHAT" "http://agx-${CLIENT_SLUG}-librechat.railway.internal:3080"
upsert_var "$AUTH_SVC" "PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET" "$PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET"

# Portal
upsert_var "$PORTAL_SVC" "PORT" "8080"
upsert_var "$PORTAL_SVC" "BETTER_AUTH_URL" "http://agx-${CLIENT_SLUG}-auth.railway.internal:3000"

# redis
REDIS_PASSWORD="$(openssl rand -hex 24)"
upsert_var "$REDIS_SVC" "REDIS_PASSWORD" "$REDIS_PASSWORD"

# n8n cluster
for svc in "$N8N_MAIN_SVC" "$N8N_WORKER_SVC" "$N8N_WEBHOOK_SVC"; do
    upsert_var "$svc" "N8N_PORT" "5678"
    upsert_var "$svc" "DB_TYPE" "postgresdb"
    upsert_var "$svc" "DB_POSTGRESDB_DATABASE" "railway"
    upsert_var "$svc" "DB_POSTGRESDB_SCHEMA" "n8n"
    upsert_var "$svc" "N8N_ENCRYPTION_KEY" "$N8N_ENCRYPTION_KEY"
    upsert_var "$svc" "WEBHOOK_URL" "https://${CLIENT_SLUG}.n8n.${DOMAIN_ROOT}"
    upsert_var "$svc" "QUEUE_BULL_REDIS_HOST" "agx-${CLIENT_SLUG}-redis.railway.internal"
    upsert_var "$svc" "QUEUE_BULL_REDIS_PORT" "6379"
    upsert_var "$svc" "QUEUE_BULL_REDIS_PASSWORD" "$REDIS_PASSWORD"
    upsert_var "$svc" "QUEUE_BULL_REDIS_DB" "0"
done
upsert_var "$N8N_MAIN_SVC" "EXECUTIONS_MODE" "queue"
upsert_var "$N8N_MAIN_SVC" "OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS" "true"
upsert_var "$N8N_MAIN_SVC" "N8N_DISABLE_PRODUCTION_MAIN_PROCESS" "true"
upsert_var "$N8N_MAIN_SVC" "N8N_RUNNERS_ENABLED" "true"
upsert_var "$N8N_WORKER_SVC" "EXECUTIONS_MODE" "queue"
upsert_var "$N8N_WORKER_SVC" "N8N_RUNNERS_ENABLED" "true"
upsert_var "$N8N_WORKER_SVC" "N8N_CONCURRENCY_PRODUCTION_LIMIT" "10"
upsert_var "$N8N_WEBHOOK_SVC" "EXECUTIONS_MODE" "queue"
upsert_var "$N8N_WEBHOOK_SVC" "N8N_RUNNERS_ENABLED" "true"

# Flowise
upsert_var "$FLOWISE_SVC" "PORT" "3000"
upsert_var "$FLOWISE_SVC" "DATABASE_PATH" "/root/.flowise"

# Paperclip
upsert_var "$PAPERCLIP_SVC" "PAPERCLIP_PORT" "3100"
upsert_var "$PAPERCLIP_SVC" "PAPERCLIP_AUTH_TRUSTED_PROXY" "true"
upsert_var "$PAPERCLIP_SVC" "PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET" "$PAPERCLIP_AUTH_TRUSTED_PROXY_SECRET"
upsert_var "$PAPERCLIP_SVC" "PAPERCLIP_ALLOWED_HOSTNAMES" "agx-${CLIENT_SLUG}-paperclip.railway.internal,${CLIENT_SLUG}.paperclip.${DOMAIN_ROOT}"
upsert_var "$PAPERCLIP_SVC" "BETTER_AUTH_TRUSTED_ORIGINS" "https://${CLIENT_SLUG}.paperclip.${DOMAIN_ROOT},https://${CLIENT_SLUG}.auth.${DOMAIN_ROOT}"

# LibreChat
upsert_var "$LIBRECHAT_SVC" "HOST" "0.0.0.0"
upsert_var "$LIBRECHAT_SVC" "PORT" "3080"
upsert_var "$LIBRECHAT_SVC" "ENDPOINTS" "custom"
upsert_var "$LIBRECHAT_SVC" "RAG_API_URL" "http://agx-${CLIENT_SLUG}-rag-api.railway.internal:8000"

# RAG API
upsert_var "$RAG_SVC" "RAG_PORT" "8000"
upsert_var "$RAG_SVC" "DB_HOST" "postgres.railway.internal"
upsert_var "$RAG_SVC" "DB_PORT" "5432"
upsert_var "$RAG_SVC" "POSTGRES_DB" "librechat_rag"
upsert_var "$RAG_SVC" "PGVECTOR_CREATE_EXTENSION" "False"
upsert_var "$RAG_SVC" "EMBEDDINGS_PROVIDER" "openai"
upsert_var "$RAG_SVC" "EMBEDDINGS_MODEL" "text-embedding-3-small"
if [[ -n "$OPENAI_API_KEY" ]]; then
    upsert_var "$RAG_SVC" "RAG_OPENAI_API_KEY" "$OPENAI_API_KEY"
fi

# Langfuse
upsert_var "$LANGFUSE_SVC" "PORT" "3000"
upsert_var "$LANGFUSE_SVC" "NEXTAUTH_URL" "https://${CLIENT_SLUG}.langfuse.${DOMAIN_ROOT}"

# Database-dependent variables (only if DATABASE_URL is provided)
if [[ -n "$DATABASE_URL" ]]; then
    upsert_var "$PAPERCLIP_SVC" "PAPERCLIP_DATABASE_URL" "${DATABASE_URL}?schema=paperclip"
    upsert_var "$LANGFUSE_SVC" "DATABASE_URL" "${DATABASE_URL}?schema=langfuse"
    echo "  [OK] Database-dependent variables set"
else
    echo "  [WARN] DATABASE_URL not provided. Skipping PAPERCLIP_DATABASE_URL and LANGFUSE_DATABASE_URL."
    echo "         Set them manually after adding the Postgres plugin."
fi

echo "  [OK] Variables set"

# ─── 7. Deploy all services ──────────────────────────────────
echo ""
echo "[7/8] Deploying services..."

deploy_svc() {
    local svc_id="$1"
    local query="{\"query\":\"mutation { serviceInstanceDeploy(serviceId: \\\"$svc_id\\\", environmentId: \\\"$ENV_ID\\\") }\"}"
    graphql "$query" >/dev/null
}

for svc in "$AUTH_SVC" "$PORTAL_SVC" "$N8N_MAIN_SVC" "$N8N_WORKER_SVC" "$N8N_WEBHOOK_SVC" "$FLOWISE_SVC" "$PAPERCLIP_SVC" "$LIBRECHAT_SVC" "$RAG_SVC" "$LANGFUSE_SVC" "$REDIS_SVC"; do
    deploy_svc "$svc"
done
echo "  [OK] All services deployed"

# ─── 8. Summary ──────────────────────────────────────────────
echo ""
echo "========================================"
echo "Bootstrap Complete"
echo "========================================"
echo ""
echo "Project:     $PROJECT_NAME"
echo "Project ID:  $PROJECT_ID"
echo "Environment: $ENV_ID"
echo ""
echo "Domains:"
echo "  https://${CLIENT_SLUG}.auth.${DOMAIN_ROOT}"
echo "  https://${CLIENT_SLUG}.portal.${DOMAIN_ROOT}"
echo "  https://${CLIENT_SLUG}.flowise.${DOMAIN_ROOT}"
echo "  https://${CLIENT_SLUG}.n8n.${DOMAIN_ROOT}"
echo "  https://${CLIENT_SLUG}.paperclip.${DOMAIN_ROOT}"
echo "  https://${CLIENT_SLUG}.chat.${DOMAIN_ROOT}"
echo ""
echo "Next steps:"
if [[ -z "$DATABASE_URL" ]]; then
    echo "1. Add Postgres plugin via Railway dashboard or 'railway add'"
    echo "2. Re-run this script with DATABASE_URL set to configure DB-dependent variables:"
    echo "     DATABASE_URL=postgresql://... bash $0 $CLIENT_SLUG $ADMIN_EMAIL"
    echo "   Or set PAPERCLIP_DATABASE_URL and LANGFUSE_DATABASE_URL manually."
    echo "3. Add MongoDB plugin for LibreChat"
else
    echo "1. Add MongoDB plugin for LibreChat"
fi
echo "   - Run Postgres bootstrap migrations"
if [[ -z "$OPENAI_API_KEY" ]]; then
    echo "   - Set OPENAI_API_KEY for RAG API embeddings"
fi
echo "   - Verify custom domains in Railway dashboard"
echo "   - Disable Public Networking on backend services (after domains verify)"
echo ""
echo "Dashboard: https://railway.com/project/$PROJECT_ID"
