# Tool Governance Policy

> Standards for tool contracts and tool implementations.

## Rules

1. Every tool MUST have a contract in `assets/tools/` or declared in `tools.yaml`.
2. Tool contracts MUST declare input_schema and output_schema.
3. External HTTP calls MUST go through a governed HTTP client.
4. Tools MUST have timeouts and retries.
5. Tools MUST log usage for observability.

## Enforcement

- `scripts/validate_specs.py` checks for missing contracts.
- Integration tests verify tool behavior.
