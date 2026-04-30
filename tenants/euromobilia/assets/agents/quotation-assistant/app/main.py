"""
FastAPI entry point for the Euromobilia Quotation Assistant.

Endpoints:
- POST /webhooks/kapso/inbound   (deduped by message_id)
- POST /agent/invoke
- GET  /health
- GET  /graph/info
"""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from .graph import get_agent, invoke_agent
from .models import (
    AgentInvokeRequest,
    AgentInvokeResponse,
    HealthCheck,
    Intent,
    KapsoInboundPayload,
)
from .memory import (
    append_message,
    get_messages,
    get_or_create_conversation,
    update_session_state,
)
from .config import ADMIN_PHONE_NUMBER
from .kapso import send_text, send_document, send_image
from .tools.catalog_search import query_product_catalog, list_price_lists
from .tools.document_search import search_documents, read_document_content
from .tools.nomenclature import decode_product_nomenclature
from .tools.web_search import web_search_product
from .tools.image_gen import generate_quotation_image, describe_reference_image
from .tools.product_image import search_product_image
from .tools.quote_pdf import generate_quotation_pdf

app = FastAPI(title="Euromobilia Quotation Assistant")

# ─── Dedup cache (in-memory; replace with Redis in production) ─
_seen_message_ids: dict[str, float] = {}
DEDUP_TTL_SECONDS = 300


def _is_duplicate(message_id: str) -> bool:
    now = time.time()
    if message_id in _seen_message_ids:
        if now - _seen_message_ids[message_id] < DEDUP_TTL_SECONDS:
            return True
    _seen_message_ids[message_id] = now
    # Prune old entries
    for mid in list(_seen_message_ids.keys()):
        if now - _seen_message_ids[mid] > DEDUP_TTL_SECONDS:
            del _seen_message_ids[mid]
    return False


# ─── Tool registry ───────────────────────────────────────────
_tools = [
    query_product_catalog,
    list_price_lists,
    search_documents,
    read_document_content,
    decode_product_nomenclature,
    web_search_product,
    generate_quotation_image,
    describe_reference_image,
    search_product_image,
    generate_quotation_pdf,
]


# ─── Prompt loaders ──────────────────────────────────────────

def _load_prompt(name: str) -> str:
    base = Path(__file__).parent.parent / ".." / ".." / "prompts"
    path = (base / name).resolve()
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


# ─── Endpoints ───────────────────────────────────────────────

@app.post("/webhooks/kapso/inbound")
async def kapso_inbound(payload: KapsoInboundPayload, x_kapso_signature: str | None = Header(None)):
    """Receive inbound WhatsApp messages from Kapso."""
    if _is_duplicate(payload.message_id):
        return JSONResponse(status_code=204)

    # Optional: validate HMAC signature here using KAPSO_WEBHOOK_SECRET

    conversation_id = payload.phone_number  # simple mapping
    session = get_or_create_conversation(payload.phone_number, conversation_id)

    # Append user message
    append_message(
        payload.phone_number,
        conversation_id,
        "user",
        payload.text or payload.caption or "",
        {"message_id": payload.message_id, "media_url": payload.media_url},
    )

    # Build history
    raw_history = get_messages(payload.phone_number, conversation_id, limit=20)
    history = []
    for msg in raw_history[:-1]:  # exclude the one we just added
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))

    # Invoke agent
    context_parts = []
    if session.get("intake_progress"):
        context_parts.append(f"Intake progress: {session['intake_progress']}")
    if session.get("cart"):
        context_parts.append(f"Cart: {session['cart']}")
    context = "\n".join(context_parts)

    user_text = payload.text or payload.caption or ""
    if payload.media_url:
        user_text += f"\n[Media: {payload.media_url}]"

    try:
        result = invoke_agent(
            user_message=f"CANAL: WHATSAPP\n{user_text}",
            tools=_tools,
            history=history,
            context=context,
        )
    except Exception as e:
        append_message(payload.phone_number, conversation_id, "assistant", f"[Error] {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

    # Extract reply
    last_msg = result["messages"][-1]
    reply_text = getattr(last_msg, "content", str(last_msg))

    # Append assistant message
    append_message(payload.phone_number, conversation_id, "assistant", reply_text)

    # Send reply via Kapso (fire-and-forget; failures logged)
    kapso_resp = send_text(payload.phone_number, reply_text[:1200])
    if not kapso_resp.get("success"):
        # Log but don't fail the webhook
        print(f"[kapso] outbound failed: {kapso_resp.get('error')}")

    return {"status": "ok", "reply_sent": kapso_resp.get("success", False)}


@app.post("/agent/invoke")
async def agent_invoke(request: AgentInvokeRequest):
    """Invoke the agent directly (for n8n or testing)."""
    session = get_or_create_conversation(request.phone_number, request.conversation_id)
    raw_history = get_messages(request.phone_number, request.conversation_id, limit=20)
    history = []
    for msg in raw_history:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))

    context_parts = []
    if session.get("intake_progress"):
        context_parts.append(f"Intake progress: {session['intake_progress']}")
    if session.get("cart"):
        context_parts.append(f"Cart: {session['cart']}")
    context = "\n".join(context_parts)

    try:
        result = invoke_agent(
            user_message=request.message,
            tools=_tools,
            history=history,
            context=context,
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

    last_msg = result["messages"][-1]
    reply_text = getattr(last_msg, "content", str(last_msg))

    append_message(request.phone_number, request.conversation_id, "assistant", reply_text)

    # Send reply via Kapso WhatsApp
    kapso_resp = send_text(request.phone_number, reply_text[:1200])
    if not kapso_resp.get("success"):
        print(f"[kapso] outbound failed: {kapso_resp.get('error')}")

    # Notify admin of new inquiry
    admin_notify = send_text(
        ADMIN_PHONE_NUMBER,
        f"Nueva consulta - Tel: {request.phone_number} - Msg: {request.message[:200]}"
    )
    if not admin_notify.get("success"):
        print(f"[kapso] admin notify failed: {admin_notify.get('error')}")

    return AgentInvokeResponse(
        reply_text=reply_text,
        intent=request.intent_hint or Intent.unknown,
        tools_called=[],
    )


@app.get("/health")
async def health():
    """Health check with KB and catalog stats."""
    from .knowledge.sync import ensure_index_loaded, fetch_product_count, fetch_price_entry_count

    kb_ok = ensure_index_loaded()
    product_count = fetch_product_count()
    price_count = fetch_price_entry_count()

    return HealthCheck(
        status="healthy",
        version="1.1.0",
        kb_loaded=kb_ok,
        product_count=product_count,
        price_count=price_count,
    )


@app.get("/graph/info")
async def graph_info():
    """Return graph structure info."""
    agent = get_agent(_tools)
    return {
        "nodes": list(agent.get_graph().nodes.keys()),
        "entry_point": agent.get_graph().entry_point,
    }
