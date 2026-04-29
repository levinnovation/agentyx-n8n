"""
Product image resolver — finds product images by code/model.
"""

from __future__ import annotations

import re
from langchain_core.tools import tool
from supabase import create_client, Client

from ..config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TAVILY_API_KEY

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


BRAND_SITES = {
    "wolf": "subzero-wolf.com",
    "sub-zero": "subzero-wolf.com",
    "sub zero": "subzero-wolf.com",
    "subzero": "subzero-wolf.com",
    "cove": "subzero-wolf.com",
}


def _db_lookup_image(product_code: str) -> dict | None:
    try:
        sb = _get_client()
        resp = (
            sb.table("products")
            .select("code, description, image_url, product_url, product_categories!inner(brands!inner(name))")
            .ilike("code", product_code.strip())
            .limit(1)
            .execute()
        )
        data = resp.data
        if data and data[0]:
            row = data[0]
            brand = (row.get("product_categories") or {}).get("brands", {}).get("name", "")
            return {
                "code": row.get("code", ""),
                "description": row.get("description", ""),
                "image_url": row.get("image_url") or None,
                "product_url": row.get("product_url") or None,
                "brand": brand,
            }
    except Exception as e:
        print(f"[product_image] DB lookup error: {e}")
    return None


def _tavily_image_search(query: str) -> str | None:
    if not TAVILY_API_KEY:
        return None
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=3,
            include_answer=False,
            include_images=True,
        )
        images = response.get("images", [])
        if images:
            for img_url in images:
                if isinstance(img_url, str) and any(ext in img_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    return img_url
            return images[0] if isinstance(images[0], str) else None
        for r in response.get("results", []):
            url = r.get("url", "")
            if any(ext in url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                return url
    except Exception as e:
        print(f"[product_image] Tavily search error: {e}")
    return None


def resolve_product_image(product_code: str, brand: str = "") -> dict:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    code = product_code.strip().upper()
    brand_site = BRAND_SITES.get(brand.lower(), "") if brand else ""
    site_filter = f"site:{brand_site}" if brand_site else ""
    search_query = f"{brand} {code} product image {site_filter}".strip()

    db_result = None
    web_image = None

    with ThreadPoolExecutor(max_workers=2) as executor:
        db_future = executor.submit(_db_lookup_image, code)
        tavily_future = executor.submit(_tavily_image_search, search_query)
        try:
            db_result = db_future.result(timeout=8)
        except Exception:
            pass
        try:
            web_image = tavily_future.result(timeout=8)
        except Exception:
            pass

    if db_result and db_result.get("image_url"):
        return {
            "code": db_result["code"],
            "description": db_result.get("description", ""),
            "image_url": db_result["image_url"],
            "product_url": db_result.get("product_url"),
            "source": "catalog_db",
        }

    if db_result and db_result.get("brand"):
        brand = brand or db_result["brand"]

    if web_image:
        return {
            "code": code,
            "description": db_result.get("description", "") if db_result else "",
            "image_url": web_image,
            "product_url": db_result.get("product_url") if db_result else None,
            "source": "web_search",
        }

    _bs = brand_site or BRAND_SITES.get(brand.lower(), "") if brand else ""
    if _bs:
        slug = re.sub(r'[^a-zA-Z0-9]', '-', code.lower()).strip('-')
        return {
            "code": code,
            "description": db_result.get("description", "") if db_result else "",
            "image_url": None,
            "product_url": f"https://www.{_bs}/search?q={slug}",
            "source": "constructed_url",
        }

    return {
        "code": code,
        "description": db_result.get("description", "") if db_result else "",
        "image_url": None,
        "product_url": None,
        "source": "not_found",
    }


@tool
def search_product_image(product_code: str, brand: str = "") -> str:
    """Find the product image URL for a specific product by its code or model number."""
    result = resolve_product_image(product_code, brand)
    parts = [f"Producto: {result['code']}"]
    if result.get("description"):
        parts.append(f"Descripción: {result['description']}")
    if result.get("image_url"):
        parts.append(f"Imagen: {result['image_url']}")
    else:
        parts.append("No se encontró imagen del producto.")
    if result.get("product_url"):
        parts.append(f"Página: {result['product_url']}")
    parts.append(f"Fuente: {result['source']}")
    return "\n".join(parts)
