#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="agentyx-493918"
REGION="us-east4"
SA="recallai-bot-runner@${PROJECT_ID}.iam.gserviceaccount.com"

echo "=== Recall.ai Webhook Receiver - GCP Deploy Script ==="
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo ""

# 1. Enable APIs (idempotent)
echo "[1/6] Enabling APIs..."
gcloud services enable secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com --project="${PROJECT_ID}"

# 2. Create service account if not exists
echo "[2/6] Ensuring service account..."
gcloud iam service-accounts create recallai-bot-runner --display-name="Recall.ai Bot Orchestrator" --project="${PROJECT_ID}" 2>/dev/null || true

# 3. Grant Secret Manager access
echo "[3/6] Granting secret access to service account..."
for SECRET in recall-api-key recall-webhook-secret recall-sso-private-key recall-sso-cert; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}" 2>/dev/null || true
done

# 4. Build & push container
echo "[4/6] Building container image..."
IMAGE="gcr.io/${PROJECT_ID}/recallai-webhook-receiver:latest"
gcloud builds submit --tag "${IMAGE}" --project="${PROJECT_ID}"

# 5. Deploy to Cloud Run
echo "[5/6] Deploying to Cloud Run..."
gcloud run deploy recallai-webhook-receiver \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --service-account="${SA}" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},REGION=${REGION},MEETINGS_AGENT_CORE_URL=https://levinnovation.n8n.agentyx.one/webhook/sofer-transcript" \
  --project="${PROJECT_ID}"

# 6. Output URL
echo ""
echo "[6/6] Deployment complete!"
URL=$(gcloud run services describe recallai-webhook-receiver --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "Webhook URL: ${URL}"
echo "Health check: ${URL}/health"
echo "Webhook endpoint: POST ${URL}/webhook/recallai"
echo ""
echo "IMPORTANT: Register this webhook URL in Recall.ai:"
echo "  POST https://us-east-1.recall.ai/api/v1/webhooks/"
echo "  Body: { \"url\": \"${URL}/webhook/recallai\", \"event\": \"bot.status_change\", \"is_active\": true }"
echo "  Body: { \"url\": \"${URL}/webhook/recallai\", \"event\": \"bot.transcript_completed\", \"is_active\": true }"
