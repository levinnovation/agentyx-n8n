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
import json
import re
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
from .tools.composio import composio_mcp_execute, composio_mcp_list_actions

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
    composio_mcp_execute,
    composio_mcp_list_actions,
]


# ─── Prompt loaders ──────────────────────────────────────────

def _load_prompt(name: str) -> str:
    base = Path(__file__).parent / "prompts"
    path = (base / name).resolve()
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


# ─── Kapso reply helper (text + images) ──────────────────────

_IMAGE_MARKDOWN_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")


def _send_reply(phone_number: str, reply_text: str) -> dict:
    """Send reply via Kapso, extracting markdown images and sending them natively."""
    image_urls = _IMAGE_MARKDOWN_RE.findall(reply_text)
    if not image_urls:
        return send_text(phone_number, reply_text[:1200])

    # Strip markdown image syntax from text so WhatsApp doesn't show raw markdown
    clean_text = _IMAGE_MARKDOWN_RE.sub("", reply_text).strip()

    # Send each image (WhatsApp will show them in order)
    for _alt, url in image_urls:
        img_resp = send_image(phone_number, url)
        if not img_resp.get("success"):
            print(f"[kapso] send_image failed for {url}: {img_resp.get('error')}")

    # Send remaining text if any
    if clean_text:
        return send_text(phone_number, clean_text[:1200])

    return {"success": True}


# ─── Endpoints ───────────────────────────────────────────────

@app.post("/webhooks/kapso/inbound")
async def kapso_inbound(request: Request, x_kapso_signature: str | None = Header(None)):
    """Receive inbound WhatsApp messages from Kapso (supports both flat and nested/raw formats)."""
    raw_body = await request.json()

    # Detect format: raw Kapso nested vs flat normalized
    if isinstance(raw_body, dict) and "message" in raw_body and isinstance(raw_body["message"], dict):
        # Raw Kapso format
        msg = raw_body.get("message", {})
        conv = raw_body.get("conversation", {})

        message_text = ""
        media_url = None
        if msg.get("type") == "text" and msg.get("text"):
            message_text = msg["text"].get("body", "")
        elif msg.get("type") == "image" and msg.get("image"):
            message_text = msg["image"].get("caption", "[Image received]")
            media_url = msg["image"].get("link")
        elif msg.get("type") == "document" and msg.get("document"):
            message_text = msg["document"].get("caption", "[Document received]")
            media_url = msg["document"].get("link")
        elif msg.get("type") == "voice" and msg.get("voice"):
            message_text = "[Voice message received]"
            media_url = msg["voice"].get("link")

        payload = KapsoInboundPayload(
            message_id=msg.get("id", ""),
            phone_number="+" + (conv.get("phone_number") or msg.get("from") or ""),
            contact_name=conv.get("contact_name", ""),
            timestamp=raw_body.get("timestamp", ""),
            message_type=msg.get("type", "text"),
            text=message_text,
            media_url=media_url,
            caption=message_text if media_url else None,
            context_message_id=msg.get("context", {}).get("id") if isinstance(msg.get("context"), dict) else None,
        )
    else:
        # Flat normalized format
        payload = KapsoInboundPayload(**raw_body)

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
    kapso_resp = _send_reply(payload.phone_number, reply_text)
    if not kapso_resp.get("success"):
        # Log but don't fail the webhook
        print(f"[kapso] outbound failed: {kapso_resp.get('error')}")

    return {"status": "ok", "reply_sent": kapso_resp.get("success", False)}


def _build_intake_context(intake_data: dict, template_slug: str, user_message: str) -> str:
    """Build enriched context block from intake form data."""
    template = _load_prompt("intake_context.md")
    if not template:
        # Fallback if prompt file missing
        lines = ["[INTAKE DATA COMPLETADO]"]
        for k, v in intake_data.items():
            lines.append(f"- {k}: {v}")
        lines.append(f"- template: {template_slug}")
        return "\n".join(lines)

    # Simple substitution
    result = template
    result = result.replace("{{template_slug}}", template_slug)
    result = result.replace("{{user_message}}", user_message)
    for key, value in intake_data.items():
        placeholder = f"{{{{{key}}}}}"
        display = value
        if isinstance(value, list):
            display = ", ".join(str(v) for v in value)
        result = result.replace(placeholder, str(display))
    return result


@app.post("/agent/invoke")
async def agent_invoke(request: AgentInvokeRequest):
    """Invoke the agent directly (for n8n or testing)."""
    session = get_or_create_conversation(request.phone_number, request.conversation_id)

    # Store user message so history stays complete across turns
    append_message(
        request.phone_number,
        request.conversation_id,
        "user",
        request.message,
        {"message_id": request.message_id, "media_url": request.media_url},
    )

    raw_history = get_messages(request.phone_number, request.conversation_id, limit=20)
    history = []
    for msg in raw_history[:-1]:  # exclude the one we just added
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))

    context_parts = []
    if session.get("intake_progress"):
        context_parts.append(f"Intake progress: {session['intake_progress']}")
    if session.get("cart"):
        context_parts.append(f"Cart: {session['cart']}")

    # Inject intake context if present (backward compatible)
    intake_data = request.intake_data
    if isinstance(intake_data, str):
        try:
            intake_data = json.loads(intake_data) if intake_data != "null" else None
        except Exception:
            intake_data = None
    if intake_data:
        intake_context = _build_intake_context(
            intake_data,
            request.template_slug or "unknown",
            request.message,
        )
        context_parts.append(intake_context)

    context = "\n".join(context_parts)

    user_message = request.message
    if request.media_url:
        user_message += f"\n[Media: {request.media_url}]"

    try:
        result = invoke_agent(
            user_message=user_message,
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
    kapso_resp = _send_reply(request.phone_number, reply_text)
    if not kapso_resp.get("success"):
        print(f"[kapso] outbound failed: {kapso_resp.get('error')}")

    # Notify admin of new inquiry (enriched if intake present)
    admin_msg = f"Nueva consulta - Tel: {request.phone_number}"
    if request.intake_data and request.template_slug:
        admin_msg += f" - Intake: {request.template_slug} - Datos: {json.dumps(request.intake_data, ensure_ascii=False)[:200]}"
    else:
        admin_msg += f" - Msg: {request.message[:200]}"

    admin_notify = send_text(ADMIN_PHONE_NUMBER, admin_msg)
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
