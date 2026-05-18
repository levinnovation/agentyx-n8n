"""
Recall.ai Webhook Receiver
Receives Recall.ai lifecycle webhooks, validates signatures, fetches transcripts,
and forwards to meetings-agent-core.
"""
import json
import os
from typing import Optional

import httpx
import structlog
from fastapi import FastAPI, Header, HTTPException, Request
from google.cloud import secretmanager
from pydantic import BaseModel, Field

logger = structlog.get_logger()
app = FastAPI(title="Recall.ai Webhook Receiver (Sofer)")

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "agentyx-493918")
RECALL_API_BASE = os.environ.get("RECALL_API_BASE", "https://us-east-1.recall.ai/api/v1")
MEETINGS_AGENT_CORE_URL = os.environ.get(
    "MEETINGS_AGENT_CORE_URL",
    "https://levinnovation.n8n.agentyx.one/webhook/sofer-transcript"
)

_secret_client = None

def get_secret(name: str) -> str:
    global _secret_client
    if _secret_client is None:
        _secret_client = secretmanager.SecretManagerServiceClient()
    path = f"projects/{PROJECT_ID}/secrets/{name}/versions/latest"
    response = _secret_client.access_secret_version(request={"name": path})
    return response.payload.data.decode("UTF-8")

class RecallEvent(BaseModel):
    event: str = Field(..., description="Event type, e.g. bot.status_change")
    bot_id: Optional[str] = Field(default=None, alias="bot_id")
    status: Optional[str] = Field(default=None)
    meeting_url: Optional[str] = Field(default=None)
    transcript: Optional[dict] = Field(default=None)
    recording: Optional[dict] = Field(default=None)
    data: Optional[dict] = Field(default=None)

    class Config:
        populate_by_name = True

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/webhook/recallai")
async def receive_webhook(
    request: Request,
    x_recall_ai_secret: Optional[str] = Header(default=None, alias="x-recall-ai-secret"),
):
    try:
        expected_secret = get_secret("recall-webhook-secret")
    except Exception as e:
        logger.error("failed_to_fetch_secret", error=str(e))
        raise HTTPException(status_code=500, detail="Service misconfiguration")

    if not x_recall_ai_secret or x_recall_ai_secret != expected_secret:
        logger.warning("invalid_webhook_secret")
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    logger.info("webhook_received", event=body.get("event"), bot_id=body.get("bot", {}).get("id"))

    event_type = body.get("event", "")
    bot_data = body.get("bot", body.get("data", {}))
    bot_id = bot_data.get("id") if isinstance(bot_data, dict) else None

    if event_type == "bot.transcript_completed" and bot_id:
        await handle_transcript_ready(bot_id, bot_data)
    elif event_type == "bot.status_change":
        logger.info("status_change", bot_id=bot_id, status=bot_data.get("status"))
        # Optionally forward status updates to a monitoring endpoint

    return {"status": "received"}

async def handle_transcript_ready(bot_id: str, bot_data: dict):
    try:
        api_key = get_secret("recall-api-key")
    except Exception as e:
        logger.error("failed_to_fetch_api_key", error=str(e))
        return

    # Fetch transcript from Recall.ai
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{RECALL_API_BASE}/bot/{bot_id}/transcript/",
                headers={"Authorization": f"Token {api_key}"},
                timeout=30.0,
            )
            resp.raise_for_status()
            transcript_data = resp.json()
        except Exception as exc:
            logger.error("transcript_fetch_failed", bot_id=bot_id, error=str(exc))
            return

    # Normalize transcript into plain text
    transcript_text = ""
    if isinstance(transcript_data, list):
        transcript_text = "\n".join(
            f"{chunk.get('speaker', 'Unknown')}: {chunk.get('text', '')}"
            for chunk in transcript_data
        )
    elif isinstance(transcript_data, dict) and "text" in transcript_data:
        transcript_text = transcript_data["text"]
    else:
        transcript_text = json.dumps(transcript_data)

    # Forward to meetings-agent-core
    forward_payload = {
        "trigger_source": "recallai-webhook",
        "meeting_id": bot_id,
        "meeting_url": bot_data.get("meeting_url", ""),
        "transcript_text": transcript_text,
        "metadata": {
            "recall_bot_id": bot_id,
            "recall_event": "bot.transcript_completed",
            "recall_status": bot_data.get("status"),
            "transcript_raw": transcript_data,
        },
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                MEETINGS_AGENT_CORE_URL,
                json=forward_payload,
                timeout=60.0,
            )
            resp.raise_for_status()
            logger.info("forwarded_to_core", bot_id=bot_id, status=resp.status_code)
        except Exception as exc:
            logger.error("forward_to_core_failed", bot_id=bot_id, error=str(exc))
