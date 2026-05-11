# Portal signup and approval runbook

## Purpose

Operate tenant self-service registration, password reset, and admin approval for
portal users backed by Better Auth.

## Prerequisites

- `better-auth` deployed with:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`
- Tenant organization seeded in `better_auth.organization`
- At least one tenant admin member in `better_auth.member`

## SMTP setup (Gmail app password)

1. Ensure the mailbox account has Google 2FA enabled.
2. Generate an app password in Google Account security settings.
3. Set service vars on tenant `better-auth`:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_USER=<noreply@tenant-domain>`
   - `SMTP_PASS=<app-password>`
   - `SMTP_FROM=<Tenant Portal <noreply@tenant-domain>>`
4. Redeploy `better-auth`.

## User lifecycle

### 1) Self-registration

1. User signs up at `/sign-up`.
2. Better Auth creates `better_auth.user` and logs `CREATE` in
   `better_auth.scim_sync_log`.
3. User verifies email via `/verify-email`.
4. User lands on `/onboarding/pending` until approved.

### 2) Admin approval

1. Tenant admin opens `/dashboard/admin`.
2. Approve user as `member` or `admin`.
3. Service inserts/updates `better_auth.member`.
4. Approval is logged in `better_auth.scim_sync_log`.

### 3) Password recovery

1. User requests reset at `/forgot-password`.
2. Reset email links to `/reset-password?token=...`.
3. User submits new password and signs in.

## Troubleshooting

### User stuck on pending after admin approval

- Verify membership row exists:
  - `SELECT * FROM better_auth.member WHERE user_id = '<user-id>';`
- Confirm `organization_id` matches tenant org.
- Clear membership cache by restarting `better-auth` or waiting 60 seconds.

### No reset/verification email delivered

- Check `better-auth` logs for SMTP errors.
- Validate `SMTP_*` values and app password.
- Ensure mailbox allows SMTP with app password.

### Admin page shows 401/403

- Confirm admin user has `admin` or `owner` role in `better_auth.member`.
- Confirm cookie domain and trusted origins include portal host.

## Rollback

If pending gate blocks production unexpectedly:

1. Temporarily disable membership gate logic in `/api/auth/forward-auth`.
2. Redeploy `better-auth`.
3. Continue approving users manually while root cause is investigated.
