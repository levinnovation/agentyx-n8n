"""
Configuration for the Euromobilia Quotation Assistant.

Environment variables expected:
- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY (direct) or OPENROUTER_API_KEY (routed)
- LANGCHAIN_API_KEY / LANGCHAIN_PROJECT
- TAVILY_API_KEY
- REPLICATE_API_TOKEN
- KAPSO_API_KEY / KAPSO_BASE_URL
- BITRIX24_WEBHOOK_URL
- SLACK_WEBHOOK_URL
- COMPOSIO_API_KEY
"""

from __future__ import annotations

import os

# ─── Supabase ────────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# ─── LLM Provider Detection ──────────────────────────────────
# Priority: OPENAI_API_KEY (direct) > OPENROUTER_API_KEY (routed)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

if OPENAI_API_KEY:
    LLM_API_KEY = OPENAI_API_KEY
    LLM_BASE_URL = None
    LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")
    EMBEDDING_MODEL = "text-embedding-3-small"
else:
    LLM_API_KEY = OPENROUTER_API_KEY
    LLM_BASE_URL = OPENROUTER_BASE_URL
    LLM_MODEL = os.environ.get("LLM_MODEL", "openai/gpt-4o")
    EMBEDDING_MODEL = "openai/text-embedding-3-small"

EMBEDDING_DIMENSION = 1536

# ─── OpenRouter Free Fallback Models ─────────────────────────

OPENROUTER_FREE_FALLBACKS: dict[str, list[str]] = {
    "reasoning": [
        "deepseek/deepseek-r1:free",
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b:free",
    ],
    "fast": [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b:free",
        "deepseek/deepseek-r1:free",
    ],
    "coding": [
        "google/gemini-2.0-flash-exp:free",
        "deepseek/deepseek-r1:free",
        "meta-llama/llama-3.3-70b:free",
    ],
}

_MODEL_TIER_MAP: dict[str, str] = {
    "openai/gpt-4o": "reasoning",
    "openai/gpt-4o-mini": "fast",
    "openai/gpt-4-turbo": "reasoning",
    "anthropic/claude": "reasoning",
    "x-ai/grok": "reasoning",
    "google/gemini-2.0-flash": "fast",
    "google/gemini-2.5-flash": "fast",
    "google/gemini-pro": "reasoning",
    "meta-llama/llama": "reasoning",
    "deepseek/deepseek": "reasoning",
    "nousresearch/": "fast",
    "mistralai/": "reasoning",
    "qwen/": "coding",
}


def get_fallback_models(primary_model: str) -> list[str]:
    """Return ordered list of free fallback models for the given primary model."""
    tier = "reasoning"
    model_lower = primary_model.lower()
    for prefix, t in _MODEL_TIER_MAP.items():
        if model_lower.startswith(prefix):
            tier = t
            break
    fallbacks = OPENROUTER_FREE_FALLBACKS.get(tier, OPENROUTER_FREE_FALLBACKS["reasoning"])
    return [m for m in fallbacks if m != primary_model]

# ─── LangSmith tracing ───────────────────────────────────────

LANGCHAIN_API_KEY = os.environ.get("LANGCHAIN_API_KEY", "")
LANGCHAIN_PROJECT = os.environ.get("LANGCHAIN_PROJECT", "euromobilia-quotation")

# ─── Tavily (web search) ─────────────────────────────────────

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

# ─── Image generation ────────────────────────────────────────

IMAGE_GEN_PROVIDER = os.environ.get("IMAGE_GEN_PROVIDER", "pollinations")

# ─── FAISS index persistence ─────────────────────────────────

_LOCAL_DATA = os.path.join(os.path.dirname(__file__), ".data", "faiss_index")
FAISS_INDEX_DIR = os.environ.get("FAISS_INDEX_DIR", _LOCAL_DATA)

# ─── Kapso ───────────────────────────────────────────────────

KAPSO_API_KEY = os.environ.get("KAPSO_API_KEY", "")
KAPSO_BASE_URL = os.environ.get("KAPSO_BASE_URL", "https://api.kapso.ai/meta/whatsapp/v24.0")
KAPSO_PHONE_NUMBER_ID = os.environ.get("KAPSO_PHONE_NUMBER_ID", "")
KAPSO_WEBHOOK_SECRET = os.environ.get("KAPSO_WEBHOOK_SECRET", "")
ADMIN_PHONE_NUMBER = os.environ.get("ADMIN_PHONE_NUMBER", "")

# ─── Bitrix24 ────────────────────────────────────────────────

BITRIX24_WEBHOOK_URL = os.environ.get("BITRIX24_WEBHOOK_URL", "")

# ─── Slack ───────────────────────────────────────────────────

SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")

# ─── Composio ────────────────────────────────────────────────

COMPOSIO_API_KEY = os.environ.get("COMPOSIO_API_KEY", "")
