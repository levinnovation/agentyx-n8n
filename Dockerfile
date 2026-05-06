# syntax=docker/dockerfile:1
# Thin custom layer on top of upstream n8n image with Agentyx SSO runtime patch.
ARG N8N_VERSION=1.84.0
FROM n8nio/n8n:${N8N_VERSION}

USER root

# Copy runtime SSO patch script
COPY n8n-sso-patch.js /n8n-sso-patch.js
RUN chmod +x /n8n-sso-patch.js

RUN chown -R node:node /home/node
USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool (Agentyx fork with SSO)" \
      org.opencontainers.image.source="https://github.com/levinnovation/agentyx-n8n" \
      org.opencontainers.image.url="https://n8n.io"
