# syntax=docker/dockerfile:1
FROM node:20-slim
WORKDIR /app

ARG PAPERCLIP_COMMIT=master

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

RUN git clone --depth 1 https://github.com/paperclipai/paperclip.git . && \
    git checkout ${PAPERCLIP_COMMIT}

RUN pnpm install && pnpm run build

ENV NODE_ENV=production
ENV PORT=3100

WORKDIR /app/server
EXPOSE 3100
CMD ["pnpm", "exec", "tsx", "dist/index.js"]
