# syntax=docker/dockerfile:1
# n8n with Agentyx SSO patch + pre-built custom community nodes.
ARG N8N_VERSION=2.21.2
FROM n8nio/n8n:${N8N_VERSION}

USER root

# SSO runtime patch
COPY patch-auth-runtime.js /patch-auth-runtime.js
COPY docker-entrypoint-wrapper.sh /docker-entrypoint-wrapper.sh
RUN chmod +x /patch-auth-runtime.js /docker-entrypoint-wrapper.sh && \
    node /patch-auth-runtime.js

# MCP community nodes
RUN npm install -g n8n-nodes-mcp

# Pre-built Agentyx custom community nodes (compiled in agentyx-vertical-assets CI)
COPY custom-nodes/@levinnovation/n8n-nodes-agentyx /usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx

# n8n community node discovery symlink
RUN mkdir -p /home/node/.n8n/nodes && \
    ln -sf /usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx /home/node/.n8n/nodes/@levinnovation-n8n-nodes-agentyx && \
    chown -R node:node /home/node

USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint-wrapper.sh"]

ENV N8N_CUSTOM_EXTENSIONS=/usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx/dist/nodes
