# syntax=docker/dockerfile:1
# Thin custom layer on top of upstream n8n image with runtime auth patches.
#
# The levinnovation/agentyx-n8n fork applies trusted-proxy SSO patches
# at container startup by modifying the compiled JS in the upstream image.
# This avoids a 30+ minute source build while still enabling SSO.
#
# Baseline: n8n-io/n8n tag 1.84.0

ARG N8N_VERSION=1.84.0
FROM n8nio/n8n:${N8N_VERSION}

USER root

# Copy runtime patch script
COPY patch-auth-runtime.js /usr/local/bin/patch-auth-runtime.js

# Create docker-entrypoint.d directory and add our patch
RUN mkdir -p /docker-entrypoint.d && \
    echo '#!/bin/sh\nnode /usr/local/bin/patch-auth-runtime.js' > /docker-entrypoint.d/99-patch-auth.sh && \
    chmod +x /docker-entrypoint.d/99-patch-auth.sh

# Ensure proper permissions
RUN chown -R node:node /home/node

USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool (Agentyx fork with SSO patches)" \
      org.opencontainers.image.source="https://github.com/levinnovation/agentyx-n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
