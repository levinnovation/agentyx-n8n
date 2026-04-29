# Agentyx n8n Fork

Fork de n8n-io/n8n para tracking de configuración de Agentyx Platform.

## Deploy

Este repo se usa principalmente para tracking. El deploy en Railway usa la imagen Docker oficial:

```sh
railway add -i n8nio/n8n:latest -s agx-<slug>-n8n
```

Variables: ver `templates/env/n8n.env.example` en `agentyx-infra`.

