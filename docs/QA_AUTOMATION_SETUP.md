# QA Automation Setup — for a one-person team

You don't have time to manually QA every release. You don't have to. This repo
already has the automation *built* — most of it is just switched off because a
few secrets/variables aren't set. This doc turns it all on, so your **pipeline
does the QA and you get pinged only when something's actually wrong.**

Everything here is a one-time setup. After this, the workflow is: push → CI runs
→ green checkmark → ship. Sentry emails you if a real user hits an error.

> Related docs: [`QA_TESTING_GUIDE.md`](./QA_TESTING_GUIDE.md) (the full manual
> test plan) and [`E2E_TESTING.md`](./E2E_TESTING.md) (Cypress details).

---

## TL;DR — do these three things

1. **Wire up Sentry** (production error monitoring) — §1
2. **Turn on the dormant CI nets** by setting 6 secrets/variables — §2
3. **Trust the green checkmark** and stop hand-testing every change — §3

---

## 1. Sentry — know when real users hit errors

Sentry is the one thing tests can't replace: it catches the crashes real
contractors hit in the field that you'd never reproduce. The code is already
wired in (`sentry.*.config.ts`, `src/instrumentation.ts`, `next.config.js`). It
is **completely disabled until you set a DSN** — so nothing happens until you do
this:

### Steps
1. Create a free account at <https://sentry.io> → create a project → pick
   **Next.js**.
2. Copy the **DSN** it gives you (looks like `https://abc123@o0.ingest.sentry.io/123`).
3. In **Netlify → Site settings → Environment variables**, add:

   | Variable | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SENTRY_DSN` | your DSN | The only required one. Public by design. |

4. Redeploy. Done — errors now flow to your Sentry dashboard.

### Optional but nice
| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Label events `production` / `sandbox` so you can filter. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Performance monitoring, `0`–`1` (default `0.1`). |
| `NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE` | Set to `1` to record a **session replay** of what the user did right before an error. Extremely useful solo. |

### Optional — readable stack traces (source maps)
Build-time only. Without these you still get errors, just with minified line
numbers. Add these as **build** env vars in Netlify (get them from Sentry →
Settings):

| Variable | Notes |
|---|---|
| `SENTRY_ORG` | your Sentry org slug |
| `SENTRY_PROJECT` | your Sentry project slug |
| `SENTRY_AUTH_TOKEN` | an auth token with `project:releases` scope — **secret** |

Verify Sentry is live: temporarily throw an error in a page, load it, and
confirm the event appears in the Sentry dashboard.

---

## 2. Turn on the dormant CI safety nets

These GitHub Actions workflows already exist but **skip themselves** when their
config is missing. Set the values below in the GitHub repo and they start
running automatically.

Go to **GitHub → repo → Settings → Secrets and variables → Actions**.

### a) Authenticated E2E (`.github/workflows/e2e.yml`)
Right now nothing auto-tests **logged-in** flows (jobs, invoices, portal). This
turns on Cypress against your sandbox with a real login.

Add as **Secrets**:
| Secret | Value |
|---|---|
| `E2E_EMAIL` | a test account email on your sandbox |
| `E2E_PASSWORD` | that account's password |
| `E2E_BASE_URL` | your sandbox URL, e.g. `https://sandbox--yoursite.netlify.app` |

> Use a dedicated seeded test account on a **non-production** Supabase project.
> See `database/TEST_ACCOUNT_SETUP.md`.

### b) Daily smoke test (`.github/workflows/smoke.yml`)
Pings your live public pages every day and via manual "Run workflow".

Add as a **Variable**:
| Variable | Value |
|---|---|
| `SMOKE_BASE_URL` | the deploy to smoke-test, e.g. `https://sandbox--yoursite.netlify.app` |

Add as a **Secret** (optional — enables the DB/env health check):
| Secret | Value |
|---|---|
| `HEALTH_CHECK_TOKEN` | same value as the `HEALTH_CHECK_TOKEN` Netlify env var |

### c) Stripe price audit (`.github/workflows/ci.yml`)
Verifies your Stripe prices/products are in sync on every push — your money
flows are the highest-risk thing to get wrong.

Add as a **Secret**:
| Secret | Value |
|---|---|
| `STRIPE_TEST_SECRET_KEY` | your Stripe **test-mode** secret key (`sk_test_...`) |

### What's already on (no action needed)
- **`ci.yml`** — lint + 562 tests + build on every push/PR. Your core gate.
- **`e2e-public`** — Cypress public/booking flows on every push.

---

## 3. The solo-founder QA workflow

Once §1 and §2 are done, this is your whole process:

1. **Develop on a branch, open a PR.** CI runs lint + tests + build + E2E
   automatically. Don't merge on red.
2. **Use the Netlify deploy preview** on the PR to click through anything
   visual before merging — that's your "manual QA," only for changed areas.
3. **Merge when green.** Trust the checkmark. You already wrote the tests; let
   them do their job.
4. **Sentry watches production.** If a real user hits an error, you get an
   email with the stack trace (and a session replay if you enabled it) — you
   find out before they email you.
5. **Daily smoke + weekly manual pass.** Skim the daily smoke result. Once a
   week (or before a big release), walk the critical money paths by hand using
   [`QA_TESTING_GUIDE.md`](./QA_TESTING_GUIDE.md) §3 — checkout, quote→invoice,
   booking. That's the 20% of manual testing that's actually worth your time.

### Where to add coverage next (so you hand-test even less)
- Add Cypress specs for the **money flows** (checkout, quote→invoice→pay) to
  `cypress/e2e/authenticated-flows.cy.js` — the highest-value place to automate.
- Turn on Sentry **session replay** (§1) so bug reports come with a video.

**The mindset:** you don't do QA — your pipeline does. You already paid to build
it; this doc just plugs it all in.
