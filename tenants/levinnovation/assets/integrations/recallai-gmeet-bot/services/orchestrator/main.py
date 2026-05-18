"""
Recall.ai Bot Orchestrator
Creates Recall.ai bots to join Google Meet calls on behalf of Sofer.
"""
import os
from typing import Optional

import httpx
import structlog
from fastapi import FastAPI, HTTPException
from google.cloud import secretmanager
from pydantic import BaseModel, Field

logger = structlog.get_logger()
app = FastAPI(title="Recall.ai Bot Orchestrator (Sofer)")

PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "agentyx-493918")
REGION = os.environ.get("REGION", "us-east4")
RECALL_API_BASE = os.environ.get("RECALL_API_BASE", "https://us-east-1.recall.ai/api/v1")

_secret_client = None

def get_secret(name: str) -> str:
    global _secret_client
    if _secret_client is None:
        _secret_client = secretmanager.SecretManagerServiceClient()
    path = f"projects/{PROJECT_ID}/secrets/{name}/versions/latest"
    response = _secret_client.access_secret_version(request={"name": path})
    return response.payload.data.decode("UTF-8")

class CreateBotRequest(BaseModel):
    meeting_url: str = Field(..., description="Google Meet URL")
    meeting_title: Optional[str] = Field(default="", description="Human-readable title")
    meeting_date: Optional[str] = Field(default="", description="ISO8601 datetime")
    join_at: Optional[str] = Field(default=None, description="ISO8601 datetime for scheduled join")
    google_login_group_id: Optional[str] = Field(default=None, description="Recall.ai Google Login Group ID")
    bot_name: Optional[str] = Field(default="Sofer", description="Bot display name")
    transcription_provider: Optional[str] = Field(default="default", description="Transcription provider")

class CreateBotResponse(BaseModel):
    status: str
    bot_id: Optional[str]
    recall_status: Optional[str]
    meeting_url: str
    join_at: Optional[str]

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/bot/create", response_model=CreateBotResponse)
async def create_bot(req: CreateBotRequest):
    try:
        api_key = get_secret("recall-api-key")
    except Exception as e:
        logger.error("failed_to_fetch_secret", error=str(e))
        raise HTTPException(status_code=500, detail="Service misconfiguration")

    payload = {
        "meeting_url": req.meeting_url,
        "bot_name": req.bot_name,
        "transcription_options": {"provider": req.transcription_provider},
        "metadata": {
            "source": "levinnovation-gcp-orchestrator",
            "meeting_title": req.meeting_title,
            "meeting_date": req.meeting_date,
            "tenant": "levinnovation",
        },
    }

    if req.google_login_group_id:
        payload["google_meet"] = {"google_login_group_id": req.google_login_group_id}

    if req.join_at:
        payload["join_at"] = req.join_at

    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{RECALL_API_BASE}/bot/",
                json=payload,
                headers=headers,
                timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as exc:
            logger.error("recall_api_error", status=exc.response.status_code, body=exc.response.text)
            raise HTTPException(status_code=exc.response.status_code, detail=exc.response.text)
        except Exception as exc:
            logger.error("recall_api_exception", error=str(exc))
            raise HTTPException(status_code=502, detail="Upstream error")

    logger.info("bot_created", bot_id=data.get("id"), meeting_url=req.meeting_url)

    return CreateBotResponse(
        status="bot_created",
        bot_id=data.get("id"),
        recall_status=data.get("status"),
        meeting_url=req.meeting_url,
        join_at=req.join_at,
    )
