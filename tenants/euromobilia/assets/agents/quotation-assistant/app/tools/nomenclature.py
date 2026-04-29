"""
Nomenclature decoder for Sub-Zero, Wolf, and Cove product codes.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from langchain_core.tools import tool


@dataclass
class DecodedProduct:
    brand: str
    product_type: str
    size: str | None = None
    series: str | None = None
    finish: str | None = None
    handle: str | None = None
    extras: list[str] = field(default_factory=list)
    raw_code: str = ""
    summary: str = ""


WOLF_PRODUCT_PREFIXES: dict[str, str] = {
    "CSOP": "Horno de Vapor con Convección con Plomería",
    "CSO": "Horno de Vapor con Convección",
    "SPO": "Speed Oven (Horno Rápido de Convección)",
    "MDD": "Horno de Microondas Drop-Down",
    "WWD": "Cajón Calentador",
    "SRT": "Rangetop / Sealed Burner Rangetop",
    "CART": "Carrito para Asador",
    "SO": "Horno Sencillo",
    "DO": "Horno Doble",
    "MD": "Cajón Microondas",
    "MC": "Horno Microondas con Convección",
    "MS": "Horno Microondas Estándar",
    "VS": "Cajón de Sellado al Vacío",
    "EC": "Cafetera Empotrable",
    "CI": "Parrilla de Inducción",
    "CG": "Parrilla de Gas",
    "MM": "Módulo Multifuncional",
    "CT": "Parrilla Eléctrica Transicional",
    "CE": "Parrilla Eléctrica",
    "DF": "Estufa Dual (Dual Fuel)",
    "GR": "Estufa de Gas",
    "IR": "Estufa de Inducción",
    "OG": "Asador de Gas para Exterior",
    "VW": "Campana de Pared",
    "VI": "Campana de Isla",
    "VC": "Campana de Techo",
    "DD": "Sistema de Ventilación Downdraft",
    "PW": "Campana Profesional de Pared",
    "PI": "Campana Profesional de Isla",
}

WOLF_SERIES: dict[str, str] = {
    "TM": "Transicional Serie M",
    "PM": "Profesional Serie M",
    "CM": "Contemporáneo Serie M",
    "TE": "Transicional Serie E",
    "PE": "Profesional Serie E",
    "TF": "Transicional con Marco de Emparejamiento",
    "T": "Transicional",
    "P": "Profesional",
    "C": "Contemporáneo",
}

WOLF_FINISH: dict[str, str] = {"S": "Acero Inoxidable", "B": "Cristal Negro"}
WOLF_HANDLE: dict[str, str] = {"TH": "Jaladera Tubular", "PH": "Jaladera Profesional", "T": "Jaladera Tubular", "P": "Jaladera Profesional"}
WOLF_OPTIONS: dict[str, str] = {"O": "Modelo para Exterior", "LP": "Gas LP"}

SUBZERO_PRODUCT_PREFIXES: dict[str, str] = {
    "DEC": "Refrigeración Serie Diseñador — Columna",
    "DEU": "Refrigeración Serie Diseñador — Bajo Cubierta",
    "PRO": "Refrigeración Profesional",
    "CL": "Refrigeración Serie Clásica",
    "IC": "Refrigerador/Congelador Integrado",
    "IT": "Refrigerador Integrado de Torre",
    "IW": "Conservador de Vino Integrado",
}

SUBZERO_CONFIG: dict[str, str] = {
    "FD": "Puerta Francesa", "ID": "Dispensador Interno", "BG": "Centro de Bebidas (Puerta de Vidrio)",
    "BA": "Centro de Bebidas (Alta Altitud)", "IP": "Máquina de Hielo con Bomba", "R": "Todo Refrigerador",
    "F": "Todo Congelador", "U": "Arriba y Abajo (Refrigerador/Congelador)", "S": "Lado a Lado",
    "G": "Puerta de Vidrio", "A": "Puerta de Vidrio de Alta Altitud", "D": "Dispensador de Agua y Hielo",
    "I": "Máquina de Hielo",
}

SUBZERO_FINISH: dict[str, str] = {"O": "Panelable (Overlay)", "S": "Acero Inoxidable"}
SUBZERO_HANDLE: dict[str, str] = {"T": "Jaladera Tubular", "P": "Jaladera Profesional"}
SUBZERO_HINGE: dict[str, str] = {"RH": "Bisagra Derecha", "LH": "Bisagra Izquierda", "R": "Bisagra Derecha", "L": "Bisagra Izquierda"}

COVE_PREFIXES: dict[str, str] = {"DW": "Lavavajillas Cove"}
COVE_OPTIONS: dict[str, str] = {"WS": "Con Ablanador de Agua", "ADA": "Altura ADA (accesible)"}


def _extract_size(code: str) -> str | None:
    m = re.search(r"(\d{2})(\d{2})", code)
    if m:
        w = int(m.group(1))
        h = int(m.group(2))
        if 15 <= w <= 60:
            if 15 <= h <= 84:
                return f'{w}" de ancho'
            return f'{w}"'
    m2 = re.search(r"(\d{2})(?!\d)", code)
    if m2:
        s = int(m2.group(1))
        if 15 <= s <= 60:
            return f'{s}"'
    return None


def _decode_wolf(code: str) -> DecodedProduct:
    raw = code.strip()
    parts = raw.split("/")
    base = parts[0]
    extras: list[str] = []
    product_type = "Producto Wolf"
    prefix_len = 0
    for prefix in sorted(WOLF_PRODUCT_PREFIXES.keys(), key=len, reverse=True):
        if base.startswith(prefix):
            product_type = WOLF_PRODUCT_PREFIXES[prefix]
            prefix_len = len(prefix)
            break
    size = _extract_size(base[prefix_len:])
    series = None
    after_prefix = base[prefix_len:]
    after_digits = re.sub(r"^\d+", "", after_prefix)
    for s_key in sorted(WOLF_SERIES.keys(), key=len, reverse=True):
        if after_digits.startswith(s_key):
            series = WOLF_SERIES[s_key]
            break
    finish = None
    handle = None
    for seg in parts[1:]:
        if not finish and seg in WOLF_FINISH:
            finish = WOLF_FINISH[seg]
        elif not handle and seg in WOLF_HANDLE:
            handle = WOLF_HANDLE[seg]
        elif seg in WOLF_OPTIONS:
            extras.append(WOLF_OPTIONS[seg])
        elif seg == "LP":
            extras.append("Gas LP")
    if base.endswith("O") and (not series or "Exterior" not in series):
        extras.append("Modelo para Exterior")
    summary_parts = [product_type]
    if size:
        summary_parts.append(f"de {size}")
    if series:
        summary_parts.append(f"— {series}")
    if finish:
        summary_parts.append(f"en {finish}")
    if handle:
        summary_parts.append(f"con {handle}")
    if extras:
        summary_parts.append(f"({', '.join(extras)})")
    return DecodedProduct(brand="Wolf", product_type=product_type, size=size, series=series, finish=finish, handle=handle, extras=extras, raw_code=raw, summary=" ".join(summary_parts))


def _decode_subzero(code: str) -> DecodedProduct:
    raw = code.strip()
    extras: list[str] = []
    product_type = "Refrigeración Sub-Zero"
    prefix_len = 0
    for prefix in sorted(SUBZERO_PRODUCT_PREFIXES.keys(), key=len, reverse=True):
        if raw.startswith(prefix):
            product_type = SUBZERO_PRODUCT_PREFIXES[prefix]
            prefix_len = len(prefix)
            break
    rest = raw[prefix_len:]
    size = _extract_size(rest)
    after_digits = re.sub(r"^\d+", "", rest)
    config = None
    for c_key in sorted(SUBZERO_CONFIG.keys(), key=len, reverse=True):
        if after_digits.startswith(c_key):
            config = SUBZERO_CONFIG[c_key]
            break
    parts = raw.split("/")
    finish = None
    handle = None
    for seg in parts[1:]:
        if not finish and seg in SUBZERO_FINISH:
            finish = SUBZERO_FINISH[seg]
        elif not handle and seg in SUBZERO_HANDLE:
            handle = SUBZERO_HANDLE[seg]
        elif seg in SUBZERO_HINGE:
            extras.append(SUBZERO_HINGE[seg])
    if "-RH" in raw:
        extras.append("Bisagra Derecha")
    if "-LH" in raw:
        extras.append("Bisagra Izquierda")
    if "(ID)" in raw or "ID" in raw:
        if not config or "Dispensador" not in config:
            extras.append("Dispensador Interno")
    summary_parts = [product_type]
    if config:
        summary_parts.append(f"— {config}")
    if size:
        summary_parts.append(f"de {size}")
    if finish:
        summary_parts.append(f"en {finish}")
    if handle:
        summary_parts.append(f"con {handle}")
    if extras:
        summary_parts.append(f"({', '.join(extras)})")
    return DecodedProduct(brand="Sub-Zero", product_type=product_type, size=size, series=config, finish=finish, handle=handle, extras=extras, raw_code=raw, summary=" ".join(summary_parts))


def _decode_cove(code: str) -> DecodedProduct:
    raw = code.strip()
    extras: list[str] = []
    product_type = "Lavavajillas Cove"
    size = _extract_size(raw.replace("DW", "", 1))
    if "WS" in raw:
        extras.append("Con Ablanador de Agua")
    if "ADA" in raw:
        extras.append("Altura ADA (accesible)")
    summary_parts = [product_type]
    if size:
        summary_parts.append(f"de {size}")
    if extras:
        summary_parts.append(f"({', '.join(extras)})")
    return DecodedProduct(brand="Cove", product_type=product_type, size=size, raw_code=raw, extras=extras, summary=" ".join(summary_parts))


def _is_numeric_accessory(code: str) -> bool:
    return bool(re.match(r"^\d{5,7}$", code))


def _decode_numeric_accessory(code: str) -> DecodedProduct:
    raw = code.strip()
    brand = "Sub-Zero/Wolf/Cove"
    product_type = "Accesorio"
    if raw.startswith("70"):
        brand = "Sub-Zero"
        product_type = "Accesorio Sub-Zero (Panel/Jaladera/Zoclo/Kit/Filtro)"
    elif raw.startswith("42"):
        brand = "Sub-Zero"
        product_type = "Accesorio Sub-Zero (Filtro de Agua)"
    elif raw.startswith("80") or raw.startswith("81"):
        brand = "Wolf"
        product_type = "Accesorio Wolf (Ventilación/Campanas/Cubreductos/Protectores)"
    elif raw.startswith("82"):
        brand = "Wolf"
        product_type = "Accesorio Wolf (Cajones/Frentes/Jaladeras/Molduras/Motores)"
    elif raw.startswith("83"):
        brand = "Wolf"
        product_type = "Accesorio Wolf (Frentes/Cafeteras/Sellado Vacío)"
    elif raw.startswith("90"):
        if any(raw.startswith(p) for p in ("900", "901", "902", "903")):
            brand = "Sub-Zero/Wolf"
            product_type = "Accesorio (Perillas/Biseles/Zoclos/Paneles/Kits)"
        elif any(raw.startswith(p) for p in ("905", "906", "907")):
            brand = "Wolf"
            product_type = "Accesorio Wolf (Perillas/Biseles/Elevadores)"
        else:
            brand = "Sub-Zero/Wolf"
            product_type = "Accesorio (consultar catálogo para detalles)"
    return DecodedProduct(brand=brand, product_type=product_type, raw_code=raw, summary=f"{brand} {product_type}")


def decode_product_code(code: str) -> DecodedProduct:
    trimmed = code.strip().upper()
    base = trimmed.split("/")[0]
    if _is_numeric_accessory(base):
        return _decode_numeric_accessory(trimmed)
    if base.startswith("DW"):
        return _decode_cove(trimmed)
    for prefix in ("DEC", "DEU", "PRO", "CL", "IC", "IT", "IW"):
        if base.startswith(prefix):
            return _decode_subzero(trimmed)
    if base.startswith("BM") or base.startswith("SB"):
        is_lp = "LP" in trimmed
        ptype = "Módulo Quemador Lateral" if base.startswith("BM") else "Quemador Lateral"
        gas = "Gas LP" if is_lp else "Gas Natural"
        return DecodedProduct(brand="Wolf", product_type=f"{ptype} para Exterior", size='13"', extras=[gas], raw_code=trimmed, summary=f'Wolf {ptype} 13" para Exterior ({gas})')
    return _decode_wolf(trimmed)


def decode_multiple_codes(codes: list[str]) -> str:
    if not codes:
        return "No se proporcionaron códigos de producto."
    decoded_lines: list[str] = []
    for c in codes:
        d = decode_product_code(c)
        lines = [f"Código: {d.raw_code}", f"Marca: {d.brand}", f"→ {d.summary}"]
        if d.product_type:
            lines.append(f"  Tipo: {d.product_type}")
        if d.size:
            lines.append(f"  Tamaño: {d.size}")
        if d.series:
            lines.append(f"  Serie/Config: {d.series}")
        if d.finish:
            lines.append(f"  Acabado: {d.finish}")
        if d.handle:
            lines.append(f"  Jaladera: {d.handle}")
        if d.extras:
            lines.append(f"  Extras: {', '.join(d.extras)}")
        decoded_lines.append("\n".join(lines))
    return "\n\n".join(decoded_lines)


@tool
def decode_product_nomenclature(codes: str) -> str:
    """Decode Wolf, Sub-Zero, or Cove product codes into human-readable specs."""
    code_list = [c.strip() for c in codes.split(",") if c.strip()]
    return decode_multiple_codes(code_list)
