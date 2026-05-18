#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="agentyx-493918"
REGION="us-east4"
SA="recallai-bot-runner@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== Recall.ai Bot Orchestrator - GCP Deploy Script ==="
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo ""

# 1. Enable APIs (idempotent)
echo "[1/6] Enabling APIs..."
gcloud services enable secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com --project="${PROJECT_ID}"

# 2. Create service account if not exists
echo "[2/6] Ensuring service account..."
gcloud iam service-accounts create recallai-bot-runner --display-name="Recall.ai Bot Orchestrator" --project="${PROJECT_ID}" 2>/dev/null || true

# 3. Grant Secret Manager access at PROJECT level (avoids per-secret permission issues)
echo "[3/6] Granting secret access to service account at project level..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None 2>/dev/null || true

# 4. Build & push container
echo "[4/6] Building container image..."
IMAGE="gcr.io/${PROJECT_ID}/recallai-bot-orchestrator:latest"
gcloud builds submit --tag "${IMAGE}" --project="${PROJECT_ID}"

# 5. Deploy to Cloud Run
echo "[5/6] Deploying to Cloud Run..."
gcloud run deploy recallai-bot-orchestrator \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --service-account="${SA}" \
  --no-allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},REGION=${REGION}" \
  --project="${PROJECT_ID}"

# NOTE: If you need public access, run this manually after deploy:
# gcloud run services add-iam-policy-binding recallai-bot-orchestrator \
#   --region="${REGION}" --project="${PROJECT_ID}" \
#   --member="allUsers" --role="roles/run.invoker"

# 6. Output URL
echo ""
echo "[6/6] Deployment complete!"
URL=$(gcloud run services describe recallai-bot-orchestrator --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "Orchestrator URL: ${URL}"
echo "Health check:     ${URL}/health"
echo "Create bot:       POST ${URL}/bot/create"
