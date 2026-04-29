# How to record a decision

1. Confirm whether this is a **new law** or local tenant narrative.
   - **Law / pattern** → `knowledge/decisions/` (new numbered ADR)
   - **Tenant-specific** → `knowledge/tenants/<tenant>/...`
2. Copy `knowledge/decisions/ADR_TEMPLATE.md` to the next number.
3. Fill **Context / Decision / Consequences / Rejected alternatives / Follow-up**.
4. Link from related change records or prompt logs.
5. Run `make knowledge-index`.
