# Meetings Agent Core (Levinnovation)

Multi-agent n8n workflow for LEV Innovation meeting minutes, notes, follow-ups, and action tracking.

## Purpose

`meetings-agent-core` processes either:

- a conversational setup request,
- a meeting URL that still needs a meeting-joiner/transcription service,
- or a completed transcript ready for minutes and follow-up automation.

The workflow does **not** join live meetings by itself. A separate meeting bot/transcription layer must join the URL and provide `transcript_text`.

## Input Envelope

Provide one item with:

- `trigger_source` - `chat`, `workflow`, `webhook`, etc.
- `meeting_id` - stable meeting/session key.
- `meeting_url` - optional Google Meet/Zoom/Teams URL.
- `meeting_title` - display title.
- `meeting_date` - ISO timestamp, interpreted in `America/Costa_Rica` when resolving relative dates.
- `transcript_text` - completed transcript text.
- `attendees_hint` - optional array of names/emails.
- `clickup_list_id` - optional list for task creation.
- `external_actions_enabled` - boolean flag for MCP actions.
- `send_followup_email` - boolean flag.
- `create_clickup_tasks` - boolean flag.
- `schedule_followups` - boolean flag.
- `metadata` - optional object.

## Multi-Agent Design

1. **AI Agent (Intake + Validation)**  
   Classifies the request as conversational, pending, skipped, or ready for processing.

2. **AI Agent (Transcript Extraction)**  
   Extracts executive summary, decisions, action items, risks, questions, and attendee mapping candidates.

3. **AI Agent (Artifact Composer)**  
   Builds Google Doc markdown, follow-up email draft, ClickUp task payloads, and calendar proposals.

4. **AI Agent (MCP Actions)**  
   Uses Composio MCP tools to create/update external artifacts when action flags are enabled.

## MCP Tooling

The actions agent uses one MCP tool node per application/toolkit:

- `MCP Google Calendar Tool (Meetings)` - event lookup and scheduling.
- `MCP Google Docs Tool (Meetings)` - document creation and notes insertion.
- `MCP Gmail Tool (Meetings)` - follow-up email.
- `MCP ClickUp Tool (Meetings)` - task creation.

Each tool node sends compressed/narrow headers to the Composio MCP proxy.

## Output Envelope

Returns:

- `status`
- `language`
- `meeting`
- `executive_summary`
- `decisions`
- `action_items`
- `risks_and_questions`
- `created_artifacts`
- `errors`
- `user_message`
- `raw_outputs`

## Required Environment/Credentials

- OpenRouter credential for chat models.
- Redis credential for optional meeting-scoped memory.
- Composio MCP multiple-header credential with:
  - `Authorization: Bearer <MCP_AUTH_TOKEN>`
- `COMPOSIO_ENTITY_ID`
- Optional meeting-joiner service credentials.

See `.env.example`.

## Deployment Notes

- Import `meetings-agent-core.json` into n8n.
- Wire a meeting joiner workflow upstream if live meeting attendance is required.
- Keep n8n UI changes exported back to this directory.

## Observability

The workflow carries `meeting_id`, `meeting_title`, `meeting_date`, and action flags through every agent stage. Use n8n execution logs to inspect each stage independently.
