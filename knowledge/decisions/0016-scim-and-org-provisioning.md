# ADR-0016: SCIM 2.0 and Organization-Based Per-Tenant Provisioning

**Status:** Accepted  
**Date:** 2026-05-04

## Context

Operators are onboarded manually today. As the tenant stack grows, we need automated user provisioning from Google Workspace (or any SCIM-capable IDP) into the correct tenant organization.

## Decision

1. **Add `@better-auth/organization` plugin** to `agentyx-auth-service`.
2. **Each Railway tenant project's auth service has one organization** seeded at bootstrap matching the tenant ID (e.g. `org.id = "euromobilia"`).
3. **Implement SCIM 2.0 endpoints** (`/api/scim/v2/Users`, `/Groups`) as a thin custom layer against the organization plugin's user/member CRUD.
4. **Bootstrap CLI:** `scripts/auth/bootstrap-tenant-org.sh --tenant <id> --admin-email <email>`:
   - Creates the tenant org if missing.
   - Provisions the first admin user.
   - Issues a SCIM bearer token.
5. **Google Workspace connection** documented in `knowledge/operations/how-to-connect-google-workspace-scim.md`.

## Consequences

### Positive

- Hire → auto-provisioned into tenant org.
- Role change → reflected in all apps via Better Auth.
- Off-boarding → single delete in IDP propagates everywhere.

### Negative

- SCIM implementation is custom (Better Auth doesn't ship SCIM yet).
- Google Workspace SCIM requires Enterprise license.

## Follow-up

- Test SCIM probe from a test IDP after auth-service deploy.
- Consider auto-assigning roles based on Google Workspace group membership.
