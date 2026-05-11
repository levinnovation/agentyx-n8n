# 2026-05-08 — portal self-service signup and approval flow

## Summary

Implemented end-to-end self-service registration and password recovery in the
portal, plus tenant-admin approval APIs in `better-auth` with pending-user gating
at forward-auth.

## Rationale

Portal login was a placeholder and lacked sign-up/password reset UX. Developers
could not self-register into tenant access, and approvals had to be handled out of
band.

## Files / areas

- `services/better-auth/src/server.ts`
  - Added SMTP-backed email callbacks for reset/verification/invitations
  - Added `databaseHooks.user.create.after` audit logging
  - Added tenant membership gate in `/api/auth/forward-auth`
  - Added admin APIs for pending user list/approve/reject
- `services/better-auth/src/email.ts`
  - Added Nodemailer transport wrapper
- `services/better-auth/src/tenant.ts`
  - Added host-to-tenant slug resolver
- `services/better-auth/src/config.ts`
  - Added SMTP env parsing
- `services/better-auth/.env.example`
  - Documented SMTP env vars
- `templates/forks/agentyx-client-portal/app/lib/auth-client.ts`
  - Added Better Auth client initialization
- `templates/forks/agentyx-client-portal/app/(auth)/*`
  - Replaced stubs with functional sign-in/sign-up/forgot/reset/verify routes
- `templates/forks/agentyx-client-portal/app/onboarding/pending/page.tsx`
  - Added pending approval page
- `templates/forks/agentyx-client-portal/app/dashboard/admin/page.tsx`
  - Added pending user approval UI
- `templates/forks/agentyx-client-portal/app/api/admin/*`
  - Added BFF admin proxies
- `templates/assets/railway-tenant-stack/template-config.json`
  - Added SMTP defaults and tenant customization vars
- `templates/forks/agentyx-client-portal/README.md`
- `services/better-auth/README.md`

## Validation

- `npm run build` in `services/better-auth`
- `npm run build` in `templates/forks/agentyx-client-portal`
- `make knowledge-index`

## Risks / rollback

- If SMTP credentials are invalid, email delivery fails; flow still logs requests.
- If pending gate blocks users unexpectedly, rollback by disabling membership check
  in `forward-auth` and redeploying `better-auth`.
