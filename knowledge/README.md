# Knowledge

Repository-native, durable Markdown for architecture, decisions, prompts, and agent context.

## How to use

1. Start at [INDEX.md](INDEX.md) for a generated file listing.
2. Read [context-packs/repo-context.md](context-packs/repo-context.md) for repo-wide bootstrap.
3. Read tenant-specific context as needed (for example, [context-packs/levinnovation-context.md](context-packs/levinnovation-context.md)).
4. For decisions, see [decisions/](decisions/).
5. For "how to maintain this system", see [operations/](operations/).

## Law

Meaningful architectural or structural changes should update the appropriate ledger:

- **ADR** — decisions under `decisions/`
- **Prompt log** — AI coding sessions under `prompts/{tool}/`
- **Change record** — implementation work under `change-log/`
- **Context packs** — when future agents need new stable context

Regenerate the index after substantive additions:

```bash
make knowledge-index
```

## Current focus areas reflected in knowledge

- Multi-tenant Railway runtime model and source-lock governance
- Better Auth federation and auth-proxy integration patterns
- Customer-service RAG rebuild, KB retrieval hardening, and portal-based ingestion
- LEV Innovation tenant channel adapter and CRM orchestration operations
