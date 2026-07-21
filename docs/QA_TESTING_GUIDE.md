# Task Iguana — QA Testing Guide

This is the test plan for QA, covering what to exercise before Beta and how to run
each test layer. For environment and seed-data setup, follow the existing docs first:

1. **`database/SETUP_INSTRUCTIONS.md`** — create the Supabase project, run the schema.
2. **`database/TEST_ACCOUNT_SETUP.md`** — seed the demo company and create test accounts.
3. **`.env.test.example`** — use a **separate** Supabase project for testing.

> Never run QA against the production Supabase project or live Stripe keys. Use Stripe
> test mode and Twilio test credentials.

---

## 1. Environment readiness checklist

Run these from the repo root before testing. All must pass:

| Check | Command | Expected |
|-------|---------|----------|
| Install | `npm install` | Completes (Cypress binary + Prisma engines are optional; if the network blocks them, use `CYPRESS_INSTALL_BINARY=0 npm install --ignore-scripts`) |
| Build | `npm run build` | `✓ Compiled successfully`, exit 0 |
| Unit/integration tests | `npm test` | 539 passing, 37 suites |
| Lint | `npm run lint` | Warnings OK, **no errors** |
| Smoke (public pages) | `npm run dev` then `npm run smoke` | 26/26 checks pass |

As of the last readiness pass: build ✓, **539/539 tests ✓**, lint clean (warnings only),
smoke 26/26 ✓.

---

## 2. Test layers

- **Unit/integration (Jest)** — `src/__tests__/` (api, components, contexts, hooks, lib).
  Fast, no backend needed. `npm test`.
- **Smoke (`scripts/smoke-test.js`)** — hits every critical **public** page over HTTP and
  asserts a non-error status. Browser-less. Covers marketing, free tools, auth entry
  points, and `/demo/*` previews — but **not** authenticated flows. Set
  `HEALTH_CHECK_TOKEN` to also run the DB/env diagnostic.
- **E2E (Cypress)** — `cypress/e2e/` (`booking-demo`, `customer-portal`, `public-pages`).
  Requires the Cypress binary and a running app: `npm run dev` then `npm run test:e2e`.
- **Manual** — everything in §3 below. The authenticated dashboard, worker, and portal
  flows are **not** covered by any automated layer and need a human with seeded accounts.

---

## 3. Manual test matrix (authenticated flows)

These require a seeded test company and accounts (see `database/TEST_ACCOUNT_SETUP.md`).
Test each role separately: **owner**, **admin**, **worker**.

### Auth (`/auth/*`)
- Sign up → company auto-created → email confirmation → login.
- Forgot password → reset link → set new password → login.
- Session persistence (refresh, reopen tab), logout, 2FA if enabled.
- Role gating: a worker cannot reach owner-only settings/billing pages.

### Admin Dashboard (`/dashboard/*`)
Core operational surfaces to exercise (create / edit / delete where applicable):
- **Customers & Leads** — `customers`, `clients`, `leads`, `import-customers`
- **Scheduling & Jobs** — `jobs`, `schedule`, `dispatch`, `recurring-jobs`, `route-optimizer`
- **Quotes → Invoices → Payment** — `quotes`, `smart-quote`, `estimator`, `invoices`,
  `payment-plans` (verify quote→invoice conversion and Stripe test-mode checkout)
- **Team & Time** — `team`, `workforce`, `time-logs`, `hr-toolkit`
- **Jenny AI** — `jenny-lite`, `jenny-pro`, `jenny-exec`, `jenny-actions`
- **Add-ons** — `website-builder`, `compliance`/`shield`, `reviews`, `reports`,
  `route-roi`, `services`, `settings`

### Worker App (`/worker/*`)
- Login, today's assigned jobs, job detail, **"On my way"** button + live tracking.
- Clock in/out (`timeclock`, `time`), breaks, `safety`/incident report, `profile`.
- Offline behavior (`/worker/offline`), photo upload on a job.

### Customer Portal & public links (no login)
- **Portal** (`/portal/*`) — login, appointments, invoices, messages, photos, documents,
  history, tracker, preferences.
- **Public quote** — `/quote/[id]` (approve/decline flow).
- **Public invoice** — `/invoice/[id]` (view + Stripe test-mode payment).
- **Online booking** — `/book/[companyId]` (real booking) and `/demo/booking` (no backend).
- **Job tracker** — `/track/[token]`.

### Billing (Stripe test mode)
- Plan checkout for each plan (Starter/Pro/Elite/Booking Only/Invoicing Only).
- Add-on purchase (Website Builder, Compliance Autopilot, QuickBooks Sync, Customer
  Portal Pro, Extra Worker, etc.).
- Use Stripe test card `4242 4242 4242 4242`. Confirm webhook updates subscription state.

---

## 4. Cross-cutting checks

- **Responsive / mobile** — the worker app is mobile-first; test on a phone viewport.
- **Multi-tenant isolation (RLS)** — seed a second company; confirm one company never
  sees another's customers, jobs, or invoices.
- **i18n** — locale middleware may 307-redirect; verify language switching if in scope.
- **Email/SMS** — confirm Resend emails and Twilio SMS fire (test creds) for booking
  confirmations, review requests, and invoice reminders.
- **Error states** — invalid IDs on public links, expired sessions, network failures.

---

## 5. Known limitations for the tester

- `npm run test:e2e` needs the Cypress binary; in networks that block `download.cypress.io`
  it must be installed where the binary is reachable, or run E2E in CI.
- Worker invite-by-app is not implemented — add test workers via Supabase Auth
  (see `database/TEST_ACCOUNT_SETUP.md` → "Adding Test Workers").
- The `npm run smoke` health check is skipped unless `HEALTH_CHECK_TOKEN` is set.

---

## 6. Reporting bugs

For each issue, capture: role + account, exact URL/route, steps to reproduce, expected
vs. actual, screenshot/console output, and environment (local vs. sandbox). File against
the repo and tag the affected area (auth, dashboard, worker, portal, billing, jenny).
