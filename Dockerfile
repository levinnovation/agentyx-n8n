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
# Install in n8n's own node_modules so n8n discovers the package at startup
COPY custom-nodes/@levinnovation/n8n-nodes-agentyx /usr/local/lib/node_modules/n8n/node_modules/@levinnovation/n8n-nodes-agentyx

# n8n community node discovery via custom extensions directory
ENV N8N_CUSTOM_EXTENSIONS=/usr/local/lib/node_modules/n8n/node_modules/@levinnovation/n8n-nodes-agentyx/dist/nodes

RUN chown -R node:node /home/node /usr/local/lib/node_modules/n8n/node_modules/@levinnovation
USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint-wrapper.sh"]
