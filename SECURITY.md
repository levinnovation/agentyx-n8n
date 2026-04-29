# Security

> Security policies and practices for this repository.

## Threat Model

This repository contains business logic, prompt templates, and deployment configurations. It does NOT contain runtime secrets, but it DOES contain:
- System prompts that could be extracted
- Deployment metadata (service names, URLs)
- Business process definitions

## Policies

1. **No Secrets in Git.** If you find a secret committed, rotate it immediately and open a security incident PR.
2. **Prompt Review.** System prompts are reviewed for injection vulnerabilities before merge.
3. **Dependency Scanning.** Python dependencies are scanned in CI.
4. **Branch Protection.** `main` requires PR + CI pass.

## Reporting

Open a confidential issue or email the maintainers directly.

## Compliance

- GDPR: Tenant data contracts declare retention policies.
- SOC2: Change management is enforced via PR + CI.
