# Prospector Agent Scheduler (Levinnovation)

Thin wrapper workflow that fires the `prospector-agent-core` on a schedule and/or on-demand
from the n8n UI.

- **Workflow ID (live):** `x6UEapkGLMDXxXuv`
- **Status:** active
- **Invokes:** `prospector-agent-core` (`ln5Qw90tQaDQpcuZ`) via Execute Workflow

## Triggers

| Trigger | Behavior |
|---|---|
| **Manual Trigger** | Click "Execute Workflow" in the n8n UI — fires immediately |
| **Schedule Trigger (Hourly)** | Cron `0 * * * *` — fires every hour on the dot, America/Costa_Rica |

## Run config

Reads from environment, with sane defaults if unset:

```
linkedin_query  ← $env.LINKEDIN_SEARCH_QUERY  (default: "operations manager ai automation latam")
leads_per_run   ← $env.LEADS_PER_RUN          (default: 25)
fit_threshold   ← $env.LEAD_FIT_THRESHOLD     (default: 70)
dry_run         ← $env.PROSPECTOR_DRY_RUN === "true"  (default: false)
```

To pause prospector runs without deactivating the workflow, set `PROSPECTOR_DRY_RUN=true`
in the n8n host environment (Gmail send is skipped, all other side effects still happen).
To truly pause, deactivate this workflow in the n8n UI.

## Operational notes

- The core prospector (`ln5Qw90tQaDQpcuZ`) no longer has its own internal cron — this
  scheduler is the single source of triggering for the scheduled path. The core still
  exposes a `Webhook Trigger (POST)` at `/webhook/prospector/run` and an
  `Execute Workflow Trigger` for callers that pass custom inputs.
- 24 runs/day at the top of each hour. Each run hits RapidAPI for fresh leads — verify
  your RapidAPI quota is sized accordingly (24 × `LEADS_PER_RUN` calls/day).
- All executions of this scheduler appear in n8n's execution log filtered by this workflow
  ID, with the downstream prospector execution linked underneath.
