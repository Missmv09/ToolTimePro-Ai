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

## Adding more coverage

The authenticated specs are intentionally a small, reliable starting set. Grow
them by adding `it(...)` blocks mapped to the case IDs in
`docs/QA_TEST_CASES.md` — quote → invoice → pay (Stripe test card
`4242 4242 4242 4242`), worker flows, multi-tenant isolation, etc. Each green
spec is one fewer case the human tester has to repeat every release.
