# Prospector Inbound Handler (Levinnovation)

Polls Gmail inbox for replies to prospector outreach emails, analyzes lead interest with AI Agent + Pinecone KB, and notifies sales team via Resend + Slack.

## Pipeline

```
Schedule Trigger (every 2h)
  → Gmail: Get Replies (last 24h, excluding sent)
    → Parse Emails (extract body, from, subject, threadId)
    → Has Replies?
      → Split In Batches (1 per email)
        → Load Campaign Config (via campaign_id or default)
        → Parse Campaign YAML
        → Compose Agent Input
        → AI Agent: Analyze Interest (OpenRouter GPT-4o + Pinecone KB)
        → Parse Interest Result
        → Is Interested? (confidence >= 70)
          ├─ YES
          │   → Prepare Sales Email (HTML summary)
          │   → Resend: Notify Sales Team
          │   → Update CRM: Interested (stage=INTERESTED + note)
          │   → Slack: Lead Interested
          │   → Next Batch
          │
          └─ NO
              → Update CRM: Not Interested (add note)
              → Next Batch
        → (after loop) Build Summary
        → Slack: Inbound Summary
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
| Gmail API | Poll inbox for replies | `gmailOAuth2` cred |
| Pinecone | Product knowledge for interest analysis | `PINECONE_API_KEY` |
| OpenRouter | GPT-4o interest analysis | `openRouterApi` cred |
| Resend | Email notifications to sales team | `RESEND_API_KEY` env |
| Twenty CRM | Update opportunity stage | `TWENTY_API_KEY` env |
| Slack | Notifications | `SLACK_WEBHOOK_URL` env |

## Operational notes

- `dry_run: true` blocks Resend and CRM updates but still runs AI analysis.
- Only replies to emails sent by the prospector system are processed (subject starts with Re:).
- Confidence threshold for "interested" is 70 (configurable).
- Gmail polling uses a shared OAuth credential that must have access to the sales inbox.
- Campaign config is fetched per email thread from GitHub raw URL.
