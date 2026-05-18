# Railway build context is the repo root (not services/linkedin-mcp/).
# All COPY paths must be fully qualified from repo root.

# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY services/linkedin-mcp/package.json ./
RUN npm install --ignore-scripts
COPY services/linkedin-mcp/tsconfig.json ./
COPY services/linkedin-mcp/src ./src
RUN npm run build && npm prune --omit=dev

# Stage 2: runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apk add --no-cache curl \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nodejs -u 1001 -G nodejs
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://127.0.0.1:3000/healthz >/dev/null || exit 1
CMD ["node", "dist/server.js"]
