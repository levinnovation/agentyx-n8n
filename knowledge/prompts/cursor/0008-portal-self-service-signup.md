# Cursor Prompt Log 0008 — Portal self-service signup

## Objective

Implement tenant portal self-service registration with admin approval, password
reset, and email verification backed by Better Auth.

## Scope

- Better Auth service SMTP callbacks and pending-membership gate.
- Admin APIs for pending user approval/rejection.
- Portal auth pages and admin UI.
- Template env updates for SMTP variables.

## Notes

- Better Auth package availability required using `better-auth` +
  `@better-auth/client` (latest) instead of `@better-auth/react`.
- Existing forward-auth architecture remains unchanged; membership checks were
  added to authorization flow.
