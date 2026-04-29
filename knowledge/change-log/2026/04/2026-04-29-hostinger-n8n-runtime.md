# 2026-04-29: Hostinger n8n runtime (self-hosted CE)

**Related:** ADR-0009, prompt log `knowledge/prompts/cursor/0005-hostinger-n8n-self-host.md`

## Summary

Added a **deployment asset** for n8n CE on Hostinger (`n8n-hostinger`): Docker Compose (n8n + Postgres + Caddy), env template, runbook, and local SSH bootstrap instructions. Added **`asset.yaml`** for the `workflows/n8n` bundle, updated **kitchen-quotation** capability and operations docs, and refreshed workflow README with runtime URL and CE/Git expectations.

## Rationale

Centralize runtime documentation in-repo; keep secrets off Git; align Euromobilia workflows with the chosen VPS.

## Files / areas

- `tenants/euromobilia/assets/deploy/n8n-hostinger/*`
- `tenants/euromobilia/assets/workflows/n8n/{README.md,asset.yaml}`
- `tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/{capability.yaml,operations.md}`
- `tenants/euromobilia/assets/deploy/README.md`
- `knowledge/decisions/0009-*.md`, `knowledge/prompts/cursor/0005-*.md`, context packs

## Validation

```bash
make knowledge-index
make validate
make test
```

## Risks / rollback

- HTTP bootstrap risk: mitigate with fast move to TLS + firewall rules.
- Rollback: remove capability asset entries and delete deployment folder in a PR (VPS stack stopped separately).
