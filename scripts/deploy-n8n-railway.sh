#!/bin/bash
# Deploy custom n8n image to Railway
# Usage: ./scripts/deploy-n8n-railway.sh <tenant> <env>

set -euo pipefail

TENANT=${1:-levinnovation}
ENV=${2:-dev}

echo "🚀 Deploying custom n8n image to Railway for tenant: $TENANT (env: $ENV)"

# Build the custom image locally
echo "📦 Building custom n8n image with Agentyx nodes..."
cd "$(dirname "$0")/.."

# Ensure nodes are built
cd services/n8n-node-sdk
npm ci
npm run build
cd ../..

# Prepare custom-nodes directory
rm -rf custom-nodes
mkdir -p custom-nodes/@levinnovation/n8n-nodes-agentyx/dist
cp -r services/n8n-node-sdk/dist/* custom-nodes/@levinnovation/n8n-nodes-agentyx/dist/
cp services/n8n-node-sdk/package.json custom-nodes/@levinnovation/n8n-nodes-agentyx/

# Build Docker image
docker build -f services/n8n-yaml-compiler/Dockerfile.n8n -t ghcr.io/levinnovation/agentyx-n8n:latest .

# Push to GHCR (requires docker login)
echo "📤 Pushing to GHCR..."
docker push ghcr.io/levinnovation/agentyx-n8n:latest

# Deploy to Railway
echo "🚂 Deploying to Railway..."
cd "tenants/$TENANT/assets/deploy/railway"

if [ "$ENV" = "prod" ]; then
    railway up --service n8n-main --environment production
    railway up --service n8n-worker --environment production
    railway up --service n8n-webhook --environment production
else
    railway up --service n8n-main
    railway up --service n8n-worker
    railway up --service n8n-webhook
fi

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Deploy workflows: python scripts/deploy_n8n_workflows.py --tenant $TENANT --all"
echo "2. Verify in n8n UI that Agentyx nodes appear in the node panel"
echo "3. Test the demo workflow: POST /webhook/demo-agentyx-nodes"