"""
Structured catalog search — queries the relational data model
(brands → categories → products → price_entries) for accurate,
pre-validated pricing.

This is the PRIMARY source of truth for prices.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from langchain_core.tools import tool
from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from knowledge.keyword_map import map_keywords_to_code_prefixes, extract_size_from_query


@dataclass
class CatalogSearchResult:
    product_id: str
    code: str
    description: str
    sku_correlation: str | None
    brand: str
    category: str
    segment: str
    unit_price: float
    project_price: float | None
    price_list: str
    currency: str
    is_active: bool
    image_url: str | None = None
    product_url: str | None = None
    margin_pct: float | None = None
    discount_pct: float | None = None


_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _client


SearchMode = Literal["exact", "prefix", "description", "sku_correlation", "code_contains"]

SELECT_FIELDS = (
    "id, code, description, sku_correlation_description, image_url, product_url, is_active, "
    "product_categories!inner(name, brands!inner(name, segment)), "
    "price_entries(unit_price, project_price, margin_pct, discount_pct, price_lists!inner(name, currency))"
)


def _query_products(query: str, mode: SearchMode, segment: str | None = None) -> list[CatalogSearchResult]:
    try:
        sb = _get_client()
        q = sb.table("products").select(SELECT_FIELDS).limit(50)

        if mode == "exact":
            q = q.eq("code", query.upper())
        elif mode == "prefix":
            q = q.ilike("code", f"{query}%")
        elif mode == "description":
            q = q.ilike("description", f"%{query}%")
        elif mode == "sku_correlation":
            q = q.ilike("sku_correlation_description", f"%{query}%")
        elif mode == "code_contains":
            q = q.ilike("code", f"%{query}%")

        resp = q.execute()
        data = resp.data or []
        if not data:
            return []

        results: list[CatalogSearchResult] = []
        for product in data:
            cat = product.get("product_categories", {})
            brand_obj = cat.get("brands", {})

            if segment and brand_obj.get("segment") != segment:
                continue

            price_entries = product.get("price_entries", [])
            brand_name = brand_obj.get("name", "Unknown")
            cat_name = cat.get("name", "Unknown")
            seg = brand_obj.get("segment", "unknown")
            _img_url = product.get("image_url") or None
            _prod_url = product.get("product_url") or None

            if not price_entries:
                results.append(CatalogSearchResult(
                    product_id=product["id"],
                    code=product["code"],
                    description=product.get("description", ""),
                    sku_correlation=product.get("sku_correlation_description"),
                    brand=brand_name,
                    category=cat_name,
                    segment=seg,
                    unit_price=0.0,
                    project_price=None,
                    price_list="Sin precio asignado",
                    currency="USD",
                    is_active=product.get("is_active", True),
                    image_url=_img_url,
                    product_url=_prod_url,
                ))
            else:
                for pe in price_entries:
                    pl = pe.get("price_lists", {})
                    results.append(CatalogSearchResult(
                        product_id=product["id"],
                        code=product["code"],
                        description=product.get("description", ""),
                        sku_correlation=product.get("sku_correlation_description"),
                        brand=brand_name,
                        category=cat_name,
                        segment=seg,
                        unit_price=pe.get("unit_price", 0.0),
                        project_price=pe.get("project_price"),
                        price_list=pl.get("name", "Unknown"),
                        currency=pl.get("currency", "USD"),
                        is_active=product.get("is_active", True),
                        image_url=_img_url,
                        product_url=_prod_url,
                        margin_pct=pe.get("margin_pct"),
                        discount_pct=pe.get("discount_pct"),
                    ))
        return results
    except Exception as e:
        print(f"[catalog_search] _query_products({mode}) error: {e}")
        return []


def _fetch_active_rules() -> list[dict]:
    try:
        sb = _get_client()
        now_iso = __import__("datetime").datetime.utcnow().isoformat() + "Z"
        resp = (
            sb.table("commercial_pricing_rules")
            .select("*")
            .eq("is_active", True)
            .order("priority", desc=False)
            .order("sort_order", desc=False)
            .execute()
        )
        rules = resp.data or []
        active = []
        for r in rules:
            vf = r.get("valid_from")
            vu = r.get("valid_until")
            if vf and vf > now_iso:
                continue
            if vu and vu < now_iso:
                continue
            active.append(r)
        return active
    except Exception as e:
        print(f"[catalog_search] _fetch_active_rules error: {e}")
        return []


def _apply_commercial_rules(results: list[CatalogSearchResult]) -> list[CatalogSearchResult]:
    rules = _fetch_active_rules()
    if not rules:
        return results

    from concurrent.futures import ThreadPoolExecutor
    try:
        sb = _get_client()
        def _fetch_brands():
            return sb.table("brands").select("id, name").execute()
        def _fetch_cats():
            return sb.table("product_categories").select("id, name, brand_id").execute()

        with ThreadPoolExecutor(max_workers=2) as _ex:
            _bf = _ex.submit(_fetch_brands)
            _cf = _ex.submit(_fetch_cats)
            brand_resp = _bf.result(timeout=5)
            cat_resp = _cf.result(timeout=5)

        brand_map = {b["name"]: b["id"] for b in (brand_resp.data or [])}
        cat_by_name = {}
        for c in (cat_resp.data or []):
            cat_by_name.setdefault(c["name"], []).append(c["id"])
    except Exception as e:
        print(f"[catalog_search] _apply_commercial_rules lookup error: {e}")
        return results

    for r in results:
        margin = r.margin_pct if r.margin_pct is not None else 62.0
        discount = r.discount_pct if r.discount_pct is not None else 5.0
        r_brand_id = brand_map.get(r.brand)
        r_cat_ids = cat_by_name.get(r.category, [])

        for rule in rules:
            scope = rule.get("scope", "")
            matches = False
            if scope == "global":
                matches = True
            elif scope == "brand" and r_brand_id and rule.get("brand_id") == r_brand_id:
                matches = True
            elif scope == "category" and rule.get("category_id") in r_cat_ids:
                matches = True
            elif scope == "product" and rule.get("product_id") == r.product_id:
                matches = True

            if not matches:
                continue

            action = rule.get("action", "")
            value = float(rule.get("value", 0))
            if action == "override_discount":
                discount = value
            elif action == "override_margin":
                margin = value
            elif action == "add_discount":
                discount += value
            elif action == "subtract_discount":
                discount = max(0, discount - value)
            elif action == "add_margin":
                margin += value
            elif action == "subtract_margin":
                margin = max(0, margin - value)

        r.margin_pct = margin
        r.discount_pct = discount

    return results


def search_catalog(query: str, segment: str | None = None) -> list[CatalogSearchResult]:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    q = query.strip()
    if not q:
        return []

    results: list[CatalogSearchResult] = []
    seen_ids: set[str] = set()

    def add_results(new_results: list[CatalogSearchResult]) -> None:
        for r in new_results:
            if r.product_id not in seen_ids:
                seen_ids.add(r.product_id)
                results.append(r)

    code_prefixes = map_keywords_to_code_prefixes(q)
    size_filter = extract_size_from_query(q)

    def _strat_exact():
        return ("exact", _query_products(q, "exact", segment))

    def _strat_prefix():
        return ("prefix", _query_products(q, "prefix", segment))

    def _strat_keyword(pfx):
        res = _query_products(pfx, "prefix", segment)
        if size_filter:
            filtered = [r for r in res if size_filter in r.code]
            return (f"keyword_{pfx}", filtered if filtered else res)
        return (f"keyword_{pfx}", res)

    def _strat_description():
        return ("description", _query_products(q, "description", segment))

    def _strat_sku():
        return ("sku", _query_products(q, "sku_correlation", segment))

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [
            executor.submit(_strat_exact),
            executor.submit(_strat_prefix),
            executor.submit(_strat_description),
            executor.submit(_strat_sku),
        ]
        for pfx in code_prefixes[:5]:
            futures.append(executor.submit(_strat_keyword, pfx))

        for future in as_completed(futures):
            try:
                _name, _res = future.result()
                add_results(_res)
            except Exception as e:
                print(f"[catalog_search] parallel strategy error: {e}")

    if not results:
        words = [w for w in q.split() if len(w) >= 2]
        if len(words) > 1:
            with ThreadPoolExecutor(max_workers=4) as executor:
                word_futures = []
                for word in words[:4]:
                    word_futures.append(executor.submit(_query_products, word, "prefix", segment))
                    word_futures.append(executor.submit(_query_products, word, "sku_correlation", segment))
                for future in as_completed(word_futures):
                    try:
                        add_results(future.result())
                    except Exception:
                        pass

    if not results:
        if size_filter:
            add_results(_query_products(size_filter, "code_contains", segment))

    if results:
        results = _apply_commercial_rules(results[:50])
    return results


def format_catalog_results(results: list[CatalogSearchResult]) -> str:
    if not results:
        return (
            "No se encontraron productos en la base de datos estructurada. "
            "Intenta con otro término de búsqueda, código de producto o "
            "descripción más general."
        )

    lines: list[str] = []
    for r in results:
        price_str = f"${r.unit_price:,.2f}" if r.unit_price > 0 else "Pendiente"
        proj_str = f"${r.project_price:,.2f}" if r.project_price else "—"
        sku_line = f"  SKU Decoded: {r.sku_correlation}" if r.sku_correlation else ""
        parts = [
            f"  Código: {r.code}",
            f"  Marca: {r.brand} ({r.segment})",
            f"  Categoría: {r.category}",
            f"  Descripción: {r.description}",
        ]
        if sku_line:
            parts.append(sku_line)
        if r.image_url:
            parts.append(f"  Imagen: {r.image_url}")
        if r.product_url:
            parts.append(f"  Página: {r.product_url}")
        margin_str = f"{r.margin_pct}%" if r.margin_pct is not None else "No definido"
        discount_str = f"{r.discount_pct}%" if r.discount_pct is not None else "No definido"
        parts.extend([
            f"  Precio Venta IVI: {price_str}",
            f"  Precio Proyecto: {proj_str}",
            f"  Margen: {margin_str}",
            f"  Descuento: {discount_str}",
            f"  Lista: {r.price_list}",
            f"  Activo: {'Sí' if r.is_active else 'No'}",
        ])
        lines.append("\n".join(parts))

    header = f"Resultados del catálogo estructurado ({len(results)} productos):\n\n"
    footer = (
        "\n\nEstos precios provienen de la BASE DE DATOS ESTRUCTURADA (fuente primaria de precios). "
        "Usa 'Precio Venta IVI' como Precio Unitario para ventas 1-a-1, y 'Precio Proyecto' para proyectos.\n"
        "MARGEN Y DESCUENTO: Cada producto incluye 'Margen' y 'Descuento' del Data Model, "
        "ya ajustados con las Reglas Comerciales activas. USAR SIEMPRE ESTOS VALORES. "
        "Solo usar los defaults del UI si dice 'No definido'.\n"
        "El campo 'SKU Decoded' contiene la interpretación de la nomenclatura del código."
    )
    return header + "\n---\n".join(lines) + footer


@tool
def query_product_catalog(query: str) -> str:
    """
    Search the structured product catalog (primary price source).
    Accepts natural language like "rangetop Wolf 30 pulgadas",
    exact codes like "SRT48", or partial codes.
    """
    results = search_catalog(query)
    return format_catalog_results(results)


@tool
def list_price_lists(brand: str = "") -> str:
    """List all available price lists, optionally filtered by brand."""
    try:
        sb = _get_client()
        q = sb.table("price_lists").select("id, name, currency, brands(name)").order("name")
        resp = q.execute()
        data = resp.data or []

        if brand:
            brand_lower = brand.lower()
            data = [pl for pl in data if pl.get("brands", {}).get("name", "").lower() == brand_lower]

        if not data:
            return "No se encontraron listas de precios."

        lines = []
        for pl in data:
            b = pl.get("brands", {}).get("name", "—")
            lines.append(f"- {pl['name']} ({b}) — Moneda: {pl.get('currency', 'USD')}")

        return f"Listas de precios disponibles ({len(lines)}):\n" + "\n".join(lines)
    except Exception as e:
        return f"Error consultando listas de precios: {e}"
