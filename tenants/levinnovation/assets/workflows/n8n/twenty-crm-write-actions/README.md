# Twenty CRM Write Actions (Levinnovation)

Write-focused workflow tool for AI agents to perform direct Twenty CRM updates.

## Supported operations

- `upsert_person`
- `upsert_company`
- `upsert_opportunity`

## Input behavior

The tool accepts flexible conversational payloads and normalizes:

- `email` (with placeholder fallback from `user_id`)
- `company` extraction from message text
- person/opportunity identifiers when provided

## Output

Returns structured write result:

- `ok`
- `operation`
- `person`
- `company`
- `opportunity`
- `text`
