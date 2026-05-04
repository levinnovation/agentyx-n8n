#!/usr/bin/env bash
# scripts/railway/replicate-reference-to-scratch.sh
# Replicate services from reference Railway project to scratch project.
# Uses GraphQL API with OAuth tokens from railway login.

set -euo pipefail

REFERENCE_ID="${1:-7d70063b-f1b4-415f-b57a-627d24ba0225}"
SCRATCH_ID="${2:-2321232d-b384-45b3-8f0c-e608ddb688d1}"
ENV_ID="39d89542-b256-4fbd-a64c-fafd78f97364"

echo "========================================"
echo "Railway Project Replication"
echo "Reference: $REFERENCE_ID"
echo "Scratch:   $SCRATCH_ID"
echo "========================================"

# Get OAuth access token from CLI config
ACCESS_TOKEN=""
if [[ -f "$HOME/.railway/config.json" ]]; then
    ACCESS_TOKEN=$(jq -r '.user.accessToken // empty' "$HOME/.railway/config.json")
fi

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "[ERROR] No Railway access token found."
    echo "        Run: railway login"
    exit 1
fi

# GraphQL helper
graphql() {
    local query="$1"
    curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
         -H "Content-Type: application/json" \
         -X POST https://backboard.railway.app/graphql/v2 \
         -d "{\"query\":$query}"
}

# Service images (space-separated: name|image)
SERVICE_IMAGES=(
    "agx-demo-n8n|n8nio/n8n:latest"
    "agx-demo-flowise|flowiseai/flowise:2.2.7"
    "agx-demo-meilisearch|getmeili/meilisearch:v1.9"
    "agx-demo-gateway-2|nginx:alpine"
    "agx-demo-gateway-3|nginx:alpine"
    "Postgres|ghcr.io/railwayapp-templates/postgres-ssl:18"
    "MongoDB|mongo:8.0"
)

NO_IMAGE_SERVICES="agx-demo-auth agx-demo-librechat agx-demo-paperclip agx-demo-portal"

# Step 1: Get scratch service IDs
echo ""
echo "[STEP 1] Getting scratch project service IDs..."

SCRATCH_QUERY='"query { project(id: \"'
SCRATCH_QUERY+="$SCRATCH_ID"
SCRATCH_QUERY+='\") { services { edges { node { name id } } } } }"'

SCRATCH_SERVICES_JSON=$(graphql "$SCRATCH_QUERY")

echo "Services in scratch project:"
echo "$SCRATCH_SERVICES_JSON" | jq -r '.data.project.services.edges[].node.name // empty'

# Helper to get service ID
get_svc_id() {
    echo "$SCRATCH_SERVICES_JSON" | jq -r --arg name "$1" '.data.project.services.edges[] | select(.node.name == $name) | .node.id // empty'
}

# Step 2: Set images and deploy
echo ""
echo "[STEP 2] Setting images and deploying..."

for entry in "${SERVICE_IMAGES[@]}"; do
    svc_name="${entry%%|*}"
    IMAGE="${entry##*|}"
    SVC_ID=$(get_svc_id "$svc_name")
    
    if [[ -z "$SVC_ID" || "$SVC_ID" == "null" ]]; then
        echo "  [SKIP] $svc_name not found in scratch project"
        continue
    fi
    
    echo "  [UPDATE] $svc_name → $IMAGE"
    UPDATE_QUERY='"mutation { serviceInstanceUpdate(serviceId: \"'
    UPDATE_QUERY+="$SVC_ID"
    UPDATE_QUERY+='\", environmentId: \"'
    UPDATE_QUERY+="$ENV_ID"
    UPDATE_QUERY+='\", input: {source: {image: \"'
    UPDATE_QUERY+="$IMAGE"
    UPDATE_QUERY+='\"}}) }"'
    RESULT=$(graphql "$UPDATE_QUERY")
    echo "$RESULT" | jq -e '.data.serviceInstanceUpdate' >/dev/null 2>&1 && echo "    [OK] Image set" || echo "    [WARN] Failed to set image"
    
    echo "  [DEPLOY] $svc_name"
    DEPLOY_QUERY='"mutation { serviceInstanceDeploy(serviceId: \"'
    DEPLOY_QUERY+="$SVC_ID"
    DEPLOY_QUERY+='\", environmentId: \"'
    DEPLOY_QUERY+="$ENV_ID"
    DEPLOY_QUERY+='\") }"'
    RESULT=$(graphql "$DEPLOY_QUERY")
    echo "$RESULT" | jq -e '.data.serviceInstanceDeploy' >/dev/null 2>&1 && echo "    [OK] Deploy triggered" || echo "    [WARN] Failed to deploy"
done

# Step 3: Deploy remaining services (without image changes)
echo ""
echo "[STEP 3] Deploying remaining services..."

for svc_name in $NO_IMAGE_SERVICES; do
    SVC_ID=$(get_svc_id "$svc_name")
    
    if [[ -z "$SVC_ID" || "$SVC_ID" == "null" ]]; then
        echo "  [SKIP] $svc_name not found"
        continue
    fi
    
    echo "  [DEPLOY] $svc_name"
    DEPLOY_QUERY='"mutation { serviceInstanceDeploy(serviceId: \"'
    DEPLOY_QUERY+="$SVC_ID"
    DEPLOY_QUERY+='\", environmentId: \"'
    DEPLOY_QUERY+="$ENV_ID"
    DEPLOY_QUERY+='\") }"'
    RESULT=$(graphql "$DEPLOY_QUERY")
    echo "$RESULT" | jq -e '.data.serviceInstanceDeploy' >/dev/null 2>&1 && echo "    [OK] Deploy triggered" || echo "    [WARN] Failed to deploy"
done

# Step 4: Summary
echo ""
echo "========================================"
echo "Replication Complete"
echo "========================================"
echo ""
echo "Image-based services configured and deployed:"
for entry in "${SERVICE_IMAGES[@]}"; do
    svc_name="${entry%%|*}"
    IMAGE="${entry##*|}"
    echo "  ✓ $svc_name → $IMAGE"
done
echo ""
echo "Other services deployed (configure images/sources manually):"
for svc_name in $NO_IMAGE_SERVICES; do
    echo "  ○ $svc_name"
done
echo ""
echo "========================================"
echo "NEXT STEPS"
echo "========================================"
echo ""
echo "1. Check Railway dashboard for deployment status:"
echo "   https://railway.com/project/$SCRATCH_ID"
echo ""
echo "2. Set environment variables for each service (copy from reference)"
echo ""
echo "3. For services without images, configure source in dashboard:"
echo "   - agx-demo-auth → levinnovation/agentyx-auth-service (repo)"
echo "   - agx-demo-librechat → levinnovation/agentyx-librechat (repo)"
echo "   - agx-demo-paperclip → levinnovation/agentyx-paperclip (repo)"
echo "   - agx-demo-portal → levinnovation/agentyx-client-portal (repo)"
echo ""
echo "4. Run database migrations:"
echo "   cd tenants/euromobilia/assets/deploy/railway/migrations"
echo "   ./migrate.sh \"\$DATABASE_URL\""
echo ""
echo "5. Configure domains for public-facing services"
