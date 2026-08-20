# Pre-Release Manual QA — the short list

**You do not re-check 80+ cases.** CI already runs the P0 matrix against the
sandbox on every push (auth, customers, jobs, quotes, invoices, quote/invoice
math, public quote link, multi-tenant isolation, 12-hour times, negative/security
cases). Trust the green checkmark for all of those.

This is the **~10-minute human pass** for the handful automation can't safely do
— the ones that move real money, send a real email, or fire a real SMS. Run it
against the **sandbox** before a release (Stripe test mode, test Twilio):

> `https://sandbox--lively-yeot-c640cd.netlify.app`

Check the box; if anything fails, capture the URL + what you saw and fix before shipping.

---

## 💳 Money (Stripe test mode)

- [ ] **TC-INV-03 — Pay an invoice.** Open an invoice's public link `/invoice/[id]`,
      pay with card **`4242 4242 4242 4242`** (any future expiry / any CVC).
      → Payment succeeds; invoice flips to **paid**.
- [ ] **TC-INV-04 — Declined payment.** Same flow, card **`4000 0000 0000 0002`**.
      → Decline is handled gracefully; invoice **stays unpaid**; clear error message (no crash).
- [ ] **TC-BILL-01 — Plan checkout.** From pricing/upgrade, pick a plan, pay with **`4242…`**.
      → Subscription activates; the new plan is reflected in the app.

*Why manual: these leave real test-mode transactions/webhooks, and you want to
eyeball an actual charge.*

---

## ✉️ Email / signup (needs a real inbox)

- [ ] **TC-AUTH-01/02 — Signup + email confirmation.** Sign up a new account at
      `/auth/signup` with an inbox you control.
      → Company is created; **confirmation email actually arrives**; clicking the
      link verifies the account and you can log in.

*Why manual: no tool can confirm the email truly landed in a real inbox.*

---

## 👷 Worker app (needs a worker account + fires SMS)

- [ ] **TC-WORK-01/02 — Worker login + today's jobs.** Log in at `/worker/login`
      as a worker. → Lands on worker home; sees **only that worker's** assigned
      jobs, with times in **AM/PM**.
- [ ] **TC-WORK-03 — "On my way".** Open a job → tap **On my way**.
      → Customer is notified (**SMS** sends); status/tracking updates.
- [ ] **TC-WORK-04 — Clock in / out.** Use the timeclock to clock in, then out.
      → A time entry is recorded with the correct duration.

*Why manual: needs a seeded worker login, and TC-WORK-03 sends a real SMS. If you
create a dedicated sandbox worker account, TC-WORK-01/02/04 can be automated
later (same pattern as the E2E and multi-tenant tests) — TC-WORK-03 stays manual.*

---

## That's it

Everything not on this list is guarded automatically on every push. If a release
is urgent and you can only do three, do the **money** ones — that's the highest
risk. When CI is green and this short list passes, you're clear to ship.
