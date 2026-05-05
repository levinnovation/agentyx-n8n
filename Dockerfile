# syntax=docker/dockerfile:1
# Thin custom layer on top of upstream n8n image.
#
# The levinnovation/agentyx-n8n fork is a mirror of n8n-io/n8n.
# Rather than building the entire monorepo from source (30+ min, often fails
# due to OOM/timeout), we extend the official n8nio/n8n image and apply
# any fork-specific customizations (patches, config, entrypoint overrides).
#
# When we need actual code patches, we'll switch to a full source build
# in a separate CI pipeline with larger runners.
#
# Baseline: n8n-io/n8n tag 1.84.0

ARG N8N_VERSION=1.84.0
FROM n8nio/n8n:${N8N_VERSION}

USER root

# Copy any fork-specific customizations here.
# Currently the fork is a pure mirror, so no patches are applied.
# Examples of future customizations:
#   - COPY custom-nodes/ /usr/local/lib/node_modules/n8n/dist/
#   - COPY patches/ /patches/ && apply-patches.sh
#   - COPY custom-entrypoint.sh /docker-entrypoint.d/

# Ensure proper permissions
RUN chown -R node:node /home/node

USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool (Agentyx fork)" \
      org.opencontainers.image.source="https://github.com/levinnovation/agentyx-n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
