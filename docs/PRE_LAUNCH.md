# Pre-Launch — open blockers, config tasks & QA status

**Internal.** This is the running list of what must be true before Task Iguana goes
live, plus the results of the manual QA pass. It is *not* customer-facing — end-user
help lives in `wiki/`. For the routine ~10-minute release pass see
`docs/PRE_RELEASE_CHECKLIST.md`; automated coverage is in `docs/QA_TEST_CASES.md`.

_Last updated from the manual QA run on the sandbox (`sandbox--lively-yeot-c640cd.netlify.app`)._

---

## 🔴 Bugs / blockers found in QA

### 1. Successful online payments don't auto-mark invoices "Paid"
**Impact:** high — the core of "accept online payments." A customer pays by card, the
charge succeeds at Stripe, but the invoice stays **unpaid** ("Mark Paid" button still
shows, never moves to the Paid tab). Owner would have to reconcile every payment by
hand, and payment reminders could go to customers who already paid.

**Cause:** config, not code. The invoice is marked paid only by the
`checkout.session.completed` webhook at `/api/webhook/stripe-connect`, verified with
`STRIPE_CONNECT_WEBHOOK_SECRET`. That webhook is not wired on the sandbox (and must be
set up for production too). The code path is correct.

**Fix (per environment):**
1. Stripe Dashboard → Developers → Webhooks → add an endpoint:
   - **Test:** `https://sandbox--lively-yeot-c640cd.netlify.app/api/webhook/stripe-connect`
   - **Live:** `https://taskiguana.com/api/webhook/stripe-connect`
   - Event: `checkout.session.completed` (covers invoice payments *and* quote deposits).
2. Copy the endpoint's signing secret (`whsec_…`).
3. Set `STRIPE_CONNECT_WEBHOOK_SECRET` in Netlify env for that scope (sandbox branch /
   production) → redeploy.
4. Re-test: pay a fresh invoice with `4242 4242 4242 4242` → it should auto-flip to Paid.
   If not, the endpoint's recent deliveries show why (`Invalid signature` = secret
   mismatch; `Missing signature or secret` = env var not set).

### 2. Quote approval gate not enforced before send
**Impact:** medium — an employee/admin can send a quote (with pricing) to a customer
without owner review. The intended control ("employee/admin quotes need owner approval
before they go out") is **not enforced** in the send path — `/api/quote/send` has no
role check, and no `pending_approval` routing was found in the quote builder. The
`pending_approval` status exists but isn't wired to the send flow.

**Still to verify:** send a quote **as a worker/admin account** and confirm whether it's
held for approval (owner-sent quotes are correctly allowed to go directly). QA so far was
done as the owner, which can't reveal the gap.

**If confirmed missing (feature work):** non-owner send → `pending_approval` → owner
approves → then send; gate the send API by role, not just the UI.

---

## 🚦 Config / dashboard tasks before launch (no code)

- [ ] **Stripe payment webhook — LIVE** (blocker #1 for production). Set up the live
      endpoint + `STRIPE_CONNECT_WEBHOOK_SECRET` on the production env.
- [ ] **Stripe Connect branding — LIVE mode.** Rename `ToolTimePro` → `Task Iguana` in
      Stripe Dashboard → Settings → Connect → Onboarding interface → Branding (branding
      is a live-mode setting; it can't be edited from the sandbox). Also update
      Settings → Business → Public details.
- [ ] **Email domain warm-up.** Invoice + signup emails currently land in spam/junk
      (young `taskiguana.com` domain). Warm the domain / confirm SPF·DKIM·DMARC so mail
      reaches the inbox before launch.

---

## ✅ Manual QA pass — results (sandbox)

| Check | Result |
|---|---|
| TC-AUTH-09 — 2FA SMS on untrusted-device login | ✅ Pass (fires on a fresh login, not at setup) |
| TC-INV-02 — Send invoice (email + SMS w/ pay link) | ✅ Pass (email delivered, in junk — see warm-up) |
| TC-INV-03 — Pay invoice with card | ✅ Pass at Stripe; **but** invoice doesn't auto-mark Paid → bug #1 |
| TC-INV-04 — Declined card | ✅ Pass (declined, invoice stayed unpaid) |
| TC-QUOTE-03 — Customer approves quote | ✅ Pass (moved to Accepted, owner notified) |
| TC-BILL-01 — Plan checkout | ⏳ Not yet run |
| TC-WORK-03 — Worker "On my way" SMS | ⏳ Not yet run |

**Prerequisite discovered:** the invoice **Pay Now** button only appears once the company
has **onboarded Stripe Connect** (`stripe_connect_onboarded = true`, Settings →
Integrations → Stripe Payments → Connect). Without it (and with no alternative methods
like Zelle/Venmo configured) the public invoice page shows no way to pay.

---

## 🗺️ Roadmap / feature follow-ups (not launch blockers)

These are being handled as feature work, not in the QA pass:

- **Post-payment flow** — receipt on payment, auto review request (delayed), rebook /
  "next steps" CTA. See `docs/AFTER_PAYMENT.md`.
- **Automatic quote follow-up** — sent quotes should schedule their own follow-up instead
  of the owner setting a date by hand (model on the existing Jenny *lead* follow-up).
- **Quote reminder cadence** — automated "following up on your quote" email/SMS nudges for
  outstanding quotes (leads and overdue invoices already have this; quotes don't).
- **Card-on-file → auto-charge** for recurring services (lawn/pool/pest, plans) — the
  biggest accounts-receivable lever for a solo operator.
