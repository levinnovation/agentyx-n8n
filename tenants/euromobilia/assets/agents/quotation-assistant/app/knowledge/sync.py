"""
Knowledge sync pipeline — pulls latest products, prices, and documents
from Supabase and rebuilds the FAISS vector index.

Can be triggered:
- On app startup (warm start)
- Via an on-demand HTTP endpoint
- From the n8n kb-ingest workflow
"""

from __future__ import annotations

import time
from datetime import datetime

from supabase import create_client, Client

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from .vector_store import build_index, is_index_stale, get_store

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


def fetch_all_documents() -> list[dict]:
    """Fetch all rows from the document_contents table."""
    sb = _get_client()
    all_docs: list[dict] = []
    page_size = 100
    offset = 0

    while True:
        resp = (
            sb.table("document_contents")
            .select("filename, category, content_text")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        data = resp.data or []
        all_docs.extend(data)

        if len(data) < page_size:
            break
        offset += page_size

    return all_docs


def fetch_product_count() -> int:
    """Fetch total product count for health reporting."""
    try:
        sb = _get_client()
        resp = sb.table("products").select("id", count="exact").execute()
        return resp.count or 0
    except Exception:
        return -1


def fetch_price_entry_count() -> int:
    """Fetch total price_entries count for health reporting."""
    try:
        sb = _get_client()
        resp = sb.table("price_entries").select("id", count="exact").execute()
        return resp.count or 0
    except Exception:
        return -1


def sync_knowledge_base(force: bool = False) -> dict:
    """Synchronize the knowledge base."""
    start = time.time()
    status: dict = {
        "started_at": datetime.utcnow().isoformat(),
        "documents_fetched": 0,
        "index_rebuilt": False,
        "was_stale": False,
        "products_count": 0,
        "prices_count": 0,
        "error": None,
    }

    try:
        documents = fetch_all_documents()
        status["documents_fetched"] = len(documents)

        stale = is_index_stale(documents)
        status["was_stale"] = stale

        if stale or force:
            build_index(documents)
            status["index_rebuilt"] = True

        status["products_count"] = fetch_product_count()
        status["prices_count"] = fetch_price_entry_count()

    except Exception as e:
        status["error"] = str(e)
        print(f"[sync] Error during knowledge base sync: {e}")

    status["duration_seconds"] = round(time.time() - start, 2)
    status["completed_at"] = datetime.utcnow().isoformat()

    return status


def ensure_index_loaded() -> bool:
    """Ensure the FAISS index is loaded."""
    store = get_store()
    if store is not None:
        return True

    print("[sync] No FAISS index found. Triggering full sync...")
    result = sync_knowledge_base(force=True)
    if result.get("error"):
        print(f"[sync] Full sync failed: {result['error']}")
        return False

    return get_store() is not None
