# syntax=docker/dockerfile:1
# Thin custom layer on top of custom Agentyx n8n image with SSO runtime patch.
# The base image (ghcr.io/levinnovation/agentyx-n8n) has the custom nodes baked in.
FROM ghcr.io/levinnovation/agentyx-n8n:latest

USER root

# Copy runtime SSO patch script and wrapper entrypoint
COPY patch-auth-runtime.js /patch-auth-runtime.js
COPY docker-entrypoint-wrapper.sh /docker-entrypoint-wrapper.sh
RUN chmod +x /patch-auth-runtime.js /docker-entrypoint-wrapper.sh

# Apply the SSO patch at build time while we still have root access.
# The upstream image stores compiled JS under /usr/local/lib/node_modules/n8n
RUN node /patch-auth-runtime.js
RUN npm install -g n8n-nodes-mcp

RUN chown -R node:node /home/node
USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint-wrapper.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool (Agentyx fork with SSO)" \
      org.opencontainers.image.source="https://github.com/levinnovation/agentyx-n8n" \
      org.opencontainers.image.url="https://n8n.io"

# Tell n8n where to find the baked-in custom community nodes
ENV N8N_CUSTOM_EXTENSIONS=/usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx/dist/nodes
