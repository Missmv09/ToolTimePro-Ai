# ToolTime Pro — QA Test Cases

Executable test cases for the pre-Beta QA pass. Work through them in priority
order, record **Pass / Fail / Blocked** for each, and file a bug (template at the
bottom) for anything that fails.

- **Environment:** Sandbox only → `https://sandbox--lively-yeot-c640cd.netlify.app`
- **Setup & what-to-test overview:** see `docs/QA_TESTING_GUIDE.md`
- **Account setup / seed data:** see `database/TEST_ACCOUNT_SETUP.md`

### Priority key
- **P0** — Critical. Core flows; a failure blocks Beta. Test these first.
- **P1** — Important. Major features; should work before Beta.
- **P2** — Secondary. Polish, edge cases, nice-to-haves.

### Stripe test cards (sandbox is in Stripe test mode)
- ✅ Success: `4242 4242 4242 4242` — any future expiry, any CVC, any ZIP
- 🛑 Decline: `4000 0000 0000 0002`
- 🔐 3D Secure: `4000 0025 0000 3155`

### How to record results
For each case, note: **Result** (Pass/Fail/Blocked), **Date**, **Notes/Bug #**.
Copy the tables into a spreadsheet if you prefer to track there.

---

## Industry coverage — do NOT run everything per industry

The **core flows are industry-agnostic** — auth, customers, jobs, scheduling,
quotes, invoices, payments, worker app, and customer portal behave the same for
landscaping, plumbing, HVAC, etc. Run the **full suite once** on a single primary
industry (use **landscaping** — it matches the seed data).

Only these features change by industry/trade. Do a **focused second pass** on just
these across **2–3 representative trades** (e.g. landscaping, plumbing, HVAC):

| Feature | What changes by industry | Cases to repeat |
|---------|--------------------------|-----------------|
| Onboarding / signup | Industry picker, defaults | TC-AUTH-01 |
| Material Estimator | Trade-specific materials, tiers, pricing | TC-QUOTE-07 |
| Smart Quote | Industry-aware suggestions | TC-QUOTE-06 |
| Website Builder | Industry templates, copy | TC-ADDON-01 |
| Jenny AI | Industry-aware answers | TC-JENNY-01/02 |
| Compliance / Shield | State + trade rules | TC-ADDON-02 |

That's ~6 cases × 3 trades ≈ 18 extra runs, instead of 70 × N. If a specific trade
is your launch focus, prioritize that one for the focused pass.

---

## A. Authentication & Access  (TC-AUTH)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-AUTH-01 | P0 | New company signup | Go to `/auth/signup`, enter name, company, email, password; submit | Account + company created; confirmation email sent; lands on dashboard or "confirm email" screen |
| TC-AUTH-02 | P0 | Email confirmation | Click the link in the confirmation email | Email verified; can log in |
| TC-AUTH-03 | P0 | Login | Go to `/auth/login`, enter valid credentials | Redirected to dashboard |
| TC-AUTH-04 | P0 | Login with wrong password | Enter valid email, wrong password | Clear error message; not logged in |
| TC-AUTH-05 | P1 | Forgot password | `/auth/forgot-password` → enter email → open reset link → set new password | Can log in with new password |
| TC-AUTH-06 | P1 | Logout | Click logout | Session ends; protected pages redirect to login |
| TC-AUTH-07 | P1 | Session persistence | Log in, refresh page, reopen tab | Still logged in |
| TC-AUTH-08 | P1 | Role gating — worker | Log in as a **worker**; try to open `/dashboard/settings` and billing | Blocked / redirected; cannot see owner-only areas |
| TC-AUTH-09 | P2 | 2FA (if enabled) | Enable 2FA in settings; log out; log back in | Prompted for SMS/2FA code; valid code grants access |
| TC-AUTH-10 | P2 | Protected route while logged out | Open `/dashboard` in a fresh/incognito window | Redirected to login |

---

## B. Customers & Leads  (TC-CUST)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-CUST-01 | P0 | Create customer | Dashboard → Customers → Add; fill name, phone, email, address; save | Customer appears in list; detail page loads |
| TC-CUST-02 | P1 | Edit customer | Open a customer → edit a field → save | Change persists after refresh |
| TC-CUST-03 | P1 | Delete customer | Delete a test customer; confirm | Removed from list; no orphaned errors |
| TC-CUST-04 | P1 | Create lead | Dashboard → Leads → Add lead with source + follow-up date | Lead appears; follow-up date shows |
| TC-CUST-05 | P1 | Convert lead → customer/job | From a lead, convert/quote | Lead becomes customer or job as designed |
| TC-CUST-06 | P2 | Import customers | Dashboard → Import Customers; upload a small CSV | Rows imported; counts (imported/skipped/failed) shown |
| TC-CUST-07 | P2 | Search/filter customers | Use the search box | Results filter correctly |

---

