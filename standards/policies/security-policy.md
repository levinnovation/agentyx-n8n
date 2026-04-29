# Security Policy

> Security standards for all assets.

## Rules

1. No secrets in Git. Ever.
2. All webhooks MUST validate signatures.
3. All external APIs MUST use HTTPS.
4. PII MUST be encrypted at rest and in transit.
5. Access controls MUST be capability-scoped.
6. Dependency updates MUST be automated via Dependabot.

## Enforcement

- CI secret scanning.
- Penetration tests quarterly.
- Security review for all deployment changes.
