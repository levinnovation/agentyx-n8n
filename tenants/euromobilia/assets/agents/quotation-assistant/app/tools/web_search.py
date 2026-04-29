"""
Web search tool using Tavily for product URLs and images.
"""

from __future__ import annotations

from langchain_core.tools import tool

from config import TAVILY_API_KEY


def _tavily_search(query: str, max_results: int = 3) -> list[dict]:
    if not TAVILY_API_KEY:
        return []
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_answer=False,
        )
        return response.get("results", [])
    except Exception as e:
        print(f"[web_search] Tavily error: {e}")
        return []


@tool
def web_search_product(product_name: str, brand: str = "") -> str:
    """Search the web for the official URL and product page of a specific product."""
    query = f"{brand} {product_name} official product page site:subzero-wolf.com OR site:cove.com".strip()
    results = _tavily_search(query, max_results=3)

    if not results:
        return f"No se encontraron páginas web para '{product_name}'."

    lines = []
    for r in results:
        title = r.get("title", "Sin título")
        url = r.get("url", "")
        snippet = r.get("content", "")[:200]
        lines.append(f"🔗 {title}\n   URL: {url}\n   {snippet}\n")

    return f"Resultados web para '{product_name}':\n\n" + "\n".join(lines)
