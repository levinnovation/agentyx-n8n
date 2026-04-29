# Quotation Assistant

LangGraph agent for the `kitchen-quotation` capability. The agent implements **business** quotation logic; **which** customer surface (WhatsApp, web chat, Slack, etc.) calls it is determined by **channel** and **workflow** assets, not by this folder alone (see ADR-0007).

## Structure

- `app/graph.py` — StateGraph with intent router, catalog lookup, compose reply, handoff
- `app/tools.py` — Tool functions (catalog search, CRM sync, etc.)
- `app/memory.py` — Conversation memory
- `app/config.py` — Runtime config
- `app/models.py` — Pydantic models
- `app/kapso.py` — Outbound helper for the **Kapso WhatsApp** channel asset (first wired surface; other channels use their own adapters)
- `system-prompt.md` — System prompt
- `tools.yaml` — Tool registry
- `memory.yaml` — Memory config

## Running Locally

```bash
cd tenants/euromobilia/assets/agents/quotation-assistant
python -m app.main
```

## TODO

- [ ] Implement real intent classification
- [ ] Integrate catalog RAG
- [ ] Harden channel ingress (Kapso webhook today; keep handler thin so other channels can reuse the same agent entrypoint)
- [ ] Configure Langfuse tracing
