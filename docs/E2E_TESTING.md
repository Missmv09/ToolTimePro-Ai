# End-to-End Testing (Cypress)

Automated browser tests that exercise real user flows, so a chunk of the manual
QA matrix runs on every push instead of by hand.

## What runs where

| Suite | File(s) | Needs secrets? | When it runs |
|-------|---------|----------------|--------------|
| **Public / unauthenticated** | `cypress/e2e/public-pages.cy.js`, `public-extended.cy.js`, `booking-demo.cy.js` | No | Every push/PR, against a local build |
| **Authenticated flows** | `cypress/e2e/authenticated-flows.cy.js`, `customer-portal.cy.js` | Yes | When `E2E_*` secrets are set, against the sandbox |

The public suite covers: marketing/tools/demo pages render with no crash, auth
pages render, invalid public links degrade gracefully (TC-NEG-05), and signup
client-validation holds (TC-NEG-01).

The authenticated suite covers (and will grow): login + dashboard (TC-AUTH-03),
create customer (TC-CUST-01), jobs page (TC-JOB-01), and logged-out redirect
(TC-SEC-06).

## Enabling the authenticated suite

The authenticated job **skips automatically** until you add these **repository
secrets** (GitHub → repo **Settings → Secrets and variables → Actions**):

| Secret | Value |
|--------|-------|
| `E2E_BASE_URL` | `https://sandbox--lively-yeot-c640cd.netlify.app` |
| `E2E_EMAIL` | A sandbox beta-tester login email (NOT a real customer) |
| `E2E_PASSWORD` | That account's password |

> Use a **dedicated QA account on the sandbox**, never production credentials.
> The tests create throwaway data (e.g. "QA Test Customer <timestamp>") on the
> sandbox's isolated database.

Once set, the `e2e-authenticated` job runs on every push/PR. You can also run it
on demand from the **Actions** tab → **E2E (Cypress)** → **Run workflow**.

## Running locally

```bash
# Public suite (no secrets) — against a running dev server
npm run dev
npx cypress run --spec "cypress/e2e/public-pages.cy.js,cypress/e2e/public-extended.cy.js"

# Authenticated suite — against the sandbox
CYPRESS_E2E_EMAIL=you@example.com CYPRESS_E2E_PASSWORD=secret \
  npx cypress run --spec cypress/e2e/authenticated-flows.cy.js \
  --config baseUrl=https://sandbox--lively-yeot-c640cd.netlify.app
```

## Why the authenticated job waits before it runs

The authenticated suite runs against the **deployed sandbox**, and a push to
`main` starts two things at once: `backsync-sandbox.yml` pushes `main` →
`sandbox` (which starts a Netlify sandbox build), and this job starts hitting
the sandbox URL. Netlify keeps the previous deploy live until the new one
publishes, then swaps atomically — so "the site returns 200" is not the same as
"the site is done deploying". A swap landing mid-run kills in-flight requests,
and the failure surfaces in `cy.login()`'s `before each` hook as
`expected '/auth/login/' to include '/dashboard'`, which looks like a broken
login but is a deploy race.

So the job now, before running Cypress:

1. **Resolves the commit the sandbox should be serving** — waits for the
   back-sync workflow for this SHA, then reads the `sandbox` branch tip.
2. **Waits for that commit to actually be live** (`scripts/wait-for-deploy.js`),
   polling `/api/health`, which reports the build's `COMMIT_REF`. It requires
   several consecutive fast responses on the same commit, so a mid-flight deploy
   restarts the wait instead of poisoning the run. If the deployment can't
   report its commit (or is too old to have `/api/health`), it falls back to
   waiting for a steady, responsive build.
3. **Warms the login-chain API routes** as well as the pages — after Supabase
   accepts the password the app calls `/api/auth/check-needs-password` and
   `/api/auth/2fa/check-device`, and **the 2FA check fails closed**: if it
   cold-starts past its timeout the app signs the user back out and stays on
   `/auth/login`.

### If the login step fails anyway

`cy.login()` reports what the page was showing when it gave up — the red error
box's text, or "asking for a 2FA code" (the E2E account must have 2FA disabled),
or "no error shown" when a request simply timed out. Read that message first; it
names the cause. If the gate itself fails with "never became ready", the Netlify
deploy for that commit is stuck or failed — check the deploy, not the tests.

## Adding more coverage

The authenticated specs are intentionally a small, reliable starting set. Grow
them by adding `it(...)` blocks mapped to the case IDs in
`docs/QA_TEST_CASES.md` — quote → invoice → pay (Stripe test card
`4242 4242 4242 4242`), worker flows, multi-tenant isolation, etc. Each green
spec is one fewer case the human tester has to repeat every release.
