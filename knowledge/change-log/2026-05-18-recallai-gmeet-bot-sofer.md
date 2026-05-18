# Change Log: 2026-05-18 — Recall.ai Google Meet Bot for Sofer

## Summary

Added `recallai-gmeet-bot` as a new integration asset under the `meeting-minutes-and-followups` capability. This asset enables the Sofer meeting scribe to join Google Meet calls via Recall.ai managed bots, replacing the abstract `meeting-joiner` dependency.

## Files Created

- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/asset.yaml`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/README.md`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/RUNBOOK.md`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/.env.example`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/deployment-contract.yaml`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/recallai-bot-orchestrator.json`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/recallai-webhook-receiver.json`

## Files Modified

- `tenants/levinnovation/domains/internal-operations/capabilities/meeting-minutes-and-followups/capability.yaml`
  - Added `recallai-gmeet-bot` to the `assets` list.
- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/asset.yaml`
  - Replaced generic `meeting-joiner` dependency with `recallai-gmeet-bot` pointing to `https://us-east-1.recall.ai/api/v1`.
- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/.env.example`
  - Replaced `MEETING_JOINER_API_URL` / `MEETING_JOINER_API_KEY` with Recall.ai variables.

## Architecture Impact

- The capability now owns two assets:
  1. `meetings-agent-core` — downstream transcript processor.
  2. `recallai-gmeet-bot` — upstream meeting joiner and transcription source.

- The dependency graph is now concrete:
  `meetings-agent-core` → `recallai-gmeet-bot` → Recall.ai API → Google Meet

## Next Steps

1. ✅ GCP Cloud Run services deployed
2. ✅ IAM public access configured
3. ✅ Webhook registered in Recall.ai
4. 📋 Follow `RUNBOOK.md` to set up Google Workspace SSO and Recall.ai login group
5. 🧪 Test creating a bot with a real Google Meet URL and login group ID

## Compliance

- No secrets committed.
- `.env.example` shows variable shapes only.
- Actual `RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET`, and Google SSO PEMs must be stored in Railway/n8n credentials.
