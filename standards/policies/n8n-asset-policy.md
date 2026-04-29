# n8n Asset Policy

> Standards for n8n workflow assets.

## Rules

1. Every n8n workflow MUST be stored as a JSON file with `.json` extension.
2. Workflow JSON MUST include `name`, `nodes`, `connections`, and `settings`.
3. Credential references MUST use environment variable placeholders, not literal values.
4. Webhook URLs MUST be parameterized.
5. Workflows SHOULD include error handling nodes.

## Enforcement

- `scripts/compile_n8n_asset.py` validates JSON shape.
- CI checks for hardcoded secrets in workflow JSON.
