# syntax=docker/dockerfile:1
# Build Paperclip from upstream at a pinned commit.
# TODO: replace with an official image when available.
FROM node:20-slim AS builder
WORKDIR /app
ARG PAPERCLIP_COMMIT=main
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 https://github.com/paperclipai/paperclip.git . && \
    git checkout ${PAPERCLIP_COMMIT}
RUN npm ci && npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/main.js"]
