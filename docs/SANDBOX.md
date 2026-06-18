# Sandbox Environment

A safe place to preview and test changes against a real-looking stack before they touch production. Built on Netlify branch deploys with a second Supabase project and Stripe test-mode keys.

## What you get

- A stable URL like `https://sandbox--<your-site>.netlify.app` that rebuilds every time you push to the `sandbox` branch.
- Isolated data: a separate Supabase project so test writes can never corrupt prod rows.
- Test-mode Stripe: checkout flows work end-to-end without real charges.
- Real cron schedules still fire, but against the sandbox Supabase — so scheduled-function regressions surface here first.

## One-time setup

### 1. Create the `sandbox` branch

```bash
git checkout -b sandbox
git push -u origin sandbox
```

### 2. Enable branch deploys in Netlify

Site settings → Build & deploy → Branches and deploy contexts:
- **Production branch:** `main`
- **Branch deploys:** select "Let me add individual branches" → add `sandbox`.

After the first deploy, the URL will be `https://sandbox--<site-name>.netlify.app`.

### 3. Create a second Supabase project

1. In Supabase dashboard → New project → name it `tooltimepro-sandbox`.
2. Run the same migrations as prod:
   ```bash
   supabase db push --project-ref <sandbox-ref>
   ```
   Or copy `database/` + `supabase/migrations/` into the SQL editor.
3. (Optional) Seed with anonymized prod data — **never copy real customer PII**.
4. Grab the project URL and anon key.

### 4. Scope env vars to the `sandbox` branch in Netlify

Site settings → Environment variables. For each variable below, set "Specific scopes" → branch deploys → `sandbox`:

| Variable | Sandbox value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sandbox project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sandbox anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | sandbox service-role key |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | sandbox webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `NEXT_PUBLIC_STRIPE_PRICES` | test-mode price IDs (re-run `scripts/setup-stripe-products.js` in test mode) |
| `RESEND_API_KEY` | a separate Resend key or the same one with a test "from" domain |
| `TWILIO_*` | test credentials or a dedicated sandbox subaccount |

Any var left unscoped falls through to its production value — double-check the list above covers every secret that writes to a shared external system.

### Keep the sandbox Supabase from pausing

Free-tier Supabase projects pause after 7 days of no real database activity. The
`supabase-keepalive-cron` function pings **every configured project in one run**,
so it can keep Prod and Sandbox warm together — but the sandbox only gets pinged
if you tell it where the sandbox project lives.

Add these two vars in Netlify (scope them to **production / all** — the cron runs
in the prod deploy context, *not* the sandbox branch deploy):

| Variable | Value |
|---|---|
| `SUPABASE_SANDBOX_URL` | sandbox project URL |
| `SUPABASE_SANDBOX_KEY` | sandbox anon key |

Without these, the cron keeps Prod alive but the sandbox project will pause after
a week of inactivity. You can confirm both are being pinged in the Netlify
function logs — each run logs one `Pinging production…` and one `Pinging
sandbox…` line.

### 5. Seed Stripe test-mode products

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.js
```

Copy the resulting `NEXT_PUBLIC_STRIPE_PRICES` JSON into the sandbox-scoped env var.

### 6. Point a Stripe webhook at the sandbox URL

Stripe dashboard → Developers → Webhooks (test mode) → add endpoint:
`https://sandbox--<site-name>.netlify.app/api/stripe/webhook`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` (sandbox scope).

## Daily workflow

1. Branch off `sandbox` (or off `main` — your call):
   ```bash
   git checkout sandbox
   git pull
   git checkout -b claude/my-change
   ```
2. Push the feature branch and open a PR into `sandbox`. CI runs lint + typecheck + tests + build.
3. Merge to `sandbox` → Netlify rebuilds the sandbox URL → smoke-test it there.
4. When you're happy, open a second PR from `sandbox` → `main`. Merging that promotes the changes to prod.

## Smoke-testing a deploy (so you don't click through by hand)

Two automated layers run against a **live** URL (sandbox or prod) — they replace
most of the manual click-testing. What they can't cover (real card checkout, SMS
delivery, email receipt, visual/UX judgment) still needs a human.

### 1. HTTP smoke — fast, no browser

Checks the health/env diagnostic plus every critical public page returns OK:

```bash
# against the sandbox
HEALTH_CHECK_TOKEN=<token> npm run smoke -- https://sandbox--<site>.netlify.app
# or via env var
SMOKE_BASE_URL=https://sandbox--<site>.netlify.app HEALTH_CHECK_TOKEN=<token> npm run smoke
```

Exits non-zero if anything fails, so it doubles as a CI gate. Without
`HEALTH_CHECK_TOKEN` it still checks the pages and just skips the DB/env probe.

### 2. Cypress E2E — real browser, demo flows

Runs the public-page, booking-demo, and quote-portal specs (all hit
self-contained demo/public routes — no login or seeded data needed):

```bash
npx cypress run --config baseUrl=https://sandbox--<site>.netlify.app
```

### 3. CI: `.github/workflows/smoke.yml`

Runs both layers on a daily schedule and on manual dispatch. Configure once:

- **Settings → Variables → `SMOKE_BASE_URL`** — e.g. the sandbox URL
- **Settings → Secrets → `HEALTH_CHECK_TOKEN`** — same value as the Netlify env var

Then trigger from the Actions tab ("Smoke (deployed)" → Run workflow), optionally
overriding the URL to point at prod after a release.

## Recommended: require CI to pass before merging to `main`

In GitHub → Settings → Branches → Branch protection rules → add rule for `main`:
- Require a pull request before merging
- Require status checks to pass: tick the `test` job from `.github/workflows/ci.yml`
- Require branches to be up to date before merging

Do the same for `sandbox` if you want sandbox to stay green too.

## Troubleshooting

- **Sandbox build uses prod env vars:** the variable isn't scoped to the `sandbox` branch. Re-check step 4.
- **Cron jobs running twice:** you have the same schedule defined in both `netlify.toml` and a function config export. Keep it in `netlify.toml` only (per `CLAUDE.md`).
- **Stripe webhook 400s:** `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint. Each environment needs its own webhook + secret.
- **Data showing up in prod:** a service-role key is pointing at the prod Supabase. Search the Netlify env var list for any `SUPABASE_*` var that isn't sandbox-scoped.
