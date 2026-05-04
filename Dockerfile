# Agentyx n8n — Dockerfile raíz para Railway deploy
# Usa la imagen oficial como base. Si en el futuro se agregan
# cambios de branding/config, copiarlos sobre la imagen base.

FROM n8nio/n8n:latest

LABEL org.opencontainers.image.title="agentyx-n8n"
LABEL org.opencontainers.image.description="n8n para Agentyx (client-demo)"

# Si hay archivos de branding/config custom en el repo, copiarlos aquí:
# COPY custom-config.json /home/node/.n8n/

# La imagen oficial ya expone el puerto y define ENTRYPOINT/USER
# Railway inyecta PORT y las demás env vars automáticamente.
