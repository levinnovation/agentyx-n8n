# ADR-0033: Levinnovation Meetings Agent Core

Date: 2026-05-14

## Status

Accepted

## Context

LEV Innovation needs an internal meeting scribe workflow that can process meeting transcripts, create structured minutes, and optionally orchestrate follow-up work through Composio MCP tools.

The requested n8n workflow began as a single AI Agent node with one broad MCP tool. That design concentrates transcript extraction, artifact composition, and external side effects in one prompt, increasing token pressure and making runtime behavior harder to inspect.

## Decision

Create `meetings-agent-core` as a new n8n workflow asset under:

`tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/`

The workflow belongs to the new tenant capability:

`internal-operations/meeting-minutes-and-followups`

The workflow uses a multi-agent n8n design:

1. Intake and validation agent for conversational/setup/pending/skipped states.
2. Transcript extraction agent for summaries, decisions, actions, and risks.
3. Artifact composer agent for Google Doc markdown, email drafts, ClickUp task payloads, and calendar proposals.
4. MCP actions agent for external Google Calendar, Google Docs, Gmail, and ClickUp tool execution.

MCP tools are split by application/toolkit instead of exposed as one broad Composio surface.

## Consequences

- Meeting attendance remains a separate upstream meeting-joiner/transcription responsibility.
- The workflow does not claim attendance unless transcript or meeting-bot status is provided.
- External actions are gated by explicit flags so transcript processing can run safely without creating docs, emails, tasks, or calendar events.
- System prompts are versioned next to the workflow as prompt artifacts.
