# Vendor terms

| Vendor / tool | In-repo role |
|---------------|----------------|
| LangGraph | Agent runtime asset type (`langgraph-agent`) |
| n8n | Workflow asset type (`n8n-workflow`); JSON versioned in Git |
| Supabase | Infra asset patterns under `standards/` / templates |
| Kapso / WhatsApp | Channel integration examples (e.g. `whatsapp-kapso`) |
| Railway | Canonical per-tenant deployment platform (`deployment.platform: railway`); see ADR-0010 |
| LibreChat | Open-source chat UI; deployed as a Railway service per tenant stack |
| Paperclip | AI-team orchestrator (`paperclipai/paperclip`); built from upstream repo as a Railway service |
| Langfuse | LLM observability / tracing; deployed as a Railway service per tenant stack |
| Flowise | Optional low-code agent builder; gated by `FLOWISE_ENABLED` in Railway stack |
| Agentyx Portal | Tenant-facing portal SPA; placeholder image until built |
| Better Auth | Per-tenant auth federation IDP; deployed as a Railway service per ADR-0012 |

**Rule:** Vendor dashboards are not source of truth—Git files are.
