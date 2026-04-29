# Change record: ADR-0007 multi-interface deployment

**Date:** 2026-04-29  
**Scope:** Documentation and knowledge only (no runtime code).

## What changed

- Added **ADR-0007** — capabilities and core agents are interface-agnostic; Kapso WhatsApp is one channel asset; Slack, Teams, web widget, web chat, Telegram, and other surfaces attach as additional channel/workflow assets.
- Updated **Euromobilia context pack**, **DOMAIN_MODEL** glossary, **domain-terms** glossary, **legacy-inventory**, **business-context**, **kitchen-quotation** docs, and selected **asset READMEs** so wording distinguishes **commercial priority** (WhatsApp today) from **architectural fact** (many interfaces).

## Why

Avoid implying the vertical-domain model is vendor- or channel-centric; keep `tenant → domain → capability → assets` as the organizing principle.

## References

- `knowledge/decisions/0007-multi-interface-deployment-for-tenant-assets.md`
