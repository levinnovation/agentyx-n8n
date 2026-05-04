#!/usr/bin/env bash
# scripts/railway/deploy-ghcr-images.sh
# Update Railway scratch project services to use GHCR images.
# Run this after build-and-push-images.sh.

set -euo pipefail

SCRATCH_ID="${1:-2321232d-b384-45b3-8f0c-e608ddb688d1}"
ENV_ID="39d89542-b256-4fbd-a64c-fafd78f97364"
ORG="levinnovation"

echo "========================================"
echo "Deploy GHCR Images to Railway"
echo "Scratch: $SCRATCH_ID"
echo "========================================"

# Get OAuth access token from CLI config
ACCESS_TOKEN=""
if [[ -f "$HOME/.railway/config.json" ]]; then
    ACCESS_TOKEN=$(jq -r '.user.accessToken // empty' "$HOME/.railway/config.json")
fi

if [[ -z "$ACCESS_TOKEN" ]]; then
    echo "[ERROR] No Railway access token found. Run: railway login"
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

# Service to GHCR image mapping
# Format: railway_service_name|ghcr_image_name
declare -a SERVICE_IMAGES
SERVICE_IMAGES=(
    "agx-demo-auth|agentyx-auth-service"
    "agx-demo-portal|agentyx-client-portal"
    "agx-demo-librechat|agentyx-librechat"
    "agx-demo-flowise|agentyx-flowise"
    "agx-demo-paperclip|agentyx-paperclip"
)

# Get scratch service IDs
echo ""
echo "[INFO] Getting scratch project services..."
QUERY='"query { project(id: \"'
QUERY+="$SCRATCH_ID"
QUERY+='\") { services { edges { node { name id } } } } }"'

SERVICES_JSON=$(graphql "$QUERY")

# Helper to get service ID
get_svc_id() {
    echo "$SERVICES_JSON" | jq -r --arg name "$1" '.data.project.services.edges[] | select(.node.name == $name) | .node.id // empty'
}

# Update and deploy each service
for entry in "${SERVICE_IMAGES[@]}"; do
    svc_name="${entry%%|*}"
    image_name="${entry##*|}"
    image_tag="ghcr.io/$ORG/$image_name:latest"
    
    SVC_ID=$(get_svc_id "$svc_name")
    
    if [[ -z "$SVC_ID" || "$SVC_ID" == "null" ]]; then
        echo "  [SKIP] $svc_name not found in scratch project"
        continue
    fi
    
    echo ""
    echo "[UPDATE] $svc_name → $image_tag"
    
    UPDATE_QUERY='"mutation { serviceInstanceUpdate(serviceId: \"'
    UPDATE_QUERY+="$SVC_ID"
    UPDATE_QUERY+='\", environmentId: \"'
    UPDATE_QUERY+="$ENV_ID"
    UPDATE_QUERY+='\", input: {source: {image: \"'
    UPDATE_QUERY+="$image_tag"
    UPDATE_QUERY+='\"}}) }"'
    
    RESULT=$(graphql "$UPDATE_QUERY")
    echo "$RESULT" | jq -e '.data.serviceInstanceUpdate' >/dev/null 2>&1 && echo "  [OK] Image updated" || echo "  [WARN] Failed to update image"
    
    echo "[DEPLOY] $svc_name"
    DEPLOY_QUERY='"mutation { serviceInstanceDeploy(serviceId: \"'
    DEPLOY_QUERY+="$SVC_ID"
    DEPLOY_QUERY+='\", environmentId: \"'
    DEPLOY_QUERY+="$ENV_ID"
    DEPLOY_QUERY+='\") }"'
    
    RESULT=$(graphql "$DEPLOY_QUERY")
    echo "$RESULT" | jq -e '.data.serviceInstanceDeploy' >/dev/null 2>&1 && echo "  [OK] Deploy triggered" || echo "  [WARN] Failed to deploy"
done

echo ""
echo "========================================"
echo "GHCR Deploy Complete"
echo "========================================"
echo ""
echo "Check Railway dashboard for deployment status:"
echo "  https://railway.com/project/$SCRATCH_ID"
