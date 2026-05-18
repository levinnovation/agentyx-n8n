#!/usr/bin/env bash
# deploy-all.sh - Deploy Recall.ai Bot Orchestrator & Webhook Receiver to GCP Cloud Run
# Run this on your local machine where `gcloud auth login` succeeded.
set -euo pipefail

PROJECT_ID="agentyx-493918"
REGION="us-east4"
SA="recallai-bot-runner@${PROJECT_ID}.iam.gserviceaccount.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==============================================="
echo "Recall.ai Sofer Bot - Full GCP Deploy"
echo "Project: ${PROJECT_ID}"
echo "Region:  ${REGION}"
echo "==============================================="
echo ""

# Ensure correct project
gcloud config set project "${PROJECT_ID}"

# 1. Enable APIs
echo "[1/7] Enabling GCP APIs..."
gcloud services enable secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com --project="${PROJECT_ID}"

# 2. Create service account
echo "[2/7] Creating service account..."
gcloud iam service-accounts create recallai-bot-runner \
  --display-name="Recall.ai Bot Orchestrator" \
  --project="${PROJECT_ID}" 2>/dev/null || echo "Service account already exists, continuing..."

# 3. Store secrets (skip if they exist)
echo "[3/7] Ensuring secrets exist in Secret Manager..."
ensure_secret() {
  local name=$1
  local value=$2
  if gcloud secrets versions list "${name}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "  Secret ${name} already exists, skipping creation."
  else
    echo -n "${value}" | gcloud secrets create "${name}" --data-file=- --project="${PROJECT_ID}"
    echo "  Secret ${name} created."
  fi
}

# NOTE: If secrets don't exist, the user must create them manually first:
# gcloud secrets create recall-api-key --data-file=<(echo -n "YOUR_KEY")
# gcloud secrets create recall-webhook-secret --data-file=<(echo -n "YOUR_SECRET")
# gcloud secrets create recall-sso-private-key --data-file=path/to/key.pem
# gcloud secrets create recall-sso-cert --data-file=path/to/cert.pem

for SECRET in recall-api-key recall-webhook-secret recall-sso-private-key recall-sso-cert; do
  if gcloud secrets describe "${SECRET}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo "  Secret ${SECRET}: OK"
  else
    echo "  ⚠️  Secret ${SECRET} NOT FOUND. Create it first:"
    echo "      gcloud secrets create ${SECRET} --data-file=<(echo -n 'YOUR_VALUE') --project=${PROJECT_ID}"
  fi
done

# 4. Grant IAM access
echo "[4/7] Granting Secret Manager access to service account..."
for SECRET in recall-api-key recall-webhook-secret recall-sso-private-key recall-sso-cert; do
  gcloud secrets add-iam-policy-binding "${SECRET}" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}" 2>/dev/null || true
done

# 5. Deploy Orchestrator
echo "[5/7] Building & deploying Bot Orchestrator..."
ORCH_IMAGE="gcr.io/${PROJECT_ID}/recallai-bot-orchestrator:latest"
cd "${SCRIPT_DIR}/services/orchestrator"
gcloud builds submit --tag "${ORCH_IMAGE}" --project="${PROJECT_ID}"

gcloud run deploy recallai-bot-orchestrator \
  --image="${ORCH_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --service-account="${SA}" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},REGION=${REGION}" \
  --project="${PROJECT_ID}"

ORCH_URL=$(gcloud run services describe recallai-bot-orchestrator \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

# 6. Deploy Webhook Receiver
echo "[6/7] Building & deploying Webhook Receiver..."
RCVR_IMAGE="gcr.io/${PROJECT_ID}/recallai-webhook-receiver:latest"
cd "${SCRIPT_DIR}/services/webhook-receiver"
gcloud builds submit --tag "${RCVR_IMAGE}" --project="${PROJECT_ID}"

gcloud run deploy recallai-webhook-receiver \
  --image="${RCVR_IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --service-account="${SA}" \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},REGION=${REGION},MEETINGS_AGENT_CORE_URL=https://levinnovation.n8n.agentyx.one/webhook/sofer-transcript" \
  --project="${PROJECT_ID}"

RCVR_URL=$(gcloud run services describe recallai-webhook-receiver \
  --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')

# 7. Summary
echo ""
echo "==============================================="
echo "🎉 DEPLOYMENT COMPLETE"
echo "==============================================="
echo ""
echo "Bot Orchestrator:     ${ORCH_URL}"
echo "  Health:             ${ORCH_URL}/health"
echo "  Create Bot:         POST ${ORCH_URL}/bot/create"
echo ""
echo "Webhook Receiver:     ${RCVR_URL}"
echo "  Health:             ${RCVR_URL}/health"
echo "  Webhook Endpoint:   POST ${RCVR_URL}/webhook/recallai"
echo ""
echo "NEXT STEPS:"
echo "1. Go to Recall.ai Dashboard → Webhooks"
echo "2. Register these URLs:"
echo "   URL: ${RCVR_URL}/webhook/recallai"
echo "   Events: bot.status_change, bot.transcript_completed"
echo ""
echo "3. Test the orchestrator:"
echo "   curl -X POST ${ORCH_URL}/bot/create \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"meeting_url\":\"https://meet.google.com/xxx\",\"google_login_group_id\":\"YOUR_GROUP_ID\"}'"
echo ""
