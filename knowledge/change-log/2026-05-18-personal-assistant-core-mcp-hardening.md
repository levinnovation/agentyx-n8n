# 2026-05-18: Personal Assistant Core MCP hardening and Gmail schema fix (corrected)

**Related:** ADR-0028-multichannel-personal-assistant-and-n8n-as-librechat-mcp

## Summary

Fixed runtime issues in `personal-assistant-core` that caused the AI Agent to hallucinate Gmail parameters and trigger schema validation errors.

### Corrections applied

1. **Gmail schema corrected in system message** — first attempt incorrectly documented `attachments` (plural array) as valid. Queried live Composio API and discovered the actual `GMAIL_SEND_EMAIL` schema uses:
   - `recipient_email` (string, required)
   - `body` (string, required)
   - `subject` (string, nullable)
   - `is_html` (boolean, default false)
   - `cc`, `bcc`, `extra_recipients` (arrays of strings)
   - `user_id` (string, default `"me"`) — NOT `from_email`
   - `attachment` (singular object with `{name, s3key, mimetype}`) — NOT `attachments` plural
   
   Updated system message in both `AI Agent (Tools Enabled)` and `AI Agent (Tools Enabled)1` nodes to reflect real schema. Explicitly forbids `from_email` and `attachments` (plural).

2. **MCP server hardened (`services/composio-mcp`)** — updated `hardenGmailSendArgs` to auto-strip `from_email` and `attachments` (plural) before executing the tool, with warn-level telemetry. This defends against any remaining prompt-level hallucinations even if the system message is overridden.

3. **MCP nodes split into toolkit-scoped instances** — replaced single catch-all MCP node with 5 curated nodes (Slack, Google Calendar, Gmail, Google Drive, Google Docs). Each node passes `x-max-tools=200`, `x-allowed-toolkits={toolkit}`, and `x-compressed-tools=1` headers to prevent the Composio MCP server from truncating or exposing phantom tools.

4. **Slack node enabled** — re-enabled after validating 31 supported tools against live Composio catalog and removing 9 deprecated / 2 phantom tools.

## Files / areas

- `tenants/levinnovation/assets/workflows/n8n/personal-assistant-core/personal-assistant-core.json`
- `C:\Users\fleon\Downloads\Personal Assistant AI Core (Lev Innovation)V2.json` (live n8n export with duplicate `1` suffixed nodes)
- `services/composio-mcp/src/composio.ts`

## Validation

- JSON syntax verified via `ConvertFrom-Json` in PowerShell.
- Composio API queried directly (`backend.composio.dev/api/v2/actions/GMAIL_SEND_EMAIL`) to confirm exact parameter schema.
- Diff inspected: headers, system message, node state, and server-side sanitization all correct.
- `make validate` not available on Windows host; manual JSON validation passed.

## Risks / rollback

- **Risk:** `x-allowed-toolkits` values must exactly match Composio toolkit slugs. A mismatch would return zero tools to the agent.
  - Mitigation: values used are `slack`, `googlecalendar`, `gmail`, `googledrive`, `googledocs` — confirmed against Composio catalog.
- **Risk:** AI Agent may still hallucinate non-existent tools if system message is too long for the model context window.
  - Mitigation: system message is ~5.8 kB, well within `gpt-4o-mini` context.
- **Risk:** `attachment` requires S3-uploaded files (`s3key`). If the agent tries to attach a local/base64 file, it will fail.
  - Mitigation: current use cases don't involve file attachments; if needed, add a pre-upload step to S3.
- Rollback: restore previous `personal-assistant-core.json` from git history and re-import into live n8n.
