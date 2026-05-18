# Recall.ai Google Meet Bot - GCP Deployment Summary

## ✅ Deployed to GCP Cloud Run (Project: agentyx-493918)

### Services

| Service | Status | URL |
|---------|--------|-----|
| **recallai-bot-orchestrator** | ⚠️ Needs public access | `https://recallai-bot-orchestrator-72608706210.us-east4.run.app` |
| **recallai-webhook-receiver** | ✅ Running + Public | `https://recallai-webhook-receiver-72608706210.us-east4.run.app` |

### Action Required

The orchestrator was deployed but the `--allow-unauthenticated` flag did not apply via gcloud CLI in this environment. You need to run this manually on your terminal:

```bash
gcloud run services add-iam-policy-binding recallai-bot-orchestrator \
  --region=us-east4 --project=agentyx-493918 \
  --member="allUsers" --role="roles/run.invoker"
```

Then verify:
```bash
curl https://recallai-bot-orchestrator-72608706210.us-east4.run.app/health
```

### GCP Resources Created

1. **Service Account**: `recallai-bot-runner@agentyx-493918.iam.gserviceaccount.com`
2. **Secrets in Secret Manager**:
   - `recall-api-key` — Your Recall.ai API key
   - `recall-webhook-secret` — Webhook validation secret
   - `recall-sso-private-key` — Pre-generated Google Workspace SSO private key
   - `recall-sso-cert` — Pre-generated Google Workspace SSO certificate
3. **IAM**: Service account granted `roles/secretmanager.secretAccessor` at project level

### Next Steps

1. ✅ Run the gcloud command above to make the orchestrator public
2. 📋 Follow `RUNBOOK.md` to set up Google Workspace SSO and Recall.ai login
3. 🔗 Register the webhook URL in Recall.ai dashboard:
   ```
   https://recallai-webhook-receiver-72608706210.us-east4.run.app/webhook/recallai
   ```
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
