# WhatsApp Channel Policy

> Standards for WhatsApp channel adapter assets.

## Rules

1. WhatsApp adapters MUST declare `provider` (e.g., `kapso`, `twilio`, `360dialog`).
2. Webhook endpoints MUST validate signatures.
3. Message templates MUST be registered with the provider.
4. Rate limits MUST be respected (e.g., 20 msg/sec for Kapso).
5. Opt-in/opt-out MUST be handled per GDPR.

## Enforcement

- `scripts/validate_specs.py` checks for provider declaration.
- Security review for webhook handlers.
