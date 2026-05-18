# Recall.ai Google Meet Bot (Sofer)

Integration asset that enables the Sofer meeting scribe to join Google Meet calls via [Recall.ai](https://recall.ai) bots.

## Purpose

Recall.ai provides managed meeting bots that join video conferences, record audio/video, and return structured transcripts. This integration replaces the generic `meeting-joiner` dependency in `meetings-agent-core` with a concrete, vendor-governed implementation.

## Architecture

```
User → meetings-agent-core → recallai-gmeet-bot → Recall.ai API → Google Meet
                                              ↓
                                   Webhook (status/transcript)
                                              ↓
                                   meetings-agent-core (transcript_text)
```

## Bot Lifecycle

1. **Create Bot**
   - `POST https://us-east-1.recall.ai/api/v1/bot/`
   - Required fields: `meeting_url`, `bot_name` (ignored for signed-in bots), `google_meet.google_login_group_id`
   - Optional: `join_at` for scheduled joins

2. **Webhooks**
   - Recall.ai sends webhooks for status changes (`joining`, `in_call`, `call_ended`, etc.)
   - Transcript becomes available after `call_ended`
   - Fetch via `GET /api/v1/bot/{bot_id}/transcript` or receive via webhook

3. **Transcript Delivery**
   - Normalize Recall.ai transcript chunks into `transcript_text`
   - POST to `meetings-agent-core` n8n Execute Workflow Trigger with envelope

## Signed-In Google Meet Bots

By default, Recall.ai bots join as anonymous guests. For production use, signed-in bots are required to:
- Bypass waiting rooms (when invited to calendar events)
- Avoid "unauthenticated bot" warnings
- Use custom avatars and names

### Setup Steps

1. **Create Google Login Group in Recall.ai**
   - Dashboard: [US East Login Groups](https://us-east-1.recall.ai/explorer/google-login-groups)
   - Set `login_mode` to `always` for testing, `required` for production

2. **Create Dedicated Google Workspace**
   - Must be a **new, paid** Google Workspace (do not reuse existing)
   - Example domain: `sso.levinnovation.com`
   - Create at least 1 user (e.g., `sofer-bot@sso.levinnovation.com`)
   - Sign in and accept terms before enabling SSO

3. **Enable SSO in Google Workspace**
   - Generate self-signed cert:
     ```bash
     openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 3650 -nodes
     ```
   - Admin Console → Security → Authentication → SSO with third party IdP
   - Add SAML profile:
     - Sign-in page URL: `https://us-east-1.recall.ai/api/v1/bot/gmeet-sign-in`
     - Sign-out page URL: `https://us-east-1.recall.ai/api/v1/bot/gmeet-sign-out`
     - Verification certificate: `cert.pem`
     - Check "Use a domain-specific issuer"
   - Assign SSO profile to the organization

4. **Create Google Login in Recall.ai**
   - Dashboard or API: `POST /api/v2/google-logins/`
   - Fields:
     - `group_id`: from Step 1
     - `sso_v2_workspace_domain`: `sso.levinnovation.com`
     - `sso_v2_private_key`: contents of `key.pem`
     - `sso_v2_cert`: contents of `cert.pem`
     - `email`: `sofer-bot@sso.levinnovation.com`
     - `is_active`: true

5. **Invite Bot to Calendar Events**
   - Add `sofer-bot@sso.levinnovation.com` to Google Calendar events
   - Bot auto-joins without waiting room

### Concurrency Limits

Each Google login supports ~30 concurrent bots. For higher concurrency, create multiple logins in the same group and use a Google Group email on calendar invites.

## n8n Workflows

Two n8n workflow JSONs are provided in this asset:

1. **`recallai-bot-orchestrator.json`** — Receives meeting requests via Execute Workflow Trigger, builds the Create Bot payload, calls Recall.ai, and returns `bot_id`.
2. **`recallai-webhook-receiver.json`** — Public webhook that receives Recall.ai lifecycle events, validates the webhook secret, fetches the transcript when ready, and forwards to `meetings-agent-core`.

Import these into your n8n instance, wire the `recall-api-key` credential, and set environment variables from `.env.example`.

## GCP Cloud Run Deployment (Recommended)

This asset includes production-ready Python FastAPI services deployed to **Google Cloud Run**.

### Services

| Service | Source | Endpoint | Description |
|---------|--------|----------|-------------|
| `recallai-bot-orchestrator` | `services/orchestrator/` | `POST /bot/create` | Creates Recall.ai bots on demand |
| `recallai-webhook-receiver` | `services/webhook-receiver/` | `POST /webhook/recallai` | Receives Recall.ai webhooks |

### Secrets in GCP Secret Manager

Stored in project `agentyx-493918`:
- `recall-api-key` — Recall.ai API token
- `recall-webhook-secret` — Webhook HMAC validation secret
- `recall-sso-private-key` — Google Workspace SSO private key (PEM)
- `recall-sso-cert` — Google Workspace SSO certificate (PEM)

### Deploy

```bash
cd services/orchestrator
bash deploy.sh

cd ../webhook-receiver
bash deploy.sh
```

Both scripts:
1. Enable required GCP APIs
2. Create the `recallai-bot-runner` service account
3. Grant Secret Manager read access
4. Build & push container images via Cloud Build
5. Deploy to Cloud Run (us-east4)

### Architecture (GCP)

```
┌─────────────────┐      ┌────────────────────────┐      ┌───────────────┐
│ meetings-agent- │─────▶│ recallai-bot-orchestrator│─────▶│ Recall.ai API │
│     core        │      │   (Cloud Run, Python)   │      │  us-east-1    │
└─────────────────┘      └────────────────────────┘      └───────────────┘
         ▲                                                  │
         │ Webhook                                          │ Bot joins
         │                                                  ▼
┌────────────────────────┐                              ┌───────────────┐
│ recallai-webhook-receiver│                              │  Google Meet  │
│   (Cloud Run, Python)   │                              └───────────────┘
└────────────────────────┘
```

## Setup

For step-by-step instructions (including the pre-generated SSO certificate), see:

**[`RUNBOOK.md`](RUNBOOK.md)**

This covers:
- Creating the new Google Workspace (`sso.levinnovation.com`)
- Enabling SSO in Google Admin Console
- Creating Recall.ai Login Groups and Logins
- Verifying with a test bot
- Registering webhooks

## Environment Variables

See `.env.example` for the full variable list.

## n8n Orchestration

The n8n workflow that orchestrates this integration lives under `meetings-agent-core` or can be built as a separate upstream workflow. It must:

1. Receive a meeting request (URL, optional `join_at`)
2. Call Recall.ai `Create Bot`
3. Listen for Recall.ai webhooks (or poll status)
4. On `call_ended`, fetch transcript
5. Forward to `meetings-agent-core` with standard envelope

## Security

- API key and webhook secrets are stored in n8n credentials or Railway environment variables only.
- Google Workspace SSO keys (`key.pem`, `cert.pem`) must be stored in a secure vault (1Password, Railway secrets, or similar).
- Never commit secrets to this repository.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Bot stuck in waiting room | Ensure bot email is on the calendar event; verify `login_mode` is `always` |
| "domain not configured for SSO" | Confirm SSO uses the primary domain or subdomain of the primary domain |
| `google_meet_login_not_available` fatal event | Add more active logins to the login group |
| Transcript empty | Check meeting had audio; verify bot was not muted by host |
| Bot name not configurable | Expected for signed-in bots; name comes from Google account |

## References

- [Recall.ai API Docs](https://docs.recall.ai)
- [Signed-In Google Meet Bots](https://docs.recall.ai/docs/google-meet-signed-in-bots)
- [Recall.ai Explorer (US East)](https://us-east-1.recall.ai/explorer)
