# ADR-0034: Recall.ai Signed-In Google Meet Bot for LEV Innovation (Sofer)

## Status

Accepted

## Context

The `meeting-minutes-and-followups` capability (Sofer) was already scaffolded with `meetings-agent-core` as a downstream processor of meeting transcripts. Per ADR-0033, meeting attendance was intentionally kept as a separate upstream responsibility. We now need to select and integrate a concrete meeting-joiner/bot service.

Options considered:

1. **Custom Chrome/puppeteer bot** — High maintenance, fragile against Google Meet UI changes, requires VM/browser infrastructure.
2. **Open-source meeting bot SDK** — Good for Zoom, less mature for Google Meet signed-in requirements.
3. **Recall.ai managed bots** — Vendor handles browser automation, transcription providers, waiting-room logic, and signed-in Google Workspace SSO. Proven at scale.

## Decision

Use **Recall.ai** as the meeting-joiner for Sofer, configured for **signed-in Google Meet bots** so they can bypass waiting rooms and avoid guest limitations.

## Consequences

### Positive
- No browser automation code to maintain.
- Automatic transcription via Recall.ai (default or Deepgram, etc.).
- Signed-in bots avoid Google Meet guest warnings.
- Waiting-room bypass when bot email is on the calendar invite.
- Webhook-driven architecture fits the existing n8n event model.

### Negative
- Per-minute/per-bot billing from Recall.ai.
- Requires a dedicated Google Workspace with organization-wide SSO (cannot reuse existing LEV Innovation workspace).
- ~30 concurrent bots per Google login; need multiple logins for high concurrency.
- Vendor lock-in for the meeting-joiner layer.

## Google Workspace SSO Setup

1. Create a **new** paid Google Workspace (e.g., `sso.levinnovation.com`).
2. Generate self-signed cert/key pair.
3. Configure third-party SSO profile in Google Admin console pointing to Recall.ai sign-in/out URLs.
4. Create Recall.ai Google Login Group and add login(s).
5. Invite bot email(s) to calendar events.

## Asset Location

- Integration asset: `tenants/levinnovation/assets/integrations/recallai-gmeet-bot/`
- Capability: `tenants/levinnovation/domains/internal-operations/capabilities/meeting-minutes-and-followups/`

## References

- ADR-0033: levinnovation-meetings-agent-core
- [Recall.ai Signed-In Google Meet Bots](https://docs.recall.ai/docs/google-meet-signed-in-bots)
