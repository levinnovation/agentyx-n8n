# MCP Composio Authentication Fix

**Date:** 2026-05-14  
**Type:** Bug Fix - Critical  
**Impact:** All AI Agent workflows with Composio MCP tools

---

## Summary

Fixed MCP authentication failure that was preventing AI agents from executing Composio tools (Gmail, Slack, Google Calendar, ClickUp, etc.). The issue was caused by an outdated or incorrect MCP_AUTH_TOKEN in n8n credentials.

## Problem Description

### Symptoms

- Telegram messages to Levi (Customer Service agent) reported: "Intenté ejecutar la acción vía MCP pero no se completerido con parámetros más específicos"
- AI agents could list MCP tools but failed when trying to execute them
- MCP tool calls returned 401 Unauthorized errors

### Root Cause

The n8n credential "Multiple Headers Auth account" (ID: `9udywSKQmBfbGfkw`) contained an outdated or truncated `MCP_AUTH_TOKEN` that did not match the token configured on the Railway `agx-demo-composio-mcp` service.

**Correct token location:** Railway service `agx-demo-composio-mcp` → Environment variable `MCP_AUTH_TOKEN`

## Investigation Process

1. **Verified Composio MCP service status:**
   - Service running and healthy at `https://levinnovation.mcp.agentyx.one/mcp`
   - Logs showed successful tool list requests (608 tools)
   - Health endpoint responding correctly

2. **Verified workflow configurations:**
   - All 4 core workflows correctly configured with MCP endpoint URL
   - Customer Service Core (Levi) - ID: `n0mTwpONyCbbyn2E` ✅
   - Personal Assistant Core - ID: `1USjs2JAP4tlHIcm` ✅
   - Meetings Agent Core (Sofer) - ID: `yMhnGt1bBWUjBTZ5` ✅
   - Prospector Agent Core - ID: `i06Dfr3BkClgMgT2` ✅

3. **Identified authentication mismatch:**
   - MCP endpoint returned 401 Unauthorized for requests from n8n
   - Compared Railway `MCP_AUTH_TOKEN` with n8n credential
   - Confirmed token mismatch

## Resolution

### Fix Applied

Updated n8n credential "Multiple Headers Auth account" (ID: `9udywSKQmBfbGfkw`) with the correct `MCP_AUTH_TOKEN` from Railway:

**Location:** n8n UI → Credentials → "Multiple Headers Auth account"  
**Field:** Authorization header  
**Value:** `Bearer {MCP_AUTH_TOKEN from Railway}`

### Verification

**Before fix (2026-05-14 22:12 UTC):**
- Personal Assistant Core: ❌ Error execution #4024
- Prospector Agent Core: ❌ Error executions #4020, #4021
- Customer Service Core: ⚠️ Unknown (no recent executions)

**After fix (2026-05-14 22:30+ UTC):**
- Customer Service Core (Levi): ✅ Success executions #4050, #4052, #4055, #4059, #4061
- Meetings Agent Core (Sofer): ✅ Success execution #4065 with GMAIL_SEND_EMAIL 
- Personal Assistant Core: ⏳ Awaiting next test
- Prospector Agent Core: ⏳ Awaiting next test

**Railway logs confirm successful MCP operations:**
```
2026-05-14T22:31:07Z [INFO] mcp_account_selected slug="GMAIL_SEND_EMAIL" toolkit="gmail"
2026-05-14T22:31:08Z [INFO] mcp_tool_ok durationMs=1209 name="GMAIL_SEND_EMAIL"
```

## Affected Workflows

All workflows using Composio MCP tools were affected:

### ✅ Verified Working After Fix

1. **Customer Service Core (Levinnovation)** - ID: `n0mTwpONyCbbyn2E`
   - MCP tools: Slack, Gmail, Google Calendar, Google Drive, Tavily
   - Last success: 2026-05-14 22:30:35 UTC

2. **Meetings Agent Core (Levinnovation)** - ID: `yMhnGt1bBWUjBTZ5`
   - MCP tools: Google Calendar, Google Docs, Gmail, ClickUp
   - Last success: 2026-05-14 22:31:08 UTC
   - Confirmed GMAIL_SEND_EMAIL execution

### ⏳ Validated Configuration (Awaiting Runtime Test)

3. **Personal Assistant Core (Levinnovation)** - ID: `1USjs2JAP4tlHIcm`
   - MCP tools: Composio (all available tools)
   - Last error before fix: 2026-05-14 22:12:34 UTC

4. **Prospector Agent Core (Levinnovation)** - ID: `i06Dfr3BkClgMgT2`
   - MCP tools: Gmail, Google Calendar
   - Last error before fix: 2026-05-14 22:12:19 UTC

## Configuration Details

### MCP Endpoint

**URL:** `https://levinnovation.mcp.agentyx.one/mcp`  
**Service:** Railway `agx-demo-composio-mcp`  
**Transport:** Streamable HTTP  
**Authentication:** Bearer Token (httpMultipleHeadersAuth)

### n8n Credentials Using MCP

| Credential ID | Name | Used By |
|--------------|------|---------|
| `9udywSKQmBfbGfkw` | Multiple Headers Auth account | Customer Service Core, Personal Assistant Core |
| `KwXGwudCwIvTFfoJ` | Multiple Headers Auth account 2 | Meetings Agent Core |
| `Tl6qSBYCHTrpAIyg` | MCP Gmail Filtered | Prospector Agent Core |
| `4BOdWZY8OY95YBXu` | MCP Calendar Filtered | Prospector Agent Core |

**Note:** All credentials should use the same `MCP_AUTH_TOKEN` value from Railway.

## Recommendations

### 1. Token Management

- **Centralize token storage:** Consider using n8n's environment variables or a shared credential for the MCP token
- **Token rotation:** When rotating the `MCP_AUTH_TOKEN`, update ALL n8n credentials that reference it
- **Security:** The token was exposed in this conversation and should be rotated

### 2. Monitoring

- **Set up alerts** for MCP 401 errors in Railway logs
- **Monitor n8n execution failures** related to MCP tool calls
- **Create a health check workflow** that periodically tests MCP connectivity

### 3. Documentation

- **Update runbooks** to reference this incident
- **Document credential dependencies** in `knowledge/operations/composio-mcp-n8n-runbook.md`
- **Add troubleshooting steps** for MCP authentication failures

## Related Files

- **Runbook:** `knowledge/operations/composio-mcp-n8n-runbook.md`
- **Service README:** `services/composio-mcp/README.md`
- **Workflows:**
  - `tenants/levinnovation/assets/workflows/n8n/customer-service-core/`
  - `tenants/levinnovation/assets/workflows/n8n/personal-assistant-core/`
  - `tenants/levinnovation/assets/workflows/n8n/meetings-agent-core/`
  - `tenants/levinnovation/assets/workflows/n8n/prospector-agent-core/`

## Next Steps

1. ✅ **Completed:** Update n8n MCP credentials with correct token
2. ✅ **Completed:** Verify Customer Service and Meetings Agent workflows
3. ⏳ **Pending:** Test Personal Assistant and Prospector Agent workflows
4. ⏳ **Pending:** Rotate MCP_AUTH_TOKEN due to exposure
5. ⏳ **Pending:** Update all affected n8n credentials with new token
6. ⏳ **Pending:** Create monitoring dashboard for MCP health

---

*Incident resolved: 2026-05-14 22:30 UTC*  
*Documentation created: 2026-05-14 by AI agent*
