# syntax=docker/dockerfile:1
# Multi-stage build for n8n with Agentyx SSO patches.
# Builds from the levinnovation/agentyx-n8n fork source.

# ─── Stage 1: Builder ──────────────────────────────────────────────
FROM node:24-slim AS builder

WORKDIR /build

# Install build dependencies for native modules (sqlite3, isolated-vm)
RUN apt-get update && apt-get install -y \
    python3 make g++ git \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy repo source
COPY . .

# Install dependencies and build
# We build only the CLI package and its dependencies
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm build

# ─── Stage 2: Runtime ──────────────────────────────────────────────
FROM node:24-slim AS runtime

ENV NODE_ENV=production
ENV N8N_RELEASE_TYPE=dev
ENV SHELL=/bin/sh

WORKDIR /home/node

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    git openssh openssl graphicsmagick tini tzdata ca-certificates libc6-compat \
    && rm -rf /var/lib/apt/lists/*

# Copy built n8n from builder
COPY --from=builder /build/packages/cli/dist /usr/local/lib/node_modules/n8n/dist
COPY --from=builder /build/packages/cli/package.json /usr/local/lib/node_modules/n8n/package.json
COPY --from=builder /build/packages/cli/bin /usr/local/lib/node_modules/n8n/bin
COPY --from=builder /build/node_modules /usr/local/lib/node_modules/n8n/node_modules
COPY --from=builder /build/packages /usr/local/lib/node_modules/n8n/packages

# Create symlink
RUN ln -s /usr/local/lib/node_modules/n8n/bin/n8n /usr/local/bin/n8n

# Setup user
RUN mkdir -p /home/node/.n8n && chown -R node:node /home/node

COPY docker/images/n8n/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5678/tcp
USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint.sh"]

LABEL org.opencontainers.image.title="n8n" \
      org.opencontainers.image.description="Workflow Automation Tool (Agentyx fork with SSO)" \
      org.opencontainers.image.source="https://github.com/levinnovation/agentyx-n8n" \
      org.opencontainers.image.url="https://n8n.io"
