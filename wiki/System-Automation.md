# System Automation

<!-- AUTO-GENERATED from netlify.toml and netlify/functions/ — do not edit manually -->
<!-- To update: modify cron schedules or functions, then run: node scripts/generate-wiki.js -->

Task Iguana runs automated background tasks via Netlify Scheduled Functions and serverless endpoints.

---

## Scheduled Jobs (Cron)

These run automatically on a schedule defined in `netlify.toml`:

| Job | Schedule | Description |
|-----|----------|-------------|
| **jenny-actions-cron** | `*/15 * * * *` | Jenny Autonomous Actions — runs every 15 minutes. Checks for: unassigned jobs, cold leads to follow up, overdue invoices, completed jobs needing cost analysis |
| **hr-law-update-cron** | `0 8 * * 1` | HR Law Update Check — runs every Monday at 8am UTC. Checks state employment law freshness (wages, classification, breaks) Alerts when compliance rules are older than 6 months |
| **workforce-compliance-cron** | `0 7 * * 1` | Workforce Compliance — runs every Monday at 7am UTC. Checks: cert expirations, insurance expiry, missing W-9s, classification review cycles, contract end dates |
| **daily-business-cron** | `0 7 * * *` | Daily Business Checks — runs every day at 7am UTC. Checks: quote expirations, contractor payment approvals, compliance alert escalation, review requests |
| **trial-reminders-cron** | `0 9 * * *` | Trial Reminders — runs once per day at 9am UTC. Sends trial welcome, reminder, and expiration emails |
| **supabase-keepalive-cron** | `0 6 */3 * *` | Supabase Keep-Alive — runs every 3 days at 6am UTC. Pings every configured Supabase project (Prod + Sandbox) in one run with a real SQL query to prevent free-tier projects from pausing (7-day inactivity limit). Sandbox needs SUPABASE_SANDBOX_URL / SUPABASE_SANDBOX_KEY; if they are missing the run fails with a 502 naming them rather than skipping sandbox silently. Set SUPABASE_SANDBOX_KEEPALIVE=off to opt out on purpose |
| **calendar-sync-cron** | `*/30 * * * *` | Google Calendar Sync — runs every 30 minutes. Pushes each connected user's upcoming (next 30 days) jobs to their Google Calendar so the sync is automatic without clicking "Sync Now". |
| **growth-metrics-cron** | `0 5 * * *` | Growth Funnel Snapshot — runs daily at 5am UTC. Records one row per day in growth_metrics_daily: leads captured by source, signups, trials, paid accounts, and the derived conversion rates. This is the time series the growth agent planner reads. Runs before the other daily crons so the snapshot reflects a settled previous day. |
| **growth-agent-plan-cron** | `0 6 * * 1` | Growth Agent Planner — runs Mondays at 6am UTC. Fires growth-agent-plan-background, which reads the funnel time series, past experiment outcomes, and the content inventory, then proposes a ranked week of work into growth_tasks with status 'proposed'. It only proposes — nothing reaches the public until a human approves it in /admin/growth.  The work lives in a *background* function because scheduled functions cap at 30s and synchronous ones at 10s, while an Opus planning call runs longer than both. Background functions get 15 minutes. |
| **growth-agent-generate-cron** | `0 7 * * 1-5` | Growth Agent Generator — runs weekdays at 7am UTC. Fires growth-agent-generate-background, which turns *approved* tasks into draft assets. Approved only: generating for an unreviewed proposal spends tokens on work that may be rejected, and puts a finished-looking draft in front of the reviewer that biases the decision.  Background function for the same timeout reason as the planner — it makes up to three sequential AI calls. |
| **jenny-digest-cron** | `0 15 * * 1` | Jenny Weekly Digest — runs Mondays at 15:00 UTC. Emails each company a receipt of the autonomous work Jenny did last week, covering the seven complete days before the run. Jenny's actions are invisible by nature; this is the only place they become legible. |
| **appointment-reminders-cron** | `0 16 * * *` | Appointment Reminders + Post-Job Follow-ups — runs once daily (16:00 UTC). Texts customers a reminder the day before a job, and a thank-you + review request after a job is completed. Runs once a day so a customer gets at most one reminder (the day before), even independent of the per-job "sent" flag. |
| **review-requests-cron** | `*/15 * * * *` | Review Request Dispatcher — runs every 15 minutes. Sends the review requests queued by the after-payment pipeline (paid invoice) and by job completion, each due companies.review_delay_hours (default 2h) after the event. Also queues newly completed jobs. The daily appointment-reminders follow-up remains as a backstop. |

### Schedule Reference

| Pattern | Meaning |
|---------|---------|
| `*/15 * * * *` | Every 15 minutes |
| `0 7 * * *` | Daily at 7:00 AM UTC |
| `0 9 * * *` | Daily at 9:00 AM UTC |
| `0 7 * * 1` | Every Monday at 7:00 AM UTC |
| `0 8 * * 1` | Every Monday at 8:00 AM UTC |
| `0 6 */3 * *` | Every 3 days at 6:00 AM UTC |

---

## Serverless Functions

All functions live in `netlify/functions/` and are deployed automatically:

| Function | Type | Description |
|----------|------|-------------|
| **ai-chatbot** | On-demand |  |
| **ai-compliance** | On-demand |  |
| **ai-helper** | On-demand |  |
| **ai-photo-analysis** | On-demand |  |
| **ai-quote** | On-demand |  |
| **ai-review** | On-demand |  |
| **appointment-reminders-cron** | Scheduled |  |
| **booking-store** | On-demand |  |
| **calendar-sync-cron** | Scheduled |  |
| **checkout** | On-demand |  |
| **daily-business-cron** | Scheduled |  |
| **growth-agent-generate-background** | On-demand | Record why a task could not be generated. |
| **growth-agent-generate-cron** | Scheduled |  |
| **growth-agent-plan-background** | On-demand |  |
| **growth-agent-plan-cron** | Scheduled |  |
| **growth-metrics-cron** | Scheduled |  |
| **hr-law-update-cron** | Scheduled |  |
| **jenny-actions-cron** | Scheduled |  |
| **jenny-digest-cron** | Scheduled |  |
| **review-requests-cron** | Scheduled |  |
| **stripe-price-management** | On-demand | Stripe Price Management — Admin-only Netlify Function |
| **supabase-keepalive-cron** | Scheduled |  |
| **trial-reminders-cron** | Scheduled |  |
| **workforce-compliance-cron** | Scheduled |  |

---

> **Total:** 13 scheduled jobs, 11 on-demand functions

_Last generated: 2026-09-05_
