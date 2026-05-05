# syntax=docker/dockerfile:1
# Build context is the repo root, so paths are relative to root.

FROM node:20-alpine AS builder
WORKDIR /app
COPY services/better-auth/package.json services/better-auth/tsconfig.json ./
RUN npm ci
COPY services/better-auth/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
