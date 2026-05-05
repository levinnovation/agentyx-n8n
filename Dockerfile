# syntax=docker/dockerfile:1
# Railway-compatible Dockerfile for levinnovation/agentyx-n8n.
#
# Builds n8n from source. Optimized for Railway shared builders.
# Avoids BuildKit cache mounts (not always supported on Railway builders).
#
# Source: levinnovation/agentyx-n8n
# Baseline: n8n-io/n8n tag 1.84.0

ARG NODE_VERSION=24.14.1

# ─── Stage 1: Builder ─────────────────────────────────────────
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /src

# Install build toolchain and pnpm
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable && corepack prepare pnpm@10.32.1 --activate

# Skip git hooks (lefthook) during pnpm install
ENV CI=true

# Copy full source (layer caching is limited due to monorepo size)
COPY . .

# Install dependencies and build
# Limit concurrency to avoid OOM on shared builders
ENV NODE_OPTIONS="--max-old-space-size=6144"
RUN pnpm install --frozen-lockfile \
    && pnpm build --summarize --concurrency=2

# Prune to production-only deployment
RUN NODE_ENV=production DOCKER_BUILD=true \
    pnpm --filter=n8n --prod --legacy deploy --no-optional ./compiled \
    && NODE_ENV=production DOCKER_BUILD=true \
    pnpm --filter=@n8n/task-runner --prod --legacy deploy --no-optional ./dist/task-runner-javascript

# ─── Stage 2: Native modules ──────────────────────────────────
FROM node:${NODE_VERSION}-slim AS native-builder
COPY --from=builder /src/compiled /usr/local/lib/node_modules/n8n
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && cd /usr/local/lib/node_modules/n8n \
    && npm rebuild sqlite3 isolated-vm

# ─── Stage 3: Runtime ─────────────────────────────────────────
FROM n8nio/base:${NODE_VERSION}

ARG N8N_VERSION=1.84.0
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
