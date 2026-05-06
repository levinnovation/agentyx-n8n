# DESIGN: Agente Prospectador AI

## Overview

Deterministic n8n workflow for LEV Innovation outbound prospecting.

The flow ingests candidate leads from a RapidAPI LinkedIn provider, prevents
duplicates in HubSpot, qualifies each lead with OpenRouter using LEV context
from a Simple Vector Store, and routes qualified opportunities to outreach and
meeting proposal steps.

## Data flow

```text
Schedule -> Load KB -> RapidAPI Search -> Normalize -> SplitInBatches
  -> HubSpot Dedup
    -> (duplicate) Slack skip log
    -> (new) Vector query -> Prepare Agent Input -> Prospector AI Agent -> Parse JSON -> Fit gate
        -> (low-fit) Slack low-fit log
        -> (qualified) HubSpot create/update -> Calendar slots -> Compose message
            -> (has email) Gmail send
            -> HubSpot task (LinkedIn DM manual send)
            -> Slack success log
  -> Slack run summary
```

## Deterministic control points

- **Dedup gate:** HubSpot contact search by email or LinkedIn URL.
- **Fit gate:** `fit_score >= LEAD_FIT_THRESHOLD`.
- **Email gate:** only send email when a normalized email is available.
- **Guaranteed audit trail:** every branch logs to Slack with run metadata.

## External systems

- LinkedIn source: RapidAPI endpoint (`RAPIDAPI_LINKEDIN_URL`).
- LLM: n8n **OpenRouter Chat Model** sub-node (`@n8n/n8n-nodes-langchain.lmChatOpenRouter`) wired to **Prospector AI Agent** (`@n8n/n8n-nodes-langchain.agent`). Authenticate with the **OpenRouter API** credential in n8n (not raw HTTP to `OPENROUTER_BASE_URL`).
- Agent tools: **Calculator Tool** satisfies n8n requirement for at least one tool on the AI Agent; it is optional at runtime for simple fit reasoning.
- Session: **Simple Memory** (`memoryBufferWindow`) keyed per `lead_id` to isolate batch items.
- CRM: HubSpot contacts/deals/tasks.
- Calendar: Google Calendar free-busy query.
- Outreach: Gmail send.
- Internal updates: Slack webhook to `#levinnovation`.

## Prompt and KB usage

- System prompt file: `tenants/levinnovation/assets/prompts/agente-prospectador.system.md`.
- Knowledge seed file: `tenants/levinnovation/assets/data/lev-innovation-knowledge.md`.
- n8n loads and embeds this knowledge into Simple Vector Store at runtime.

## Known limitations (v1)

- LinkedIn DM is not auto-sent; workflow generates copy and creates HubSpot task.
- Calendar booking is not auto-confirmed after recipient reply; only slots are proposed.
