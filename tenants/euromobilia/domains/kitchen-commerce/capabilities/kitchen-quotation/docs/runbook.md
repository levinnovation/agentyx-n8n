# Kitchen Quotation — Runbook

## Common Operations

### Restart the agent

1. Render dashboard → Services → quotation-assistant → Manual Deploy
2. Verify health: `GET /health`

### Sync knowledge base

Trigger a full sync by calling:
```bash
curl -X POST https://<agent-host>/agent/invoke \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"__sync_kb__"}]}'
```

Or run locally:
```bash
python -c "from app.knowledge.sync import sync_knowledge_base; print(sync_knowledge_base(force=True))"
```

### Update pricing rules

1. Open Supabase SQL Editor.
2. Insert/update rows in `commercial_pricing_rules`.
3. Rules take effect immediately (no restart needed).

### Check message deduplication

If a customer receives duplicate replies:
1. Check n8n execution logs for duplicate webhook deliveries.
2. Verify `message_id` deduplication in Kapso inbound workflow.
3. Check agent logs for `message_id` cache hits.

### Human handoff

When the agent escalates:
1. A Slack notification is sent to `#sales-alerts`.
2. The conversation state is preserved in Supabase.
3. A human agent can resume by sending a message from the CRM.

### Image generation failures

If image generation fails:
1. Check `OPENROUTER_API_KEY` balance.
2. Check `REPLICATE_API_TOKEN` if using img2img.
3. Review `app_settings.image_quality_mode` in Supabase.
4. Fallback: Pollinations.ai URLs are returned on total failure.

### PDF generation failures

If quote PDF fails:
1. Check edge function logs in Supabase.
2. Verify `artifacts` bucket exists and has public access.
3. Re-run the `quote-pdf` edge function manually with test payload.

## Alerts

- Response time > 5s → Check LLM provider latency (OpenRouter status page)
- Error rate > 5% → Check LangSmith traces for tool failures
- Handoff rate > 20% → Review intent classification accuracy

## Escalation

- L1: AI Team (`ai-team@euromobilia.com`)
- L2: Operations (`operations@euromobilia.com`)
- L3: ARA Group IT (`it@aragroupcr.com`)
