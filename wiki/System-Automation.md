# System Automation

<!-- AUTO-GENERATED from netlify.toml and netlify/functions/ — do not edit manually -->
<!-- To update: modify cron schedules or functions, then run: node scripts/generate-wiki.js -->

ToolTime Pro runs automated background tasks via Netlify Scheduled Functions and serverless endpoints.

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
| **supabase-keepalive-cron** | `0 6 */3 * *` | Supabase Keep-Alive — runs every 3 days at 6am UTC. Pings Supabase to prevent free-tier project from pausing (7-day inactivity limit) |

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
| **booking-store** | On-demand |  |
| **checkout** | On-demand |  |
| **daily-business-cron** | Scheduled |  |
| **hr-law-update-cron** | Scheduled |  |
| **jenny-actions-cron** | Scheduled |  |
| **stripe-price-management** | On-demand | Stripe Price Management — Admin-only Netlify Function |
| **supabase-keepalive-cron** | Scheduled |  |
| **trial-reminders-cron** | Scheduled |  |
| **workforce-compliance-cron** | Scheduled |  |

---

> **Total:** 6 scheduled jobs, 9 on-demand functions

_Last generated: 2026-04-11_
