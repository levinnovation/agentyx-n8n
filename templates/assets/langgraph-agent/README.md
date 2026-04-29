# {{asset_name}}

LangGraph agent asset for `{{capability_id}}`.

## Structure

- `app/graph.py` — StateGraph definition
- `app/tools.py` — Tool functions
- `app/memory.py` — Memory configuration
- `app/config.py` — Runtime configuration
- `app/models.py` — Pydantic models
- `app/channel_adapter.py` — Channel-specific logic
- `system-prompt.md` — System prompt
- `tools.yaml` — Tool registry
- `memory.yaml` — Memory registry

## Running Locally

```bash
python -m app.main
```

## TODO

- [ ] Implement real graph nodes
- [ ] Add unit tests
- [ ] Configure observability
