"""
Supabase-backed conversation memory keyed by phone_number + conversation_id.

Tracks:
- contact_name
- intake progress
- cart (quoted items)
- handoff state

Do not reset active quote unless user explicitly requests a new quotation.
"""

from __future__ import annotations

from typing import Any

from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def get_or_create_conversation(phone_number: str, conversation_id: str) -> dict:
    """Get or create a conversation record."""
    sb = _get_client()
    resp = (
        sb.table("chat_sessions")
        .select("*")
        .eq("phone_number", phone_number)
        .eq("conversation_id", conversation_id)
        .limit(1)
        .execute()
    )
    data = resp.data or []
    if data:
        return data[0]

    # Create new session
    insert_resp = (
        sb.table("chat_sessions")
        .insert({
            "phone_number": phone_number,
            "conversation_id": conversation_id,
            "title": f"Cotización {phone_number}",
            "contact_name": "",
            "intake_progress": {},
            "cart": [],
            "handoff_state": "auto",
        })
        .execute()
    )
    return (insert_resp.data or [{}])[0]


def append_message(phone_number: str, conversation_id: str, role: str, content: str, metadata: dict | None = None) -> None:
    """Append a message to the conversation history."""
    sb = _get_client()
    session = get_or_create_conversation(phone_number, conversation_id)
    sb.table("chat_messages").insert({
        "session_id": session["id"],
        "role": role,
        "content": content,
        "metadata": metadata or {},
    }).execute()


def get_messages(phone_number: str, conversation_id: str, limit: int = 50) -> list[dict]:
    """Retrieve recent messages for a conversation."""
    sb = _get_client()
    session = get_or_create_conversation(phone_number, conversation_id)
    resp = (
        sb.table("chat_messages")
        .select("*")
        .eq("session_id", session["id"])
        .order("created_at", desc=False)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def update_session_state(phone_number: str, conversation_id: str, updates: dict) -> dict:
    """Update mutable session state (intake_progress, cart, handoff_state, contact_name)."""
    sb = _get_client()
    session = get_or_create_conversation(phone_number, conversation_id)
    resp = (
        sb.table("chat_sessions")
        .update(updates)
        .eq("id", session["id"])
        .execute()
    )
    return (resp.data or [{}])[0]


def reset_cart(phone_number: str, conversation_id: str) -> dict:
    """Clear the cart. Only call when user explicitly requests a new quotation."""
    return update_session_state(phone_number, conversation_id, {"cart": [], "intake_progress": {}})
