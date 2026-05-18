# Runbook: Recall.ai Signed-In Google Meet Bot Setup for LEV Innovation

> **Goal:** Configure a dedicated Google Workspace + Recall.ai SSO so Sofer bots can join Google Meet as signed-in users, bypass waiting rooms, and avoid guest warnings.

## Prerequisites

- Google Workspace admin access (or ability to create a new Workspace).
- Recall.ai account with API key.
- The SSO certificate and private key generated below.

---

## Step 1: Store the SSO Certificate and Private Key

I generated the self-signed cert/key pair for you. **Copy these into 1Password / your vault. Do NOT commit them to Git.**

### Certificate (`cert.pem`)

Paste this into Google Admin Console in Step 3:

```
-----BEGIN CERTIFICATE-----
MIIDYjCCAkoCCQCPICEiYG1I8jANBgkqhkiG9w0BAQsFADBzMQswCQYDVQQGEwJV
UzETMBEGA1UECAwKQ2FsaWZvcm5pYTEWMBQGA1UEBwwNU2FuIEZyYW5jaXNjbzEX
MBUGA1UECgwOTEVWIElubm92YXRpb24xHjAcBgNVBAMMFXNzby5sZXZpbm5vdmF0
aW9uLmNvbTAeFw0yNjA1MTgxNTMyNTRaFw0zNjA1MTUxNTMyNTRaMHMxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQHDA1TYW4gRnJhbmNp
c2NvMRcwFQYDVQQKDA5MRVYgSW5ub3ZhdGlvbjEeMBwGA1UEAwwVc3NvLmxldmlu
bm92YXRpb24uY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxJP8
lSrvHcXe64Su7hcgrUclunVcXzIgbIXn0fV9bzs7Vr35XKSmMfogfOgrp9Tfhjyz
innIc6TDzbHojJrjH8DxBFSTeiz562APm7MXIL5qW5+ABUQBw8n/1mqzjTWUMg7I
mpPU90U6UPIAxvzbrl78TQ75W9qrffFbWz3RL1NllkwXxHoRw1755GwSPYlfI1g2
aO4cwegKhqrc9ukK/9Vai0dnxcwL4+Ogo9Qi1zpu77XX+c6sML2l07z9G4ZGH5c/
vt6bKsAJSJRhDrp4GV38GYIfmy6Aqa0iVjI3lImntc2NCv6wxZKWhAE0fnzYo7p3
PTg8Ymt67kmQWOXDQwIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQBtNlR5c1+goBnF
d6/y0nZuBh+ceBi8wo0JFVYhf9jph+QrVTDvoanCMWam9Ub/JE67QHUH/zxWnBhV
ofn3OsvsOO4DkD2G2XcqUVI5YJ/riq+ix3UYHsqrkm98G2WczUkmTiXK4WvCmtSK
sxpiXAbHATPd4UmNFBaQO620M7wXSyYJZV/JGl0CVPvCftFe/Ulwtl1zSdDL2tOh
G0jilpvdW4WnCjgCO70CHOqAuw4esP88aM4Pz0HbL4NtPBCPQkOj5UinLkabW1+A
YkNQind+2aYhpFgLt6tpue/jtip8zGD2GDuGxXiqAiMp1GgkeHFDoXyJS1HwT9eG
4ak5Dyp3
-----END CERTIFICATE-----
```

### Private Key (`key.pem`)

Paste this into Recall.ai dashboard/API when creating the Google Login in Step 4:

