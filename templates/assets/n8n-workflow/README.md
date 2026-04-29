# {{asset_name}}

n8n workflow asset for `{{capability_id}}`.

## Files

- `workflow.json` — the n8n workflow definition
- `README.md` — this file

## Importing

```bash
make compile-n8n TENANT={{tenant_id}} DOMAIN={{domain_id}} CAPABILITY={{capability_id}} ASSET={{asset_id}}
```

## TODO

- [ ] Build real workflow nodes
- [ ] Configure credentials
- [ ] Add error handling
