import os
from dotenv import load_dotenv

load_dotenv()

LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))

# ─── LangSmith tracing ───────────────────────────────────────

LANGSMITH_ENABLED = os.environ.get("LANGSMITH_ENABLED", "true").lower() in ("1", "true", "yes")
LANGCHAIN_API_KEY = os.environ.get("LANGCHAIN_API_KEY", "")
LANGCHAIN_PROJECT = os.environ.get("LANGCHAIN_PROJECT", "{{tenant_id}}-{{asset_id}}")
LANGCHAIN_ENDPOINT = os.environ.get("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")

# ─── Better Auth JWT verification ────────────────────────────

BETTER_AUTH_JWKS_URL = os.environ.get("BETTER_AUTH_JWKS_URL", "")
BETTER_AUTH_ISSUER = os.environ.get("BETTER_AUTH_ISSUER", "")
BETTER_AUTH_AUDIENCE = os.environ.get("BETTER_AUTH_AUDIENCE", "agent")
AUTH_REQUIRED = os.environ.get("AUTH_REQUIRED", "false").lower() in ("1", "true", "yes")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")
