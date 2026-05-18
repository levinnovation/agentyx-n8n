# 2026-05-18 — Fix Tavily, Calendar, and KB Search Tool Failures

## Problem

User reported no WhatsApp responses for messages sent at 17:14, 17:49, and 19:13 Costa Rica time.

Root causes identified from n8n execution logs:

1. **Tavily MCP schema rejection** — AI Agent sent `{"query":"...","max_results":3,...}` without `exclude_domains` and `include_domains`. Composio MCP returned:
   ```
   ✖ Invalid input → at exclude_domains
   ✖ Invalid input → at include_domains
   ```
   This caused the **main workflow AI Agent node to error**, preventing any Kapso reply.

2. **Calendar MCP intermittent schema rejection** — AI omitted or sent invalid values for `send_updates`, `birthdayProperties`, `focusTimeProperties`, `outOfOfficeProperties`, `workingLocationProperties`, etc.

3. **KB Search v2 subworkflow broken by previous agent** — `Merge Embed + Query` node was removed and `Prepare SQL` rewired to receive dual inputs directly. In n8n 2.21.2 JS Task Runner, this caused the node to hang for ~2m until workflow timeout, returning error to the AI Agent caller.

## Changes

### `tenants/levinnovation/assets/workflows/n8n/customer-service-core/customer-service-core.json`

- **AI Agent system prompt** (root + activeVersion):
  - Added explicit Tavily example:
    ```
    {"query":"X","max_results":3,"search_depth":"advanced",
     "include_answer":true,"include_raw_content":false,
     "exclude_domains":[],"include_domains":[]}
    ```
  - Strengthened Calendar example with `NUNCA omitas ningún campo` and full field list.

- **MCP Tavily Tool** node:
  - Synced `includeTools` to `["TAVILY_SEARCH"]` in both root and activeVersion.
  - Removed stale `TAVILY_MCP_TAVILY_SEARCH` name that caused "MCP Server returned no tools".

- **MCP Google Calendar Tool** node:
  - Kept `GOOGLECALENDAR_CREATE_EVENT` only; synced root to match activeVersion.

### `tenants/levinnovation/assets/workflows/n8n/kb-search-v2/kb-search-v2.json`

- Reverted removal of `Merge Embed + Query` node.
- Restored original `Prepare SQL` code that reads embedding via `$json.data`.
- Verified via execution 6994: subworkflow completes in ~1.4s.

## Validation

E2E tests via Kapso webhook `POST /webhook/kapso/customer-service`:

| Test | Main Exec | Adapter Exec | Subworkflow | Result |
|------|-----------|--------------|-------------|--------|
| Tavily: "Busca información sobre Agentyx en la web" | 6985 success | 6984 success | N/A | ✅ Reply sent |
| Calendar: "Agenda una reunion mañana a las 3pm" | 6988 success | 6987 success | N/A | ✅ Reply sent |
| KB Search: "¿Qué es Contax?" | 6993 success | 6992 success | 6994 success | ✅ Reply sent |
| Gmail: "Envíame un correo a test@example.com" | 6996 success | 6995 success | N/A | ✅ Reply sent |

## Follow-up

- Monitor Railway `agx-demo-n8n` logs for any remaining `Received tool input did not match expected schema` errors.
- If Calendar schema continues to reject, consider adding a pre-validation Code node between AI Agent and MCP Calendar to enforce exact field presence.
