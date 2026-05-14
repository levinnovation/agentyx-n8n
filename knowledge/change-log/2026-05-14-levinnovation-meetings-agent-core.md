# 2026-05-14 - Levinnovation Meetings Agent Core

## Summary

Added the first version of `meetings-agent-core`, a Sofer multi-agent n8n workflow for LEV Innovation internal meeting operations.

## Changes

- Added `internal-operations/meeting-minutes-and-followups` domain/capability specs.
- Added `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/`.
- Added workflow JSON export with multiple AI Agent nodes:
  - intake and validation
  - transcript extraction
  - artifact composition
  - MCP actions
- Added one Composio MCP tool node per external application:
  - Google Calendar
  - Google Docs
  - Gmail
  - ClickUp
- Added prompt source files, README, asset metadata, and environment shape.
- Updated Levinnovation tenant context and workflow index docs.

## Notes

The workflow expects a separate meeting joiner/transcription service to provide `transcript_text` before minutes processing. Live meeting attendance is intentionally outside the LLM prompt and workflow core.
