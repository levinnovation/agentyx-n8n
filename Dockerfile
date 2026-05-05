# syntax=docker/dockerfile:1.7
# Railway-optimized Dockerfile for levinnovation/agentyx-n8n.
#
# Builds n8n from source with aggressive caching and memory-safe settings
# for Railway's shared builders (4 vCPU / 8 GB RAM / 60 min timeout).
#
# Source: levinnovation/agentyx-n8n
# Baseline: n8n-io/n8n tag 1.84.0

ARG NODE_VERSION=24.14.1

# ─── Stage 1: Dependencies ────────────────────────────────────
# Fetch and cache pnpm packages separately from source code for
# optimal layer caching on rebuilds.
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /src

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Install build toolchain
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Skip git hooks (lefthook) during pnpm install
ENV CI=true

# Copy only lockfile + workspace definition first — this layer is cached
# unless pnpm-lock.yaml changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ patches/
COPY scripts/prepare.mjs scripts/
COPY scripts/block-npm-install.js scripts/

# Fetch all packages into the pnpm store (cached via BuildKit mount)
RUN --mount=type=cache,target=/pnpm/store,id=n8n-pnpm \
    pnpm fetch

# ─── Stage 2: Builder ─────────────────────────────────────────
# Copy source and build with constrained concurrency to avoid OOM
# on shared builders.
FROM deps AS builder
WORKDIR /src

# Copy full source
COPY . .

# Install from the previously fetched store (offline, fast)
RUN --mount=type=cache,target=/pnpm/store,id=n8n-pnpm \
    pnpm install --offline --frozen-lockfile

# Build with limited concurrency to stay within Railway memory limits.
ENV NODE_OPTIONS="--max-old-space-size=6144"
RUN pnpm build --summarize --concurrency=2

# Prune to production-only deployment (creates ./compiled)
RUN NODE_ENV=production DOCKER_BUILD=true \
    pnpm --filter=n8n --prod --legacy deploy --no-optional ./compiled

# Prune task runner
RUN NODE_ENV=production DOCKER_BUILD=true \
    pnpm --filter=@n8n/task-runner --prod --legacy deploy --no-optional ./dist/task-runner-javascript

# ─── Stage 3: Native modules ──────────────────────────────────
# Rebuild sqlite3 and isolated-vm for the target glibc platform.
FROM node:${NODE_VERSION}-slim AS native-builder
COPY --from=builder /src/compiled /usr/local/lib/node_modules/n8n
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && cd /usr/local/lib/node_modules/n8n \
    && npm rebuild sqlite3 isolated-vm

# ─── Stage 4: Runtime ─────────────────────────────────────────
# Use n8n's official base image (has tini, fonts, graphicsmagick, etc.)
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
