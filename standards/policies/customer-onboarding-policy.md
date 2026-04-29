# Customer Onboarding Policy

> Standards for onboarding new tenants.

## Rules

1. New tenants MUST be scaffolded via `make scaffold-tenant`.
2. Tenant specs MUST include owner, contact, and domain list.
3. At least one domain and one capability MUST be defined.
4. All assets MUST validate against schemas before merge.
5. Onboarding MUST include a security review.

## Enforcement

- `scripts/scaffold_tenant.py` enforces minimum structure.
- CI validates all tenant specs on every PR.
