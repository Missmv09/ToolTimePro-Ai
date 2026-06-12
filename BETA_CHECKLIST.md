# Beta Launch Checklist — ToolTime Pro

Owner-facing runbook to take ToolTime Pro from "code is healthy" to "real beta
testers are using it." Work top to bottom. Boxes you can't tick are your
blockers.

**Strategy:** ship a small, controlled beta on the non-SMS surface now; flip SMS
on once Twilio A2P is approved (see §6). Don't let A2P block everything else.

---

## 1. Code & CI health (automated — already green)

- [x] `npm run build` compiles, zero `MISSING_MESSAGE`
- [x] `npm test` — 430/430 pass
- [x] `npm run lint` — warnings only
- [x] `npm run i18n:check` — all referenced keys resolve in `en`
- [ ] This branch promoted `sandbox → main` so the smoke harness + i18n guard protect `main`
- [ ] Branch protection on `main` requires the CI `test` job to pass (per `docs/SANDBOX.md`)

## 2. Environment variables (Netlify)

Confirm every **required** var is set for the beta context. Source of truth is
`.env.example`. Decide deliberately whether beta runs on the **sandbox** project
(test data, test Stripe) or **production** (live data, live Stripe) — see §3.

Required:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (the beta URL — used for OAuth callbacks, email links)
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PRICES`
- [ ] `ANTHROPIC_API_KEY` (Jenny AI primary), `OPENAI_API_KEY` (fallback)
- [ ] `RESEND_API_KEY` (email — your primary tester comms channel while SMS is off)
- [ ] `CRON_SECRET` (protects scheduled functions)
- [ ] `PLATFORM_ADMIN_EMAILS` (includes your address)
- [ ] `HEALTH_CHECK_TOKEN` (enables `/api/website-builder/health` — set in **all** contexts)

Optional (only if the feature is enabled for beta):
- [ ] Twilio (`TWILIO_*`) — leave SMS features off until A2P approved (§6)
- [ ] `QUICKBOOKS_*`, `GOOGLE_CLIENT_*`, `NEXT_PUBLIC_CRISP_WEBSITE_ID`

## 3. Stripe mode — pick one, on purpose

- [ ] **Decide:** beta on **test mode** (`sk_test_…`, no real charges — safest for
      a friendly beta) or **live mode** (real cards — only if you intend to
      validate real billing)
- [ ] `NEXT_PUBLIC_STRIPE_PRICES` matches the chosen mode (test price IDs ≠ live
      price IDs). Regenerate with `scripts/setup-stripe-products.js` in the right mode if unsure.
- [ ] Stripe webhook endpoint points at the beta URL `/api/stripe/webhook` and
      its signing secret matches `STRIPE_WEBHOOK_SECRET`
- [ ] Product catalog in Stripe matches the current catalog in `CLAUDE.md`
      (Plans, Jenny tiers, add-ons, setup fees)

## 4. Data & infra

- [ ] Supabase migrations applied to the beta project (`database/` + `supabase/migrations/`)
- [ ] If using sandbox: data is isolated and seeded with **anonymized** data only — never real customer PII
- [ ] Cron functions firing against the beta project (trial reminders, daily
      business checks, etc. — see `netlify.toml`). They surface scheduled-function
      regressions before prod.
- [ ] `/api/website-builder/health?token=…` returns `{ ok: true }` on the beta deploy

## 5. Pre-launch verification

Automated (run against the live beta URL):
- [ ] `HEALTH_CHECK_TOKEN=… npm run smoke -- <beta-url>` → all checks pass
- [ ] Cypress demos pass against the URL: `npx cypress run --config baseUrl=<beta-url>`
- [ ] (Optional) Set repo vars `SMOKE_BASE_URL` + secret `HEALTH_CHECK_TOKEN` so
      the daily **Smoke (deployed)** workflow watches the deploy

Manual — the money path (the one thing automation can't cover; ~30 min in sandbox):
- [ ] **Sign up** for a new account
- [ ] Complete **onboarding**
- [ ] **Checkout** a plan (test card `4242 4242 4242 4242`, any future expiry/CVC)
- [ ] Land in the **dashboard** with the right plan active
- [ ] Create a **quote** → convert to **invoice**
- [ ] Confirm the **welcome / trial email** actually arrives (Resend)

## 6. SMS / Twilio A2P (parallel track — not a beta blocker)

- [ ] Confirm Twilio has **re-reviewed** the A2P 10DLC campaign after the consent
      walkthrough shipped (PR #577, public at `/sms#two-factor-authentication`)
- [ ] Until approved: keep SMS reminders/confirmations **off**; rely on email
- [ ] On approval: set `TWILIO_MESSAGING_SERVICE_SID` / `TWILIO_2FA_MESSAGING_SERVICE_SID`
      and smoke-test one real reminder + one 2FA code

## 7. Go / No-Go

Ship beta when **§1–5 are ticked**. SMS (§6) can be outstanding.

- [ ] Beta URL is stable and health-green
- [ ] Money path verified end-to-end in the beta environment
- [ ] Tester guide ready (`docs/BETA_TESTER_GUIDE.md`) and feedback channel live
- [ ] 3–5 friendly testers identified and invited
