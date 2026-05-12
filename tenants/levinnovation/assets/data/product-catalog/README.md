# Product Catalog — Fallback Stubs

## Purpose

This directory contains **fallback-only** stubs for the five LEV Innovation product lines. Each stub provides a minimal paragraph + canonical URL so the customer-service RAG pipeline never returns empty results when Drive is temporarily unavailable.

## Files

| File | Product | URL |
|------|---------|-----|
| `agentyx.md` | Agentyx | https://agentyx.app |
| `contax.md` | Contax | https://contax.dev |
| `acumatica.md` | Acumatica | https://www.acumatica.com/ |
| `oosto-metropolis.md` | Oosto + Metropolis | https://oosto.com + https://metropolis.io/ |
| `legalink.md` | Legalink | https://legalink.co/ |

## Ownership

- **Drive is authoritative.** Enrich the Google Drive folder (`GDRIVE_ROOT_FOLDER_ID`) rather than mutating these stubs.
- Stubs are tagged `source='static'` in `cs_documents` and down-ranked at retrieval time.
- If you add a new product, add a stub here **and** a matching entry in the system prompt anchors (`customer-service-core.json`).