```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEk/yVKu8dxd7r
hK7uFyCtRyW6dVxfMiBshefR9X1vOztWvflcpKYx+iB86Cun1N+GPLOKechzpMPN
seiMmuMfwPEEVJN6LPnrYA+bsxcgvmpbn4AFRAHDyf/WarONNZQyDsiak9T3RTpQ
8gDG/NuuXvxNDvlb2qt98VtbPdEvU2WWTBfEehHDXvnkbBI9iV8jWDZo7hzB6AqG
qtz26Qr/1VqLR2fFzAvj46Cj1CLXOm7vtdf5zqwwvaXTvP0bhkYflz++3psqwAlI
lGEOungZXfwZgh+bLoCprSJWMjeUiae1zY0K/rDFkpaEATR+fNijunc9ODxia3ru
SZBY5cNDAgMBAAECggEADA4TOEaYwVeoEwNhAuLSMy4gxy15S7E0QdN4YuzOE2sr
eWdPCnpiYsA3C9HlE3a/emjwjbZoL4dUJqIZY73/3aukXCKfpKdrcB7E9kRmT7C9
rv66CBiijxItKUYD2s4FV4iGjswwDDXnnJ0qpQlOo4PZrxQTAKoJSEDr3E2PLXqx
QHYXJS9VhheNur2u5LJ2p3y5f8moC4RgDXSnrhvZ1YnCPSavXAPwj5lDkuqY3pf0
w8DHwM1weh3AzBA3hnqmS8HQHtjidaoofhOx7uFPmX199URi3wLC8uzdI3H0kb9P
AcrN3XQ5vY8JiVGj0FRicOjRk0EQGmmoWcsjaQ6awQKBgQDpAT/Z5K7cte7EbxmK
5cF+RZd0h3Vik3s2krLl+bTrcCopA68np9Kq4xgjpzcvLjvZu9XI13gg/HFhH9Yb
g71B1AUC7Tm2O0bFDRiFNCGStKeab/FL2/NKcqZumaHAkyA1UWZ3HCgX3w2DjQEF
XCFwlOMNdvGmQODWLbsqwoWfIQKBgQDX+m6t5oPieTWeWWWIqAROC/khZO7ljFog
2LmIXJaqtx+VOM5MDC75txusHIO9woxZuk5Jge+G9wGe2KeHShAuX5C3dUhShhQr
Ly2jQQHWwXM3QVW1BQDeE+CLE/ODcgloIWeuR+GrEWcAuYV+kR1AnEwDJz8MIc/F
NYmK9yGJ4wKBgFJIxqvEPpxjA3cLZRHQIYzeNqZIUAQH4TNciyD8FhAvBDSHwItY
kOUYXaX5n1tiEHDMDKtorFu5yrBp9cqxs1xT65ElBYR9WnisL0SbLGAKvEWl0qjf
fAOGiY/1YVIIow8xN+ZIY0BK3RLf8MRbzNNdQPG4V45Gyx/X9okbOOUBAoGAeF89
PHLTYm/HsH+GlUl/TLhjm3cTpqA4w0HG9fcUigUR9yr3326S595j7+LckfBSJNgv
NczTYNdd8dgyVraymgXtNDKLomLT7tWWi/x5N+YNfuhNClzFhQBzD1CJUeNG1uB3
Vqz9W0iRrde4TTg3o4D45HEFNI/LqtAR3n+qE50CgYAwsgY9K3ybOTV6WRgsK0oP
ExMPnBYLRdMeuq0NA5W2IqpV/OuoN6qTXsWQnlGgSii9iZZ79P1vTlbPbY7BwQ+r
0ZwfImysW3TB2ocMDKOW6wyyX7w8+HIHX5IOtAQzJFD2Kwh3kZWXW/fglwbNEd8k
mj+WO276kxFtT5oMJeBrAg==
-----END PRIVATE KEY-----
```

---

## Step 2: Create a New Google Workspace

