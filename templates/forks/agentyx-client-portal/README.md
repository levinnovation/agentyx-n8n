# Agentyx Client Portal

Next.js 14 App Router + Tailwind + shadcn/ui tenant-facing portal.

## Stack

- Next.js 14 App Router
- Tailwind CSS
- shadcn/ui (New York style, slate base)
- Better Auth client SDK
- TanStack Query

## Routes

- `/sign-in` — Sign in page
- `/sign-up` — Sign up page
- `/dashboard` — Main dashboard
- `/dashboard/agents` — Agent management
- `/dashboard/conversations` — Chat history
- `/dashboard/observability` — Traces and metrics
- `/dashboard/admin` — Tenant settings
- `/api/agent/[...path]` — BFF proxy to agent service

## Env

See `.env.example`.

## Deploy

Railway deploys from `agentyx/main` branch (Phase 1) or GHCR image (Phase 2).
