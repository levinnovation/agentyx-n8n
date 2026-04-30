"""
Composio MCP tool executor.

Wraps the Composio Model Context Protocol (MCP) endpoint so the agent
can discover and invoke external actions (Bitrix24, Slack, etc.)
directly without leaving the LangGraph runtime.
"""

from __future__ import annotations

import json

import httpx
from langchain_core.tools import tool

from ..config import COMPOSIO_API_KEY, COMPOSIO_MCP_URL


def _composio_request(body: dict) -> dict:
    """Make a POST request to the Composio MCP endpoint."""
    if not COMPOSIO_API_KEY:
        return {"error": "COMPOSIO_API_KEY is not configured."}

    headers = {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json",
    }

    try:
        response = httpx.post(
            COMPOSIO_MCP_URL,
            headers=headers,
            json=body,
            timeout=60.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        return {
            "error": f"HTTP {e.response.status_code} from Composio",
            "detail": e.response.text[:500],
        }
    except Exception as e:
        return {"error": f"Composio request failed: {e}"}


@tool
def composio_mcp_execute(toolkit: str, action: str, params: str = "{}") -> str:
    """Execute an action via the Composio MCP endpoint.

    Use this tool to invoke external integrations (e.g. Bitrix24, Slack,
    Google Sheets, etc.) that are connected through Composio.

    Args:
        toolkit: Composio toolkit name (e.g. "bitrix24", "slack", "googlesheets").
        action: Action identifier (e.g. "bitrix24_create_lead").
        params: JSON string with action-specific parameters.
    """
    try:
        parsed_params = json.loads(params) if isinstance(params, str) else params
    except json.JSONDecodeError:
        return "Error: params must be a valid JSON string."

    body = {
        "toolkit": toolkit,
        "action": action,
        "params": parsed_params,
    }

    result = _composio_request(body)

    if "error" in result:
        return f"Composio error: {result['error']}"

    # Try to return a compact, readable representation
    return json.dumps(result, ensure_ascii=False, indent=2)


@tool
def composio_mcp_list_actions(toolkit: str) -> str:
    """List available actions for a given Composio toolkit.

    Use this to discover what actions are exposed by a toolkit before
    calling composio_mcp_execute.

    Args:
        toolkit: Composio toolkit name (e.g. "bitrix24", "slack").
    """
    body = {
        "toolkit": toolkit,
        "action": "list_actions",
        "params": {},
    }

    result = _composio_request(body)

    if "error" in result:
        # Fallback: try a generic toolkit_info call
        body["action"] = "toolkit_info"
        result = _composio_request(body)

    if "error" in result:
        return (
            f"Could not list actions for toolkit '{toolkit}'. "
            f"Composio error: {result['error']}"
        )

    return json.dumps(result, ensure_ascii=False, indent=2)
