# Prompt Policy

> Standards for system prompts and prompt templates.

## Rules

1. Prompts MUST be `.md` files, not inline strings in code.
2. No prompt > 4000 characters without explicit review.
3. No hardcoded prices, phone numbers, or URLs in prompts.
4. Prompts MUST declare their version and owner capability.
5. Variable interpolation MUST use `{{variable}}` syntax.

## Enforcement

- `scripts/validate_specs.py` checks prompt file sizes.
- CI regex scan for hardcoded secrets in `.md` files.
