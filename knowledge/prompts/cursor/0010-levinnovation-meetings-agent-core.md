# Cursor Prompt 0010: Levinnovation Meetings Agent Core

Date: 2026-05-14

## User Request

Create and version a modified n8n workflow for a Levinnovation meetings agent using a multi-agent AI Agent node approach. The workflow should support an expert meeting minutes/note taker called Sofer and use Composio MCP for Google Calendar, Google Docs, Gmail, and ClickUp actions.

## Implementation Notes

- Created `meetings-agent-core` as an n8n workflow asset.
- Split responsibilities across multiple AI Agent nodes rather than one broad agent prompt.
- Added prompt artifacts next to the workflow.
- Added domain/capability metadata for `internal-operations/meeting-minutes-and-followups`.
- Recorded ADR-0033 and change log entry.

## Safety Notes

The generated workflow does not claim it can join meetings directly. Meeting attendance and transcription must be handled by an upstream meeting-joiner service before the core workflow processes `transcript_text`.
