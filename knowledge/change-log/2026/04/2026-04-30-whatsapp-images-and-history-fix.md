# 2026-04-30: Fix WhatsApp image delivery and broken conversation history

**Author:** opencode-go/kimi-k2.6
**Related:** euromobilia/kitchen-quotation/quotation-assistant

## Summary

Fixed two critical bugs in the `quotation-assistant` LangGraph agent that caused:
1. **Images never arriving on WhatsApp** — the `generate_quotation_image` tool returns markdown image URLs (`![...](url)`), but the outbound handler only used `send_text()`, so WhatsApp displayed raw markdown instead of an actual image attachment.
2. **Agent ignoring user questions and repeating renders** — the `/agent/invoke` endpoint (called by n8n) never persisted the incoming user message to Supabase before building history. Over time the conversation history became a lopsided sequence of assistant messages with no recent user context, causing the LLM to hallucinate repetitive render responses regardless of what the user actually asked.

## Rationale

Both issues were reported in a live WhatsApp thread where a user asked for renders, then asked simple follow-up questions ("Si pero quiero la foto", "Que tools tienes a tu disposicion?", "Di no me llegó la imagen"), and the agent kept replying with the same kitchen render text and never attached the actual image.

## Files / areas

- `tenants/euromobilia/assets/agents/quotation-assistant/app/main.py`
  - Added `_send_reply()` helper that detects markdown images, sends them via Kapso `send_image()`, and sends the remaining text separately.
  - Updated `/webhooks/kapso/inbound` to use `_send_reply()`.
  - Updated `/agent/invoke` to:
    - Store the user message in Supabase before building history (mirrors the inbound webhook behavior).
    - Exclude the just-stored message from the history slice (same `[:-1]` pattern).
    - Append `media_url` to the user message when present.
    - Use `_send_reply()` instead of `send_text()`.
- `tenants/euromobilia/assets/agents/quotation-assistant/app/models.py`
  - Added `message_id: str = ""` to `AgentInvokeRequest` so n8n can pass it through.
- `tenants/euromobilia/assets/workflows/n8n/kapso-inbound-quotation.json`
  - Fixed `phone_number` fallback logic (`'+' + undefined` was producing `'+undefined'`).
  - Extract `media_url` from image/document/voice messages instead of hardcoding `null`.
  - Pass `media_url` and `message_id` through to `/agent/invoke`.

## Validation

- `make validate` — passed (specs + agent context)
- `python3 -m py_compile` on `models.py` and `main.py` — passed
- `python3 -m json.tool` on `kapso-inbound-quotation.json` — passed
- `make knowledge-index` — regenerated

## Risks / rollback

- n8n workflow JSON must be re-imported into the n8n instance for the `media_url` / `message_id` passthrough to take effect.
- If the agent is deployed behind a load balancer with multiple replicas, the in-memory `_seen_message_ids` dedup cache in `/webhooks/kapso/inbound` remains local to each process; this is an existing limitation and not worsened by this change.
- Rollback: revert the three files above and re-deploy the agent + re-import the n8n workflow.
