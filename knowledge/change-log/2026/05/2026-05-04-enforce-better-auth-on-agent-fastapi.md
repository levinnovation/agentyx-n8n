# Change Record: Enforce Better Auth on Agent FastAPI

**Date:** 2026-05-04  
**Scope:** Agent template auth middleware, euromobilia agent

## Summary

Added JWT/JWKS verification middleware to the LangGraph agent template and the euromobilia quotation-assistant.

## What changed

- **ADR-0015** — Auth enforcement decision.
- **Template** — `templates/assets/langgraph-agent/app/auth.py`, env updates, config updates.
- **Euromobilia agent** — Mirrored auth.py, env updates, config updates.
- **Runbook** — Added "How to flip AUTH_REQUIRED" entry.

## Related

- ADR-0015
