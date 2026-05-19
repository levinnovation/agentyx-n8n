# Change Log: 2026-05-18 — Wire Recall.ai Bot into Sofer n8n Workflows

## Summary

Deployed the updated n8n workflows so Sofer (via Telegram) can now dispatch Recall.ai bots to live meetings, receive transcripts via webhooks, and process them end-to-end.

## Actions Taken

1. **Updated `meetings-agent-core`**
   - Added `Webhook (Transcript Callback)` trigger node at `POST /webhook/sofer-transcript`
   - Updated intake agent prompt to acknowledge automatic bot dispatch capability
   - Imported via n8n REST API → workflow ID `yMhnGt1bBWUjBTZ5` ✅

2. **Updated `chan-telegram-meetings-agent`**
   - Added "Has Meeting URL?" branch after normalization
   - True path: dispatches bot via `POST https://recallai-bot-orchestrator-72608706210.us-east4.run.app/bot/create`
   - Includes `chat_id`, `conversation_id`, and `meeting_id` in metadata
   - Returns immediate acknowledgment: *"Estoy enviando a Sofer a tu reunion. Te aviso cuando tenga la transcripcion lista. 🎙️"*
   - Imported via n8n REST API → workflow ID `0kFmYtH46jtabEb0` ✅

3. **Updated Cloud Run webhook receiver**
   - Now forwards transcripts to `https://levinnovation.n8n.agentyx.one/webhook/sofer-transcript`
   - Extracts `chat_id` from bot metadata and sends Telegram reply when processing completes

## Verified Flow

```
Telegram → "join https://meet.google.com/xxx"
  │
  ▼
chan-telegram-meetings-agent detects URL
  │
  ▼
POST /bot/create (Cloud Run orchestrator)
  │
  ▼
Recall.ai bot joins meeting
  │
  ▼
Webhook → /webhook/recallai (Cloud Run receiver)
  │
  ▼
POST /webhook/sofer-transcript (n8n meetings-agent-core)
  │
  ▼
Extraction → Artifacts → Actions
  │
  ▼
Telegram reply: "Resumen: ..."
```

## What the User Will See

| Stage | Telegram Reply |
|-------|----------------|
| URL detected | "Estoy enviando a Sofer a tu reunion. Te aviso cuando tenga la transcripcion lista. 🎙️" |
| Transcript ready | "Transcripcion terminada. Resumen: ..." |

## Important Notes

- **Signed-in bots** still require Google Workspace SSO setup per `RUNBOOK.md`
- **Concurrency**: Each Google login supports ~30 concurrent bots
- **Region**: Cloud Run services point to `us-west-2.recall.ai`

## Files Modified

- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/meetings-agent-core.json`
- `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/prompts/intake-agent.system.md`
- `tenants/levinnovation/assets/workflows/n8n/chan-telegram-meetings-agent/chan-telegram-meetings-agent.json`
- `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/services/webhook-receiver/main.py`

---
Generated: 2026-05-18
