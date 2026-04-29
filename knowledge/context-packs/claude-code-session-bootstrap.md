# Claude Code session bootstrap

1. Read `AGENTS.md` and `knowledge/context-packs/repo-context.md`
2. Read `CONSTITUTION.md` and `DOMAIN_MODEL.md`
3. Preserve **tenant → domain → capability → assets**; never add standalone app folders at repo root
4. Prefer **small commits** and **small diffs**; ask before destructive refactors
5. After structural changes: `make validate`
6. Do **not** claim scaffolded code is production-ready
7. If migrating legacy code: write a **legacy inventory** first (e.g. `knowledge/change-log/...`)

## Recipes

See `opencode-session-bootstrap.md` for tenant/capability/asset/common-util prompt patterns.
