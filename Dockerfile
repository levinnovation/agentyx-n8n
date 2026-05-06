# syntax=docker/dockerfile:1
# Thin custom layer on top of upstream n8n image.
ARG N8N_VERSION=1.84.0
FROM n8nio/n8n:${N8N_VERSION}

USER root
RUN chown -R node:node /home/node
USER node

EXPOSE 5678/tcp
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]
