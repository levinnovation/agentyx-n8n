# syntax=docker/dockerfile:1.7
# Root Dockerfile for Railway compatibility.
#
# The upstream n8n monorepo keeps its canonical Dockerfile at
# docker/images/n8n/Dockerfile, which expects a pre-built ./compiled
# directory. Railway requires the Dockerfile at the repo root when
# builder=DOCKERFILE is used, so this file inlines the compilation step.
#
# Source: levinnovation/agentyx-n8n
# Baseline: n8n-io/n8n tag 1.84.0

ARG NODE_VERSION=24.14.1

# ─── Stage 1: Builder ─────────────────────────────────────────
# Compile the n8n application from source.
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /src

# Install system build dependencies and pnpm
RUN apk add --no-cache python3 make g++ git curl ca-certificates \
    && npm install -g pnpm@10.32.1

# Railway/CI build: skip git hooks (lefthook) during pnpm install
ENV CI=true

# Copy full source code.
# NOTE: Layer caching is sacrificed here because the monorepo uses
# pnpm workspaces; turbo handles incremental builds on cache hits.
COPY . .

# Install dependencies and build
RUN pnpm install --frozen-lockfile \
    && pnpm build --summarize

# Prune to production-only deployment (creates ./compiled)
RUN NODE_ENV=production DOCKER_BUILD=true \
    pnpm --filter=n8n --prod --legacy deploy --no-optional ./compiled \
    && NODE_ENV=production DOCKER_BUILD=true \
    pnpm --filter=@n8n/task-runner --prod --legacy deploy --no-optional ./dist/task-runner-javascript

# ─── Stage 2: Runtime ─────────────────────────────────────────
# Rebuild native addons for the target platform, then assemble the
# final image matching the upstream runtime layout.
FROM node:${NODE_VERSION}-alpine3.22 AS native-builder
COPY --from=builder /src/compiled /usr/local/lib/node_modules/n8n
RUN apk add --no-cache python3 make g++ \
    && cd /usr/local/lib/node_modules/n8n \
    && npm rebuild sqlite3 isolated-vm

FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION=snapshot
ARG N8N_RELEASE_TYPE=dev
ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=${N8N_RELEASE_TYPE}
ENV SHELL=/bin/sh

WORKDIR /home/node

COPY --from=native-builder /usr/local/lib/node_modules/n8n /usr/local/lib/node_modules/n8n
COPY --from=builder /src/dist/task-runner-javascript /usr/local/lib/node_modules/n8n/dist/task-runner-javascript
COPY docker/images/n8n/docker-entrypoint.sh /

RUN ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n \
    && mkdir -p /home/node/.n8n \
    && chown -R node:node /home/node \
    && rm -rf /root/.npm /tmp/*

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool" \
      org.opencontainers.image.source="https://github.com/levinnovation/agentyx-n8n" \
      org.opencontainers.image.url="https://n8n.io" \
      org.opencontainers.image.version=${N8N_VERSION}
