# n8n Workflows (LEV Innovation / sales-prospecting)

## Source of truth

- Workflow JSON files in this directory are authoritative.
- n8n UI changes must be exported back to Git via PR.

## Workflows

| Workflow | Status | Trigger | Description |
|---|---|---|---|
| `agente-prospectador-ai` | Draft | Schedule (daily) | Deterministic LinkedIn lead prospecting, qualification, HubSpot sync, outreach draft, and Slack updates |

## Required environment variables

```bash
# OpenRouter (model id for OpenRouter Chat Model node; API key lives in n8n credential)
OPENROUTER_MODEL=openai/gpt-4o-mini

# LinkedIn data source (RapidAPI)
RAPIDAPI_KEY=...
RAPIDAPI_LINKEDIN_HOST=fresh-linkedin-profile-data.p.rapidapi.com
RAPIDAPI_LINKEDIN_URL=https://fresh-linkedin-profile-data.p.rapidapi.com/search-people
LINKEDIN_SEARCH_QUERY=operations manager ai automation latam
LEADS_PER_RUN=25

# HubSpot
HUBSPOT_PRIVATE_APP_TOKEN=...
HUBSPOT_PIPELINE_ID=default
HUBSPOT_DEAL_STAGE_ID=appointmentscheduled

# Calendar and email
GOOGLE_CALENDAR_ID=primary
GMAIL_FROM=ventas@levinnovation.com

# Notifications
SLACK_WEBHOOK_URL=...
SLACK_CHANNEL=#levinnovation

# Qualification control
LEAD_FIT_THRESHOLD=70
TZ=America/Costa_Rica
```

## Credentials

- HubSpot credential for CRM nodes (or private app token via HTTP nodes).
- Google credential for Calendar and Gmail nodes.
- Slack webhook secret.
- **OpenRouter API** credential assigned to the **OpenRouter Chat Model** node (AI Agent stack).
- RapidAPI key in n8n environment or credential vault for the LinkedIn HTTP node.

## v1 constraints

- LinkedIn DM is generated as copy and a HubSpot task; auto-send is out of scope.
- Calendar slots are proposed, not auto-booked after reply.
