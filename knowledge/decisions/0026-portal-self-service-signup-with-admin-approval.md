# ADR-0026: Portal self-service signup with admin approval

**Status:** Accepted  
**Date:** 2026-05-08

## Context

The tenant portal had placeholder auth pages and no usable developer onboarding flow.
Developers could not self-register, reset passwords, or verify emails, and tenant admins
had no in-portal approval workflow.

We also need one identity flow that propagates access across proxy-protected services
(`n8n`, `flowise`, `paperclip`, `librechat`) without creating custom user records in each
service.

## Decision

1. Implement real Better Auth client flows in portal routes:
   - `/sign-up`
   - `/sign-in`
   - `/forgot-password`
   - `/reset-password`
   - `/verify-email`
2. Enforce a pending gate in `better-auth` forward-auth:
   - authenticated users without tenant org membership are redirected to
     `/onboarding/pending`.
3. Add tenant-admin approval APIs:
   - `GET /api/admin/pending-users`
   - `POST /api/admin/approve-user`
   - `POST /api/admin/reject-user`
4. Use SMTP (Gmail app password supported) for verification/reset/invitation/approval
   email delivery.
5. Keep Better Auth as canonical identity and continue using forward-auth header
   propagation for downstream apps.

## Consequences

### Positive

- Developers can self-register and recover passwords without manual SQL edits.
- Tenant admins can approve/reject users directly in portal admin.
- Once approved, access propagates to proxy-protected apps with no additional
  provisioning workflow.
- User lifecycle events are auditable via `better_auth.scim_sync_log`.

### Negative

- SMTP configuration becomes a required runtime dependency for production-grade UX.
- Forward-auth now performs a membership lookup (mitigated with a short in-process cache).
- Pending-user logic assumes one tenant org per auth service deployment.

## Rejected alternatives

- Keep invite-only and disable self-service registration.
- Build separate registration/provisioning jobs per downstream app.
- Keep password reset as manual admin operation.

## Follow-up

- Add integration tests for pending gate and admin approval flows.
- Evaluate domain-based auto-approval policy as a tenant feature flag.
- Add optional webhook notifications for new pending registrations.
