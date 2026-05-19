# syntax=docker/dockerfile:1
# Thin custom layer on top of upstream n8n image with Agentyx SSO runtime patch
# and Agentyx community nodes baked in.
ARG N8N_VERSION=2.21.2
FROM n8nio/n8n:${N8N_VERSION}

USER root

# Copy runtime SSO patch script and wrapper entrypoint
COPY patch-auth-runtime.js /patch-auth-runtime.js
COPY docker-entrypoint-wrapper.sh /docker-entrypoint-wrapper.sh
RUN chmod +x /patch-auth-runtime.js /docker-entrypoint-wrapper.sh

# Apply the SSO patch at build time while we still have root access.
# The upstream image stores compiled JS under /usr/local/lib/node_modules/n8n
RUN node /patch-auth-runtime.js
RUN npm install -g n8n-nodes-mcp

# --- Agentyx custom community nodes ---
# Copy the n8n-node-sdk source and build custom nodes
COPY services/n8n-node-sdk /tmp/n8n-node-sdk
RUN cd /tmp/n8n-node-sdk && \
    npm ci && \
    npm run build && \
    for node_dir in src/nodes/*/; do \
      cp "$node_dir"*.svg "dist/nodes/$(basename $node_dir)/" 2>/dev/null || true; \
    done && \
    mkdir -p /usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx && \
    cp -r dist /usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx/dist && \
    cp package.json /usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx/package.json && \
    rm -rf /tmp/n8n-node-sdk && \
    echo "Custom nodes installed successfully"

# Verify the custom nodes are installed correctly
RUN test -f /usr/local/lib/node_modules/@levinnovation/n8n-nodes-agentyx/dist/nodes/AgentyxAIAgentBasicNode/AgentyxAIAgentBasicNode.node.js
# --- End custom nodes ---

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