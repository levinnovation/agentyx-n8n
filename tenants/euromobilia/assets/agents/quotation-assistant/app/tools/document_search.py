"""
Document search tools — provides access to indexed catalogs,
nomenclature files, and other reference documents.

Uses both FAISS vector store (semantic search) and Supabase
direct queries (full-text / ILIKE) as fallback.
"""

from __future__ import annotations

from langchain_core.tools import tool
from supabase import create_client, Client

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from ..knowledge.vector_store import search as vector_search, get_store

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


TABLE_NAME = "document_contents"

CATEGORY_MAP = {
    "catalog": ["catalog", "catalog_electro", "catalog_muebles"],
    "price_list": ["price_list", "price_list_electro", "price_list_muebles"],
    "nomenclatura": ["nomenclatura"],
    "all": [],
}


def _extract_snippet(text: str, keyword: str, max_len: int = 500) -> str:
    if not text:
        return ""
    lower = text.lower()
    kw_lower = keyword.lower()
    idx = lower.find(kw_lower)
    if idx == -1:
        return text[:max_len] + ("…" if len(text) > max_len else "")
    start = max(0, idx - max_len // 2)
    end = min(len(text), start + max_len)
    snippet = text[start:end]
    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet += "…"
    return snippet


def _supabase_search(query: str, category: str | None = None, limit: int = 10) -> list[dict]:
    try:
        sb = _get_client()
        q = sb.table(TABLE_NAME).select("filename, category, content_text")

        if category and category != "all":
            categories = CATEGORY_MAP.get(category, [category])
            if len(categories) == 1:
                q = q.eq("category", categories[0])
            elif categories:
                q = q.in_("category", categories)

        keywords = query.strip().split()
        for kw in keywords[:3]:
            escaped = kw.replace("%", r"\%").replace("_", r"\_")
            q = q.or_(f"content_text.ilike.%{escaped}%,filename.ilike.%{escaped}%")

        resp = q.limit(limit).execute()
        data = resp.data or []

        results = []
        for row in data:
            snippet = _extract_snippet(row["content_text"], keywords[0] if keywords else query)
            results.append({
                "filename": row["filename"],
                "category": row["category"],
                "snippet": snippet,
            })
        return results
    except Exception as e:
        print(f"[document_search] supabase_search error: {e}")
        return []


def _vector_search_documents(query: str, category: str | None = None, k: int = 8) -> list[dict]:
    store = get_store()
    if store is None:
        return _supabase_search(query, category)

    docs = vector_search(query, k=k, category=category)
    results = []
    seen_files: set[str] = set()
    for doc in docs:
        filename = doc.metadata.get("filename", "unknown")
        cat = doc.metadata.get("category", "other")
        if filename in seen_files:
            continue
        seen_files.add(filename)
        results.append({
            "filename": filename,
            "category": cat,
            "snippet": doc.page_content[:500],
        })
    return results


@tool
def search_documents(query: str, document_type: str = "all") -> str:
    """
    Search indexed catalogs and documents for technical specs, dimensions,
    and product details.

    IMPORTANT: Use for technical details ONLY. NEVER use for prices.
    Prices come exclusively from query_product_catalog.
    """
    category = document_type if document_type in CATEGORY_MAP else "all"
    results = _vector_search_documents(query, category=category)

    if not results:
        return (
            f"No se encontraron documentos relevantes para '{query}' "
            f"(tipo: {document_type}). Intenta con otros términos."
        )

    lines = []
    for r in results:
        lines.append(f"📄 {r['filename']} [{r['category']}]\n   {r['snippet']}\n")

    return (
        f"Resultados de búsqueda en documentos ({len(results)} encontrados):\n\n"
        + "\n".join(lines)
        + "\nEstos documentos son para referencia técnica. "
        "Los PRECIOS solo provienen de query_product_catalog."
    )


@tool
def read_document_content(filename: str) -> str:
    """Read the full extracted text content of a specific document."""
    try:
        sb = _get_client()
        resp = (
            sb.table(TABLE_NAME)
            .select("content_text, category")
            .eq("filename", filename)
            .limit(1)
            .execute()
        )
        data = resp.data
        if not data:
            return f"No se encontró el documento '{filename}' en el índice."

        content = data[0].get("content_text", "")
        category = data[0].get("category", "unknown")
        max_chars = 15_000
        if len(content) > max_chars:
            content = content[:max_chars] + f"\n\n... [Truncado — {len(content)} caracteres total]"

        return f"Contenido del documento: {filename} [{category}]\n\n{content}"
    except Exception as e:
        return f"Error leyendo documento '{filename}': {e}"
