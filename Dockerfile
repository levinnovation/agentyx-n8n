# syntax=docker/dockerfile:1
# Thin custom layer on top of upstream n8n image with runtime auth patches.
ARG N8N_VERSION=1.84.0
FROM n8nio/n8n:${N8N_VERSION}

USER root

COPY patch-auth-runtime.js /usr/local/bin/patch-auth-runtime.js
RUN mkdir -p /docker-entrypoint.d && \
    printf '#!/bin/sh\nnode /usr/local/bin/patch-auth-runtime.js\n' > /docker-entrypoint.d/99-patch-auth.sh && \
    chmod +x /docker-entrypoint.d/99-patch-auth.sh

RUN chown -R node:node /home/node

USER node
EXPOSE 5678
