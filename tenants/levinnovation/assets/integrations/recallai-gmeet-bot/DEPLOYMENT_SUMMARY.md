# Recall.ai Google Meet Bot - GCP Deployment Summary

## ✅ Deployed to GCP Cloud Run (Project: agentyx-493918)

### Services

| Service | Status | URL |
|---------|--------|-----|
| **recallai-bot-orchestrator** | ✅ Public & Running | `https://recallai-bot-orchestrator-72608706210.us-east4.run.app` |
| **recallai-webhook-receiver** | ✅ Public & Running | `https://recallai-webhook-receiver-72608706210.us-east4.run.app` |

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/bot/create` | POST | Creates a Recall.ai bot |
| `/webhook/recallai` | POST | Receives Recall.ai webhooks |

### GCP Resources Created

1. **Service Account**: `recallai-bot-runner@agentyx-493918.iam.gserviceaccount.com`
2. **Secrets in Secret Manager** (with versions):
   - `recall-api-key` — Your Recall.ai API key (version 1)
   - `recall-webhook-secret` — Webhook validation secret (version 2)
   - `recall-sso-private-key` — Pre-generated Google Workspace SSO private key
   - `recall-sso-cert` — Pre-generated Google Workspace SSO certificate
3. **IAM**: Service account granted `roles/secretmanager.secretAccessor` at project level
4. **Cloud Run**: Both services deployed with auto-scaling

### Next Steps

1. ✅ IAM public access configured (done by user)
2. ✅ Webhook registered in Recall.ai dashboard (done by user)
3. 📋 Follow `RUNBOOK.md` to set up Google Workspace SSO and Recall.ai login
4. 🧪 Test creating a bot:
   ```bash
   curl -X POST https://recallai-bot-orchestrator-72608706210.us-east4.run.app/bot/create \
     -H 'Content-Type: application/json' \
     -d '{
       "meeting_url": "https://meet.google.com/xxx",
       "google_login_group_id": "YOUR_GROUP_ID"
     }'
   ```

### Files in This Asset

- `services/orchestrator/` — Python FastAPI source + Dockerfile + deploy script
- `services/webhook-receiver/` — Python FastAPI source + Dockerfile + deploy script
- `services/deploy-all.sh` — Unified deployment script
- `RUNBOOK.md` — Step-by-step setup guide with pre-generated SSO certs

---
Generated: 2026-05-18
