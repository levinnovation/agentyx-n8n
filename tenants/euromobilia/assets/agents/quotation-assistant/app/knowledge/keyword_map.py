"""
Natural-language → code prefix mapping for product search.
"""

import re
import unicodedata

KEYWORD_TO_CODE_PREFIXES: dict[str, list[str]] = {
    "horno": ["SO", "DO", "CSO", "CSOP", "SPO"],
    "horno sencillo": ["SO"],
    "horno doble": ["DO"],
    "horno vapor": ["CSO", "CSOP"],
    "speed oven": ["SPO"],
    "oven": ["SO", "DO", "CSO", "CSOP", "SPO"],
    "single oven": ["SO"],
    "double oven": ["DO"],
    "steam oven": ["CSO", "CSOP"],
    "microondas": ["MDD", "MD", "MC", "MS"],
    "microwave": ["MDD", "MD", "MC", "MS"],
    "cajon calentador": ["WWD"],
    "warming drawer": ["WWD"],
    "sellado al vacio": ["VS"],
    "vacuum seal": ["VS"],
    "cafetera": ["EC"],
    "coffee system": ["EC"],
    "rangetop": ["SRT"],
    "range top": ["SRT"],
    "sealed burner": ["SRT"],
    "quemadores sellados": ["SRT"],
    "parrilla": ["CG", "CI", "CT", "CE", "SRT"],
    "parrilla gas": ["CG"],
    "parrilla induccion": ["CI"],
    "parrilla electrica": ["CT", "CE"],
    "cooktop": ["CG", "CI", "CT", "CE"],
    "gas cooktop": ["CG"],
    "induction cooktop": ["CI"],
    "plancha": ["CG", "SRT"],
    "plantilla": ["CG", "CI", "SRT"],
    "estufa": ["DF", "GR", "IR"],
    "estufa dual": ["DF"],
    "dual fuel": ["DF"],
    "estufa gas": ["GR"],
    "gas range": ["GR"],
    "estufa induccion": ["IR"],
    "induction range": ["IR"],
    "range": ["DF", "GR", "IR"],
    "campana": ["VW", "VI", "VC", "DD", "PW", "PI"],
    "campana pared": ["VW", "PW"],
    "campana isla": ["VI", "PI"],
    "campana techo": ["VC"],
    "downdraft": ["DD"],
    "hood": ["VW", "VI", "VC", "PW", "PI"],
    "ventilacion": ["VW", "VI", "VC", "DD", "PW", "PI"],
    "asador": ["OG"],
    "outdoor grill": ["OG"],
    "asador exterior": ["OG"],
    "refrigerador": ["CL", "PRO", "DEC", "DEU", "IC", "IT"],
    "refrigeradora": ["CL", "PRO", "DEC", "DEU", "IC", "IT"],
    "refrigeracion": ["CL", "PRO", "DEC", "DEU", "IC", "IT", "IW"],
    "refrigerator": ["CL", "PRO", "DEC", "DEU", "IC", "IT"],
    "nevera": ["CL", "PRO", "DEC", "DEU", "IC", "IT"],
    "congelador": ["CL", "PRO", "DEC", "DEU", "IC"],
    "freezer": ["CL", "PRO", "DEC", "DEU", "IC"],
    "puerta francesa": ["CL", "PRO"],
    "french door": ["CL", "PRO"],
    "vino": ["IW"],
    "wine": ["IW"],
    "wine storage": ["IW"],
    "conservador de vino": ["IW"],
    "centro bebidas": ["DEU"],
    "beverage": ["DEU"],
    "hielo": ["DEU", "IC"],
    "ice maker": ["DEU", "IC"],
    "lavavajillas": ["DW"],
    "dishwasher": ["DW"],
    "lavaplatos": ["DW"],
    "modulo": ["MM", "CG"],
}


def _normalize(text: str) -> str:
    nfkd = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in nfkd if unicodedata.category(ch) != "Mn").lower()


def extract_size_from_query(query: str) -> str | None:
    m = re.search(r'(\d{2})\s*(?:[""″]|pulgadas?|in(?:ch(?:es)?)?|\'\')', query, re.IGNORECASE)
    if m:
        return m.group(1)
    bare = re.search(r'\b(\d{2})\b', query)
    if bare:
        n = int(bare.group(1))
        if 15 <= n <= 66:
            return bare.group(1)
    return None


def map_keywords_to_code_prefixes(query: str) -> list[str]:
    lower = _normalize(query)
    prefixes: set[str] = set()
    sorted_keywords = sorted(KEYWORD_TO_CODE_PREFIXES.keys(), key=len, reverse=True)
    for keyword in sorted_keywords:
        normalized_keyword = _normalize(keyword)
        if normalized_keyword in lower:
            for pfx in KEYWORD_TO_CODE_PREFIXES[keyword]:
                prefixes.add(pfx)
    return list(prefixes)
