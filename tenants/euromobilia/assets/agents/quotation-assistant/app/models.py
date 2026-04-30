"""
Pydantic models for the Quotation Assistant.
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class Intent(str, Enum):
    sales_lead = "sales_lead"
    support = "support"
    scheduling = "scheduling"
    human_handoff = "human_handoff"
    quotation_continue = "quotation_continue"
    quotation_consolidate = "quotation_consolidate"
    quotation_new = "quotation_new"
    unknown = "unknown"


class KapsoInboundPayload(BaseModel):
    message_id: str
    phone_number: str
    contact_name: str = ""
    timestamp: str
    message_type: Literal["text", "image", "document", "voice", "location"]
    text: str | None = None
    media_url: str | None = None
    caption: str | None = None
    context_message_id: str | None = None


class KapsoRawPayload(BaseModel):
    """Raw Kapso webhook payload (nested format)."""
    message: dict | None = None
    conversation: dict | None = None


class AgentInvokeRequest(BaseModel):
    phone_number: str
    conversation_id: str
    message: str
    contact_name: str = ""
    media_url: str | None = None
    message_id: str = ""
    intent_hint: Intent | None = None
    intake_data: dict | str | None = None
    template_slug: str | None = None


class AgentInvokeResponse(BaseModel):
    reply_text: str
    reply_type: Literal["text", "image", "document"] = "text"
    media_url: str | None = None
    intent: Intent
    handoff_triggered: bool = False
    tools_called: list[str] = Field(default_factory=list)


class HealthCheck(BaseModel):
    status: str
    version: str
    kb_loaded: bool
    product_count: int
    price_count: int
