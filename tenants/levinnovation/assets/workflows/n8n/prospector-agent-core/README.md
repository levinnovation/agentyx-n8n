# Prospector Agent Core (Levinnovation)

Outbound prospecting agent. Searches LinkedIn for leads matching LEV's ICP, qualifies them
with an AI agent, registers them in Twenty CRM (person + company + opportunity), composes
personalized outreach with calendar slots, sends a Gmail draft, and finally routes the
qualified lead into `customer-service-core` so the same conversational engine that handles
inbound also drives the outbound follow-up.

- **Workflow ID (live):** `ln5Qw90tQaDQpcuZ`
- **Status:** active
- **Triggers:**
  - `Webhook Trigger (POST)` at `https://webhooks.n8n.agentyx.one/webhook/prospector/run`
  - `Execute Workflow Trigger` (callable from other workflows)
  - Scheduled hourly via the separate `prospector-agent-scheduler` workflow (id `x6UEapkGLMDXxXuv`)

## Pipeline

```
Trigger (cron OR subworkflow input)
  → Initialize Run        (set defaults: query, batch size, fit_threshold, dry_run)
  → Has Test Leads?       (if test_leads provided, skip LinkedIn fetch)
  → Source LinkedIn       (RapidAPI fresh-linkedin-profile-data)
  → Normalize Leads
  → Split In Batches (1 per item)
    → Twenty CRM Dedup Check        (Execute Workflow → twenty-crm-read-context)
    → Is Duplicate? ── yes → Slack Duplicate Log → next batch
                   └─ no  → Tavily Lead Enrichment   (web scraping)
                          → Compose Agent Input
                          → Prospector AI Agent       (OpenRouter gemini-2.5-flash)
                          → Parse Qualification JSON
                          → Fit Score Gate ── low → Slack Low-fit Log → next batch
                                          └─ high →
                                              Twenty Upsert Person  (Execute Workflow)
                                            → Twenty Upsert Company (Execute Workflow)
                                            → Twenty Upsert Opportunity (Execute Workflow, stage=NEW)
                                            → Get Calendar Slots   (Google Calendar)
                                            → Compose Outreach + Slots
                                            → Has Email? + Not Dry Run? → Send Gmail Outreach
                                            → Wrap CS Core Input
                                            → Invoke Customer Service Core (Execute Workflow)
                                            → Slack Qualified Lead
                                            → Next Batch
  → (after batch loop done) → Slack Run Summary
```

## Input envelope (when invoked as subworkflow)

```json
{
  "linkedin_query": "operations manager ai automation latam",
  "leads_per_run": 25,
  "fit_threshold": 70,
  "dry_run": false,
  "test_leads": [
    {
      "full_name": "Ana Sample",
      "company": "Acme LATAM",
      "role": "Head of Ops",
      "email": "ana@acme-latam.example",
      "linkedin_url": "https://linkedin.com/in/ana-sample",
      "location": "Mexico City"
    }
  ]
}
```

If `test_leads` is provided, LinkedIn fetch is skipped and the supplied leads run through the
full pipeline. If `dry_run: true`, Gmail send is skipped (everything else still runs).

## Integrations

| System | Used for | Auth |
|---|---|---|
| LinkedIn (RapidAPI) | Lead sourcing | `RAPIDAPI_KEY` env |
| Tavily | Company web enrichment | n8n credential `httpHeaderAuth` id `8UlHXKvhdd4luxVZ` (Bearer token) |
| Twenty CRM | Dedup, upsert person/company/opportunity | `TWENTY_API_KEY` env, via subworkflows |
| Google Calendar | Slot availability for outreach | OAuth (`googleCalendarOAuth2Api`) |
| Gmail | Outreach send | OAuth (`gmailOAuth2`) |
| OpenRouter | Gemini 2.5 Flash for qualification | OAuth (`openRouterApi`) |
| Slack | Run + lead notifications | webhook URL via env |
| Customer Service Core | Conversational engine for follow-up | n8n subworkflow `2YgexGoZiHnGwGUi` |

## Subworkflows referenced

| Workflow | ID | Purpose |
|---|---|---|
| Twenty CRM Read Context (Levinnovation) | `d6VSkkNoCIxolaFM` | dedup check on email + company |
| Twenty CRM Write Actions (Levinnovation) | `8DwIA1gB946zMl7B` | upsert_person / upsert_company / upsert_opportunity |
| Customer Service Core (Levinnovation) | `2YgexGoZiHnGwGUi` | enrich qualified lead through conversational AI agent |

## Environment variables

See `.env.example`.

## Manual test (E2E dry run)

```bash
curl -X POST \
  -H "X-N8N-API-KEY: $N8N_KEY" \
  -H "Content-Type: application/json" \
  https://webhooks.n8n.agentyx.one/api/v1/workflows/ln5Qw90tQaDQpcuZ/execute \
  -d '{
    "dry_run": true,
    "fit_threshold": 50,
    "test_leads": [{
      "full_name": "Test Lead",
      "company": "Test Co",
      "role": "Head of Operations",
      "email": "test@example.com",
      "linkedin_url": "https://linkedin.com/in/test"
    }]
  }'
```

## Operational notes

- `dry_run: true` blocks the Gmail send but still creates Twenty CRM records — use a
  scratch tenant / sandbox email to avoid polluting prod data.
- Tavily enrichment is best-effort (`continueOnFail: true`). If Tavily fails, the lead
  still flows through with whatever LinkedIn returned.
- The AI agent has a strict JSON contract. Parsing failures fall back to a generic template
  (`_parse_error` field is set on the item for observability).
- Customer Service Core is invoked with `waitForSubWorkflow: false` so a slow CS Core run
  doesn't stall the prospector loop.
