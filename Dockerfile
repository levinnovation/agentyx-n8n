FROM --platform=linux/amd64 n8nio/n8n:1.84.0
USER root
COPY patch-auth-runtime.js /tmp/patch-auth-runtime.js
RUN chown -R node:node /home/node
USER node