## C. Jobs & Scheduling  (TC-JOB)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-JOB-01 | P0 | Create job | Dashboard → Jobs → New; pick customer, service, date/time, assign worker; save | Job appears on Jobs list and Schedule |
| TC-JOB-02 | P0 | Job times show 12-hour | View a job with a scheduled time | Time shows as AM/PM (e.g. 2:30 PM), not 24-hour |
| TC-JOB-03 | P1 | Edit / reschedule job | Change a job's date/time/worker | Update reflects on Jobs + Schedule |
| TC-JOB-04 | P1 | Job status transitions | Move a job: scheduled → in progress → completed | Status updates; completed jobs handled correctly |
| TC-JOB-05 | P1 | Schedule view | Open Dashboard → Schedule | Jobs render on correct days/times |
| TC-JOB-06 | P1 | Dispatch board | Open Dashboard → Dispatch | Jobs/workers display; assignment works |
| TC-JOB-07 | P2 | Recurring jobs | Create a recurring job (e.g. weekly) | Future instances generate correctly |
| TC-JOB-08 | P2 | Route optimizer | Open Route Optimizer with several jobs | Produces an ordered route without error |

---

## D. Quotes & Estimates  (TC-QUOTE)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-QUOTE-01 | P0 | Create quote | Dashboard → Quotes → New; add customer + line items; save | Quote total calculates; saved with a quote number |
| TC-QUOTE-02 | P0 | Send quote to customer | Send/share the quote; open its public link `/quote/[id]` | Public quote page renders with correct totals |
| TC-QUOTE-03 | P0 | Customer approves quote | On `/quote/[id]`, click Approve | Status changes to approved; business side reflects it |
| TC-QUOTE-04 | P1 | Customer declines quote | On a quote, click Decline | Status changes to declined |
| TC-QUOTE-05 | P1 | Edit sent quote / revision history | Edit a quote after sending | Revision recorded; customer sees updated version |
| TC-QUOTE-06 | P1 | Smart Quote | Dashboard → Smart Quote; generate a quote | Produces a sensible quote without error |
| TC-QUOTE-07 | P1 | Material estimator | Dashboard → Estimator; run the wizard | Material + labor totals compute; can save/attach to quote |
| TC-QUOTE-08 | P2 | Quote → invoice | Convert an approved quote to an invoice | Invoice created with matching line items |

---

## E. Invoices & Payments  (TC-INV)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-INV-01 | P0 | Create invoice | Dashboard → Invoices → New; add items; save | Invoice total + number generated |
| TC-INV-02 | P0 | Send invoice | Send/share; open public link `/invoice/[id]` | Public invoice renders correctly |
| TC-INV-03 | P0 | Pay invoice (test card) | On `/invoice/[id]`, pay with `4242…` | Payment succeeds; invoice marked paid |
| TC-INV-04 | P0 | Declined payment | Pay with `4000 0000 0000 0002` | Decline handled gracefully; invoice stays unpaid; clear message |
| TC-INV-05 | P1 | Payment methods display | Configure saved payment methods (Zelle/Venmo/etc.) in settings; view on invoice | Methods show on the invoice for the customer |
| TC-INV-06 | P1 | Payment plans | Create a payment plan / installments on an invoice | Installments generate; schedule correct |
| TC-INV-07 | P2 | Invoice statuses | Check sent / paid / overdue states | Statuses display and update correctly |

---

## F. Jenny AI  (TC-JENNY)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-JENNY-01 | P1 | Ask Jenny (Lite) | Open Jenny; ask a product/help question | Relevant answer returned; no crash |
| TC-JENNY-02 | P1 | Jenny Pro features | Open Jenny Pro area | Pro features available (beta access unlocks these) |
| TC-JENNY-03 | P1 | Jenny autonomous actions | Open Jenny Actions / Exec; review suggested actions | Actions list loads; enable/disable a config works |
| TC-JENNY-04 | P2 | "Talk to a human" escalation | In Ask Jenny, click escalate | Hands off / opens chat as designed |
| TC-JENNY-05 | P2 | Jenny SMS booking (if testable) | Trigger an SMS booking conversation | Conversation logged; reasonable replies |

---

## G. Worker App (mobile)  (TC-WORK)  — test on a phone or mobile viewport

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-WORK-01 | P0 | Worker login | `/worker/login` as a worker account | Lands on worker home with assigned jobs |
| TC-WORK-02 | P0 | View today's jobs | Worker home | Only this worker's assigned jobs show, correct times (AM/PM) |
| TC-WORK-03 | P0 | "On my way" button | Open a job → tap **On my way** | Customer notified / live tracking starts; status updates |
| TC-WORK-04 | P0 | Clock in / out | Use timeclock to clock in, then out | Time entry recorded with correct duration |
| TC-WORK-05 | P1 | Breaks | Start and end a break during a shift | Break recorded (CA meal/rest compliance) |
| TC-WORK-06 | P1 | Job photos | On a job, upload a photo | Photo uploads and displays |
| TC-WORK-07 | P1 | Update job status | Mark a job in progress / complete from the worker app | Status syncs to the dashboard |
| TC-WORK-08 | P2 | Safety / incident report | Submit an incident from `/worker/safety` | Incident saved; visible to admin |
| TC-WORK-09 | P2 | Offline behavior | Go offline, interact, come back online | Graceful offline page; queued actions sync |

