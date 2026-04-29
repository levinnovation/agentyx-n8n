# Quotation Assistant

LangGraph agent for the `kitchen-quotation` capability.

## Structure

- `app/graph.py` — StateGraph with intent router, catalog lookup, compose reply, handoff
- `app/tools.py` — Tool functions (catalog search, CRM sync, etc.)
- `app/memory.py` — Conversation memory
- `app/config.py` — Runtime config
- `app/models.py` — Pydantic models
- `app/kapso.py` — Kapso WhatsApp channel adapter
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
- [ ] Add Kapso webhook handler
- [ ] Configure Langfuse tracing
