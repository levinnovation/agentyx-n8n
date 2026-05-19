# Prospector Agent Messenger (Levinnovation)

Email-only outbound messenger. Reads qualified leads from Twenty CRM (stage=NEW), loads campaign config, builds personalized outreach emails via AI Agent with Pinecone KB grounding, sends via Resend, and logs stage=CONTACTED.

## Pipeline

```
Trigger (subworkflow or scheduler)
  → Read CRM Leads        (Twenty API: opportunities stage=NEW with email)
  → Parse CRM Leads
  → Has Leads?
    → Split In Batches (1 per lead)
      → Check Email Status
        ├─ NO email → Skip → Next Batch
        └─ HAS email
          → Load Campaign Config (campaign.yaml from repo)
          → Parse Campaign YAML
          → Compose Agent Input
          → AI Agent: Build Email (OpenRouter GPT-4o + Pinecone KB tool)
          → Parse Agent Output (extract subject + body HTML)
          → Resend: Send Email
          → Log CRM Update (Twenty Write Actions: stage=CONTACTED)
          → Slack: Email Sent
          → Next Batch
    → (after loop) Build Summary
    → Slack: Run Summary
```

## Input envelope

```json
{
  "dry_run": false
}
```

## Integrations

| System | Used for | Auth |
|---|---|---|
| Twenty CRM | Read leads + update stage | `TWENTY_API_KEY` env |
| Pinecone | Product knowledge grounding | `PINECONE_API_KEY` |
| OpenRouter | GPT-4o email composition | `openRouterApi` cred |
| Resend | Email delivery | `RESEND_API_KEY` env |
| Slack | Notifications | `SLACK_WEBHOOK_URL` env |

## Environment variables

See `asset.yaml` `env_required`.

## Operational notes

- `dry_run: true` blocks Resend send but still runs AI Agent and CRM read.
- Leads without email are skipped and counted in summary.
- Campaign config is fetched per lead from GitHub raw URL (cached by n8n per execution).
- Pinecone KB uses `levinnovation-kb` index, namespace `default`.
