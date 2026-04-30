"""
Composio REST API tool executor.

Wraps the Composio backend API so the agent can discover and invoke
external actions (Bitrix24, Slack, Google Sheets, etc.).
"""

from __future__ import annotations

import json

import httpx
from langchain_core.tools import tool

from ..config import COMPOSIO_API_KEY, COMPOSIO_BASE_URL


def _api_headers() -> dict:
    return {
        "x-api-key": COMPOSIO_API_KEY,
        "Content-Type": "application/json",
    }


def _fetch_all_actions() -> list[dict]:
    """Fetch all available actions from Composio (cached per process)."""
    if not COMPOSIO_API_KEY:
        return []
    url = f"{COMPOSIO_BASE_URL}/actions"
    try:
        response = httpx.get(
            url,
            headers=_api_headers(),
            timeout=30.0,
            follow_redirects=True,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("items", [])
    except Exception:
        return []


# Simple in-memory cache for actions list
_CACHED_ACTIONS: list[dict] | None = None


def _get_actions() -> list[dict]:
    global _CACHED_ACTIONS
    if _CACHED_ACTIONS is None:
        _CACHED_ACTIONS = _fetch_all_actions()
    return _CACHED_ACTIONS


def _get_toolkit_names() -> list[str]:
    """Return sorted list of unique toolkit/app names available."""
    actions = _get_actions()
    names = set()
    for a in actions:
        name = a.get("appName") or a.get("appKey")
        if name:
            names.add(name)
    return sorted(names)


@tool
def composio_mcp_list_actions(toolkit: str) -> str:
    """List available actions for a given Composio toolkit.

    Use this to discover what actions are exposed by a toolkit before
    calling composio_mcp_execute.

    Args:
        toolkit: Composio toolkit/app name (e.g. "bitrix24", "slack",
                 "googlesheets").
    """
    actions = _get_actions()
    if not actions:
        return "Error: COMPOSIO_API_KEY is not configured or the API is unreachable."

    toolkit_lower = toolkit.lower()
    filtered = [
        a for a in actions
        if toolkit_lower in (a.get("appName") or "").lower()
        or toolkit_lower in (a.get("appKey") or "").lower()
    ]

    if not filtered:
        available = _get_toolkit_names()
        available_str = ", ".join(available[:30]) + ("..." if len(available) > 30 else "")
        return (
            f"No actions found for toolkit '{toolkit}'.\n"
            f"Available toolkits in your Composio account: {available_str}\n"
            f"(Total: {len(available)} toolkits)"
        )

    summary = [f"Actions for '{toolkit}':"]
    for a in filtered:
        display = a.get("displayName") or a.get("display_name") or a.get("description", "No description")
        summary.append(f"- {a.get('name', 'unknown')}: {display}")

    return "\n".join(summary[:50])  # cap output length


@tool
def composio_mcp_execute(toolkit: str, action: str, params: str = "{}") -> str:
    """Execute an action via the Composio API.

    Use this tool to invoke external integrations (e.g. Bitrix24, Slack,
    Google Sheets, etc.) that are connected through Composio.

    Args:
        toolkit: Composio toolkit/app name (e.g. "bitrix24", "slack").
        action: Action identifier (e.g. "bitrix24_create_lead").
        params: JSON string with action-specific parameters.
    """
    if not COMPOSIO_API_KEY:
        return "Error: COMPOSIO_API_KEY is not configured."

    try:
        parsed_params = json.loads(params) if isinstance(params, str) else params
    except json.JSONDecodeError:
        return "Error: params must be a valid JSON string."

    url = f"{COMPOSIO_BASE_URL}/actions/{action}/execute"
    try:
        response = httpx.post(
            url,
            headers=_api_headers(),
            json={"input": parsed_params},
            timeout=60.0,
            follow_redirects=True,
        )
        response.raise_for_status()
        result = response.json()
        return json.dumps(result, ensure_ascii=False, indent=2)
    except httpx.HTTPStatusError as e:
        return f"HTTP {e.response.status_code} from Composio: {e.response.text[:500]}"
    except Exception as e:
        return f"Composio request failed: {e}"
