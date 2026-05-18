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

1. Create a dedicated Google Workspace for bot SSO (`sso.levinnovation.com`).
2. Copy the pre-generated PEM cert/key from `RUNBOOK.md` into Google Admin Console and Recall.ai dashboard.
3. Create Recall.ai Google Login Group and add at least 1 active login.
4. Import the n8n workflows (`recallai-bot-orchestrator.json` and `recallai-webhook-receiver.json`) into your n8n instance.
5. Register the webhook URL in Recall.ai so status events route to the receiver workflow.
6. Invite bot email to calendar events for waiting-room bypass.

## Compliance

- No secrets committed.
- `.env.example` shows variable shapes only.
- Actual `RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET`, and Google SSO PEMs must be stored in Railway/n8n credentials.
