# LEV Innovation - capability decisions

## linkedin-lead-prospecting

Primary outbound capability for sourcing, qualifying, and routing leads.

### v1 boundaries

- LinkedIn discovery via RapidAPI read endpoints.
- Qualification and message drafting via OpenRouter.
- CRM persistence in HubSpot.
- Calendar slot proposal via Google Calendar.
- Internal status updates via Slack channel `#levinnovation`.
- LinkedIn direct outreach remains human-in-the-loop through HubSpot tasks.

## lead-qualification-and-scheduling

Inbound customer service capability for multi-channel lead engagement.

### Architecture

- Core subworkflow (`customer-service-core`) with Execute Workflow Trigger.
- Channel adapters (WhatsApp via Kapso, Telegram, Meta comments) normalize payloads and call core.
- AI Agent powered by Gemini (`google/gemini-2.5-flash`) via OpenRouter.
- Redis Chat Memory for multi-user session isolation.
- In-memory Vector Store for knowledge base retrieval.
- Composio MCP tools for Google Calendar scheduling.
- Twenty CRM for lead persistence (self-hosted in Railway).

### v1 boundaries

- Audio transcription via OpenAI Whisper (most reliable in n8n architecture).
- Meta comment auto-reply pending Composio Meta Business Suite toolkit connection.
- Twenty CRM URL is a placeholder until Railway deployment completes.
- Knowledge base is a single markdown file; Google Drive expansion planned for v2.
