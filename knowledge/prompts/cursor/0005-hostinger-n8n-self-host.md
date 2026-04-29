# Prompt log: Hostinger n8n self-host

**Tool:** cursor  
**Date:** 2026-04-29

## Goal

Plan and implement in-repo artifacts for **self-hosted n8n Community Edition** on Hostinger VPS (`187.127.252.161`), HTTP bootstrap on port 80, and wire Euromobilia workflow documentation + capability references to this runtime.

## Context files read

Plan: Hostinger n8n Self-Hosting; `tenants/euromobilia/assets/workflows/n8n/`, `scripts/validate_specs.py`, n8n CE features doc snapshot.

## Outcome

- Deployment asset: `tenants/euromobilia/assets/deploy/n8n-hostinger/` (Compose, Caddyfile, `.env.example`, README, SSH bootstrap doc)
- Workflow bundle `asset.yaml` under `tenants/euromobilia/assets/workflows/n8n/`
- Capability + operations updates; ADR-0009; change record; context pack touch

## Original prompt

Captured from the approved implementation request in-session (not a verbatim archived export).