---

## H. Customer Portal  (TC-PORTAL)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-PORTAL-01 | P1 | Portal login (magic link) | `/portal/login` with a customer email | Magic link / token grants access |
| TC-PORTAL-02 | P1 | View appointments | Portal → Appointments | Customer's jobs/appointments listed |
| TC-PORTAL-03 | P1 | View invoices | Portal → Invoices | Invoices listed; can open/pay |
| TC-PORTAL-04 | P1 | Messages | Portal → Messages; send a message | Message thread works both directions |
| TC-PORTAL-05 | P2 | Documents | Portal → Documents | Contracts/warranties/receipts visible |
| TC-PORTAL-06 | P2 | Photos | Portal → Photos | Job photos display |
| TC-PORTAL-07 | P2 | Reschedule request | Request a reschedule from the portal | Request reaches the business; status pending |
| TC-PORTAL-08 | P2 | Live tracker | Open `/track/[token]` while a tech is en route | Tracker page loads / shows status |

---

## I. Team & Workforce  (TC-TEAM)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-TEAM-01 | P1 | Add worker | Add a team member via Supabase/invite per setup doc | Worker can log into the worker app |
| TC-TEAM-02 | P1 | Time logs review | Dashboard → Time Logs | Worker clock-ins/outs and breaks appear |
| TC-TEAM-03 | P2 | Worker classification (W-2 / 1099) | Open Workforce; set a worker's classification | Saves; compliance guardrails behave |
| TC-TEAM-04 | P2 | HR toolkit | Open HR Toolkit | Resources/docs load |

---

## J. Add-ons & Modules  (TC-ADDON)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-ADDON-01 | P1 | Website Builder | Dashboard → Website Builder; run the wizard; publish | Site generates; public `/site/[slug]` renders |
| TC-ADDON-02 | P1 | Compliance / Shield | Open Compliance; review alerts | Compliance items/alerts display |
| TC-ADDON-03 | P2 | Reviews | Dashboard → Reviews; send a review request | Request generates without error |
| TC-ADDON-04 | P2 | Reports | Dashboard → Reports | Charts/metrics render with seeded data |
| TC-ADDON-05 | P2 | QuickBooks sync (sandbox) | Settings → QuickBooks; connect (sandbox QBO) | OAuth completes; sync status shown |

---

## K. Billing & Subscription  (TC-BILL)  — Stripe test mode

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-BILL-01 | P0 | Plan checkout | Pricing/upgrade → pick a plan → pay with `4242…` | Subscription activates; plan reflected in app |
| TC-BILL-02 | P1 | Each plan tier | Repeat for Starter / Pro / Elite / Booking Only / Invoicing Only | Each checkout completes; correct features unlock |
| TC-BILL-03 | P1 | Add-on purchase | Buy an add-on (Website Builder, Portal Pro, QuickBooks Sync, Extra Worker, etc.) | Add-on activates |
| TC-BILL-04 | P1 | Setup service | Purchase Assisted Onboarding / White Glove | Order recorded |
| TC-BILL-05 | P2 | Declined checkout | Use decline card `4000…0002` at checkout | Failure handled; no subscription created |
| TC-BILL-06 | P2 | Webhook sync | After a successful checkout, refresh the app | Subscription/plan state reflects the purchase (webhook applied) |

---

## L. Cross-Cutting  (TC-X)

| ID | Priority | Scenario | Steps | Expected result |
|----|----------|----------|-------|-----------------|
| TC-X-01 | P0 | Multi-tenant isolation | Create a 2nd company; confirm it can't see the 1st's data | No cross-company data leakage (RLS) |
| TC-X-02 | P1 | Mobile responsiveness | Open dashboard + worker app on a phone | Layout usable; nothing broken/cut off |
| TC-X-03 | P1 | Public marketing pages | Visit `/`, `/pricing`, `/jenny`, `/tools/*`, `/compare/*` | All load, no console errors |
| TC-X-04 | P1 | Email & SMS fire | Trigger booking confirmation / invoice / review request | Email (Resend) and SMS (Twilio test) send |
| TC-X-05 | P2 | Error states | Open a bad URL: `/quote/doesnotexist`, expired session | Friendly error, no white-screen crash |
| TC-X-06 | P2 | Browser matrix | Spot-check Chrome, Safari, Firefox, mobile Safari | Consistent behavior |

---

## Bug report template

For each failure, capture:

```
Title:        <short summary>
Test case:    <TC-ID>
Priority:     P0 / P1 / P2
Role/Account: owner / admin / worker / customer — which login
URL/Route:    <exact page>
Steps:        1. … 2. … 3. …
Expected:     <what should happen>
Actual:       <what happened>
Evidence:     <screenshot / console error>
Environment:  Sandbox (sandbox--lively-yeot-c640cd.netlify.app), <browser/device>
```

> Tip: open the browser console (F12) before testing and screenshot any red errors —
> they make bugs far faster to diagnose.
