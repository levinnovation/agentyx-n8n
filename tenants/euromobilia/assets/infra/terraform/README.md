# Terraform Scaffold

This directory contains Terraform scaffolds for Euromobilia infrastructure.

## Scope

- Document Supabase project configuration
- Reference secret names (not values)
- Map storage buckets and edge functions

## Files

- `main.tf` — resources
- `variables.tf` — inputs
- `outputs.tf` — outputs

## Usage

```bash
terraform init
terraform plan
terraform apply
```

## Secrets

All secret values are read from environment variables or a `.tfvars` file
that is gitignored. Never commit secrets.
