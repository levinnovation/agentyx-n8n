# Change Record: SCIM and Organization Provisioning

**Date:** 2026-05-04  
**Scope:** Auth-service SCIM endpoints, organization plugin, bootstrap script

## Summary

Added SCIM 2.0 endpoints and organization-based per-tenant provisioning to the auth service.

## What changed

- **ADR-0016** — SCIM + org provisioning decision.
- **Auth-service** — Organization plugin + SCIM router.
- **Bootstrap script** — `scripts/auth/bootstrap-tenant-org.sh`.
- **Op doc** — `how-to-connect-google-workspace-scim.md`.

## Related

- ADR-0016
