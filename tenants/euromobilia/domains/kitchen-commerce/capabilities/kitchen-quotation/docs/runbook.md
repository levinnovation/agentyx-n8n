# Kitchen Quotation — Runbook

## Common Operations

### Restart the agent

**Via Railway CLI:**
```bash
export RAILWAY_TOKEN=<token>
bash scripts/railway/redeploy.sh --tenant euromobilia --service agent
```

**Via Railway dashboard:**
Services → agent → Restart

**Verify health:**
```bash
bash scripts/railway/smoke-test.sh --tenant euromobilia --service agent
```

### Rollback the agent

```bash
bash scripts/railway/rollback.sh --tenant euromobilia --service agent
```

This picks the previous successful deployment and redeploys it.

### Flip AUTH_REQUIRED

To enforce Better Auth JWT on Agent endpoints:

1. Set `AUTH_REQUIRED=true` in the agent service variables:
   ```bash
   railway variables --service agent --set AUTH_REQUIRED=true
   ```
2. Redeploy:
   ```bash
   bash scripts/railway/redeploy.sh --tenant euromobilia --service agent
   ```
3. Verify:
   - `GET /health` → 200 (public)
   - `GET /api/v1/anything` without JWT → 401
   - `GET /api/v1/anything` with valid JWT → 200
   - `POST /webhooks/kapso/inbound` with valid HMAC → 200 (unchanged)

To revert:
```bash
railway variables --service agent --set AUTH_REQUIRED=false
bash scripts/railway/redeploy.sh --tenant euromobilia --service agent
```

### Sync knowledge base

Trigger a full sync by calling:
```bash
curl -X POST https://<agent-domain>/agent/invoke \
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

### Secret rotation

1. Update the secret in GitHub Actions (Settings → Secrets and variables).
2. Re-run the stack deploy workflow, or manually:
   ```bash
   bash scripts/railway/sync-vars.sh --tenant euromobilia --service <svc>
   ```
3. Redeploy the affected service:
   ```bash
   bash scripts/railway/redeploy.sh --tenant euromobilia --service <svc>
   ```

### n8n workflow re-import

After editing workflow JSON in the repo:
1. Push to `main`.
2. The Hostinger workflow (deprecated) is gated; use the n8n REST API or UI import for Railway n8n.

## Log inspection

**Per-service logs:**
```bash
railway logs --service <svc>
```

**Agent logs (recent):**
```bash
railway logs --service agent --lines 200
```

## Alerts

- Response time > 5s → Check LLM provider latency (OpenRouter status page)
- Error rate > 5% → Check LangSmith traces for tool failures
- Handoff rate > 20% → Review intent classification accuracy

## Escalation

- L1: AI Team (`ai-team@euromobilia.com`)
- L2: Operations (`operations@euromobilia.com`)
- L3: ARA Group IT (`it@aragroupcr.com`)

## Legacy runbook (Hostinger — deprecated)

See `tenants/euromobilia/assets/deploy/n8n-hostinger/README.md` and `agent-hostinger/README.md` for the old SSH-based procedures. Use only for emergency rollback.
