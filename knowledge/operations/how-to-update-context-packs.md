# How to update context packs

Update when:

- Validation commands or Makefile targets change
- Tenant/domain/capability patterns change
- New first-class directories (e.g. `common/utils/`) appear
- Repeated onboarding friction or agent mistakes

Process:

1. Update **canonical** docs first (`CONSTITUTION.md`, `DOMAIN_MODEL.md`, ADRs).
2. Edit the smallest number of packs—usually `repo-context.md` + affected tenant pack.
3. Keep packs **short**; link to deep docs.
4. `make knowledge-index`
5. `make validate`
