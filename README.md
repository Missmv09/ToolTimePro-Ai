# Task Iguana

Field service management SaaS for contractors (landscaping, plumbing, HVAC, etc.).
Built with **Next.js 14**, **TypeScript**, **React**, and **Supabase**; deployed on **Netlify**.

## Quick Start

```bash
npm install
cp .env.example .env.local   # then fill in your values (see below)
npm run dev                  # http://localhost:3000
```

The app boots with placeholder Supabase values (auth disabled, a console warning is
expected). All public marketing pages, free tools, and self-contained `/demo/*`
previews render without any backend. Authenticated flows (dashboard, worker app,
customer portal) require a real Supabase project — see **Database Setup** below.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values. The key groups are:

| Group | Variables | Required for |
|-------|-----------|--------------|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Auth + all DB-backed flows |
| App | `NEXT_PUBLIC_APP_URL` | OAuth callbacks, email links |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICES` | Billing / checkout |
| AI | `ANTHROPIC_API_KEY` (primary), `OPENAI_API_KEY` (fallback) | Jenny AI, Smart Quote |
| Email | `RESEND_API_KEY` | Transactional email |
| SMS / 2FA | `TWILIO_*` | SMS, two-factor auth |
| Optional | QuickBooks, Google Calendar, Name.com, Crisp | Their respective integrations |

See `.env.example` for the full annotated list. **Never commit `.env*` files** — they
are gitignored; production secrets live in Netlify env vars.

## Database Setup

The database is Supabase (Postgres + RLS). Full instructions:

- **`database/SETUP_INSTRUCTIONS.md`** — create the project, run `schema.sql`, configure
  auth + storage buckets.
- **`database/TEST_ACCOUNT_SETUP.md`** — seed a complete demo company (Green Scene
  Landscaping) with customers, jobs, quotes, invoices, and time entries for testing.
- **`database/migrations/`** — run in order after the base schema.

Use a **separate Supabase project for testing** — never test against production
(see `.env.test.example`).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server on :3000 |
| `npm run build` | Production build — **the primary pre-commit gate** (catches TS errors `test` misses) |
| `npm test` | Jest unit/integration suite (539 tests) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke` | Browser-less smoke test of public pages (`node scripts/smoke-test.js [baseUrl]`) |
| `npm run test:e2e` | Cypress E2E specs (requires the Cypress binary + a running app) |

## Testing & QA

For the QA test plan — what to exercise across the dashboard, worker app, and customer
portal, plus how to run each test layer — see **`docs/QA_TESTING_GUIDE.md`**.

## Project Layout

- `src/app/` — Next.js App Router (dashboard, worker, portal, auth, marketing, API routes)
- `src/lib/` — Supabase client, Stripe pricing, shared logic
- `src/__tests__/` — Jest suites (api, components, contexts, hooks, lib)
- `cypress/e2e/` — Cypress specs
- `database/` — schema, migrations, seed + setup docs
- `tooltimepro/` — static marketing site (separate from the Next.js app)
- `netlify/functions/` — Netlify serverless functions

See `CLAUDE.md` for development guidelines, quality gates, and the product catalog.
