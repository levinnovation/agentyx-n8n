# Migration context pack

Use when moving or renaming tenants, domains, capabilities, or large asset sets.

## Checklist

1. Inventory current paths and IDs (`asset.yaml`, `capability.yaml`, `domain.yaml`, `tenant.yaml`)
2. Record rationale in `knowledge/change-log/YYYY/MM/...`
3. If a **decision** is made (new pattern, deprecation), add an ADR under `knowledge/decisions/`
4. Update capabilities’ asset references and dependencies consistently
5. Run `make validate` until clean
6. Update context packs if onboarding or validation steps changed
7. `make knowledge-index`

## Rejected pattern

“Big bang” rename without inventory and without a change record—hard to review and easy to break referential intent.
