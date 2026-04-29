# Euromobilia — migration notes

Use this file when moving assets between capabilities, renaming slugs, or absorbing legacy paths.

## Template entry

- **Date:**
- **From → To:**
- **Reason:**
- **Validation:** `make validate` output / PR link

## 2026-04-29 — Multi-interface channels (ADR-0007)

- **Decision:** `knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`
- **Reason:** Clarify that the repo architecture is **not** “WhatsApp-first”; capabilities are interface-agnostic and Kapso WhatsApp is the first channel asset among many allowed surfaces.
- **Validation:** `make validate` after doc updates; `make knowledge-index` to refresh the knowledge index.
