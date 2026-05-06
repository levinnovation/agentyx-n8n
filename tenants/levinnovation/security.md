# LEV Innovation Security

## Data Classification

- Public: website copy, public LinkedIn profile data.
- Internal: lead scoring logic, campaign strategy, qualification prompts.
- Confidential: contact emails, phone numbers, CRM notes, meeting metadata.

## Security Controls

- Secrets are stored in n8n credentials and environment variables, never in Git.
- Workflow exports and specs are versioned in Git for auditability.
- CRM and calendar integrations follow least-privilege OAuth scopes.

## Incident Response

Contact: security@levinnovation.com