1. Go to [Google Workspace signup](https://workspace.google.com/business/signup/welcome).
2. Use a **new domain** or a **subdomain** of your primary domain.
   - **Recommended:** `sso.levinnovation.com` (subdomain of your existing domain)
   - This keeps DNS under your control and avoids buying a new domain.
3. Create the first user: `sofer-bot@sso.levinnovation.com`
4. Choose the cheapest paid plan (Business Starter is fine).
5. **Critical:** Sign in to `sofer-bot@sso.levinnovation.com` and accept Google's terms before proceeding.

---

## Step 3: Enable SSO in Google Workspace

1. Open [Google Admin Console](https://admin.google.com) for the **new** Workspace.
2. Go to **Menu → Security → Authentication → SSO with third party IdP**.
3. Click **Add SAML profile** under "Third-party SSO profiles".
4. Scroll to the bottom and click **Go to legacy SSO profile settings**.
5. Check **Enable SSO with third-party identity provider**.
6. Fill in:
   - **Sign-in page URL:** `https://us-east-1.recall.ai/api/v1/bot/gmeet-sign-in`
   - **Sign-out page URL:** `https://us-east-1.recall.ai/api/v1/bot/gmeet-sign-out`
   - **Verification certificate:** Upload the `cert.pem` content from Step 1.
   - Check **Use a domain-specific issuer**.
7. Click **Save**.
8. Return to **SSO with third-party IDPs** page.
9. Under **Manage SSO profile assignments**, click **Manage**.
10. Select your Legacy SSO Profile from the dropdown and **Save**.

---

## Step 4: Create Recall.ai Google Login Group

### In Recall.ai Dashboard (Recommended)

1. Go to [Recall.ai Explorer — Google Login Groups (US East)](https://us-east-1.recall.ai/explorer/google-login-groups).
2. Click **Create Group**.
3. Set:
   - **Name:** `LEV Innovation Sofer Bots`
   - **Login mode:** `always` (for testing; switch to `required` in production if you only want sign-in when meetings enforce it)
4. Save and copy the **Group ID** (looks like `glg_xxxxxxxx`).

### Via API (Alternative)

```bash
curl --request POST \
  --url https://us-east-1.recall.ai/api/v2/google-login-groups/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "accept: application/json" \
  --header "content-type: application/json" \
  --data '{
    "login_mode": "always",
    "name": "LEV Innovation Sofer Bots"
  }'
```

---

## Step 5: Create Google Login in Recall.ai

### In Recall.ai Dashboard (Recommended)

1. Go to [Recall.ai Explorer — Google Logins (US East)](https://us-east-1.recall.ai/explorer/google-logins).
2. Click **Create Login**.
3. Fill in:
   - **Group:** Select the group from Step 4.
   - **Email:** `sofer-bot@sso.levinnovation.com`
   - **SSO v2 Workspace Domain:** `sso.levinnovation.com`
   - **SSO v2 Private Key:** Paste the `key.pem` content from Step 1.
   - **SSO v2 Cert:** Paste the `cert.pem` content from Step 1.
   - **Is Active:** ✅ true
4. Save.

### Via API (Alternative)

Use the [Create Google Login](https://docs.recall.ai/reference/create_google_login_v2_api_v2_google_logins_post) endpoint.

**⚠️ Important:** Use Postman or Insomnia. cURL often corrupts PEM strings. Send as `multipart/form-data`.

---

## Step 6: Verify with a Test Bot

1. Create a Google Meet call in your **main** Workspace (not the SSO one).
2. Invite `sofer-bot@sso.levinnovation.com` to the calendar event.
3. Create a bot via Recall.ai API:

```bash
curl --request POST \
  --url https://us-east-1.recall.ai/api/v1/bot/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "accept: application/json" \
  --header "content-type: application/json" \
  --data '{
    "meeting_url": "https://meet.google.com/xxx-xxxx-xxx",
    "bot_name": "Sofer",
    "google_meet": {
      "google_login_group_id": "YOUR_GROUP_ID_FROM_STEP_4"
    }
  }'
```

4. The bot should appear with the Google account name/avatar (not "Sofer" — signed-in bots use the Google account name).
5. The bot should **bypass the waiting room** because it was invited to the calendar event.

---

## Step 7: Configure Webhook Endpoint

Recall.ai sends webhooks for bot lifecycle events. You need a public HTTPS endpoint.

### n8n Webhook URL

If using the n8n orchestrator workflow in this repo:

```
https://levinnovation.n8n.agentyx.one/webhook/recallai-status
```

### Register Webhook in Recall.ai

```bash
curl --request POST \
  --url https://us-east-1.recall.ai/api/v1/webhooks/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "content-type: application/json" \
  --data '{
    "url": "https://levinnovation.n8n.agentyx.one/webhook/recallai-status",
    "event": "bot.status_change",
    "is_active": true
  }'
```

Also register for transcript events:

```bash
curl --request POST \
  --url https://us-east-1.recall.ai/api/v1/webhooks/ \
  --header "Authorization: ${RECALL_API_KEY}" \
  --header "content-type: application/json" \
  --data '{
    "url": "https://levinnovation.n8n.agentyx.one/webhook/recallai-status",
    "event": "bot.transcript_completed",
    "is_active": true
  }'
```

---

## Step 8: Production Hardening

| Task | Why |
|------|-----|
| Add 3–4 Google logins to the group | Each supports ~30 concurrent bots |
| Create a Google Group for all bot emails | Add the group email to calendar invites instead of individual bots |
| Switch login_mode to `required` | Only sign in when meeting enforces it |
| Set bot account language to `en-US` | Navigate to `https://myaccount.google.com/personal-info` → General preferences → English (United States) |
| Enable webhook signature validation | Use `RECALL_WEBHOOK_SECRET` to HMAC-verify payloads |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "This domain is not configured to use Single Sign On" | Ensure SSO is configured on the **primary domain** or a **subdomain** of the primary domain. `sso.levinnovation.com` is valid if `levinnovation.com` is the primary. |
| `google_meet_login_not_available` fatal event | Add more active logins to the group. |
| Bot stuck in waiting room | Invite the bot email to the Google Calendar event. The bot must be signed in AND on the invite list. |
| Bot name is wrong | Expected for signed-in bots — name comes from the Google account, not the `bot_name` API parameter. |
| Transcript empty | Meeting may have had no audio, or bot was muted by host. Check Recall.ai dashboard for recording status. |

---

## References

- [Recall.ai API Docs](https://docs.recall.ai)
- [Signed-In Google Meet Bots Guide](https://docs.recall.ai/docs/google-meet-signed-in-bots)
- [Recall.ai Explorer (US East)](https://us-east-1.recall.ai/explorer)
