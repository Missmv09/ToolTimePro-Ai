# Price Book — Feature Scope

_Internal planning doc. **Phase 1 is BUILT** (Nov 2026). Decisions taken: categories = free
text; lives at its own nav item `/dashboard/price-book`; seeding = manual "Load starter list"
button; `taxable` stored but deferred from the UI; on-site worker quoting stays Phase 3._

## ⚠️ To activate: run the migration
Phase 1 needs **`database/migrations/056_price_book.sql`** applied in the Supabase SQL editor
(sandbox first, then production) before the price book saves anything — it creates the
`price_book_items` table + RLS. The UI is deployed but will error on save until the table exists.

## Phase 1 — shipped
- `056_price_book.sql` — `price_book_items` table, company-scoped RLS, indexes.
- `src/lib/price-book.ts` — types, units, starter list, `priceBookItemToLine` (unit-tested).
- `src/hooks/usePriceBook.ts` — list / create / update / archive / load-starter.
- `src/app/dashboard/price-book/page.tsx` — management UI (grouped list, add/edit modal,
  empty-state "Load starter list"), gated to owner/admin with the `quotes` permission.
- Nav item "Price Book" (Tags icon) in `DashboardLayout`, beside Quotes.
- Picker ("+ Add from price book…") wired into **both** quote builders: the smart-quote
  builder and the dashboard `QuoteModal`.

---

## Why
Today the only "quick add" in the smart-quote builder is a **hardcoded** list of 8 generic
landscaping services (`QUICK_ADD_SERVICES` in `src/app/dashboard/smart-quote/page.tsx` —
lawnCare $45, treeTrim $120, …). Every business re-types its own services and prices on
every quote, and a plumber or painter gets landscaping defaults.

A **price book** makes that list each company's own: a stored, reusable catalog of services
with set prices, surfaced wherever quotes are built. This is the field-service industry's
real control mechanism — competitors (Jobber, Housecall Pro, ServiceTitan) let techs quote
on-site **fast**, and keep pricing consistent through a **structured price book**, not an
approval queue. It's the prerequisite for ever letting a worker quote on-site "within the
rails" without waiting for owner sign-off.

## Non-goals (Phase 1)
Good/Better/Best tier bundles, dynamic/seasonal/region pricing, member pricing, cost &
margin tracking, materials-vs-labor split, on-site quoting inside the `/worker` field app.
All deferred to later phases.

---

## Data model — new table `price_book_items`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `company_id` | uuid fk → companies | tenant key; every query filters on it |
| `name` | text, not null | the service/line label |
| `default_price` | numeric, not null | per-unit price |
| `unit` | text | reuse `LINE_ITEM_UNITS`: each / hour / sqft / linear_ft / cubic_yard |
| `category` | text, nullable | grouping, e.g. "Lawn", "Repairs" — **[DECIDE]** free text vs managed list |
| `taxable` | bool, default true | **[DECIDE]** Phase 1 or later |
| `active` | bool, default true | soft archive (never hard-delete; quotes reference history) |
| `sort_order` | int, default 0 | manual ordering within a category |
| `created_at` / `updated_at` | timestamptz | |

- **Indexes:** `(company_id, active)`, `(company_id, category)`.
- **RLS:** company members **read**; create/update/delete gated to owner/admin with the
  `quotes` permission (reuse the role model in `src/lib/permissions.ts`). Workers read-only
  (so they can quote within approved prices, never edit them).
- **Migration:** `database/migrations/0XX_price_book.sql` — table + RLS policies + grants,
  following existing migration conventions.

## API / data access
Mirror the existing `useQuotes` pattern: a client-side `usePriceBook()` hook doing
company-scoped Supabase reads, with writes allowed by RLS. (No new service-role route
needed unless we hit the same `quote_items` RLS friction — if so, add `/api/price-book`
`.ts` routes with the same auth+role check as `/api/quote/save`.)
- Always check the `{ error }` on every insert/update (CLAUDE.md rule — supabase-js doesn't throw).

## UI
1. **Manage the price book** — **[DECIDE]** its own nav item `/dashboard/price-book`
   (recommended — it's a daily tool) vs a tab under `/dashboard/settings`. CRUD list grouped
   by category: name, price, unit, active toggle; add/edit modal; drag or number to reorder.
2. **"Load starter list" button** — one click seeds a company's book from a small set of
   defaults for their trade, so they don't start empty. **[DECIDE]** auto-seed on signup vs
   manual button (recommended: manual button — avoids clutter for non-landscapers).
3. **Quote builder integration** — in `smart-quote` replace the hardcoded
   `QUICK_ADD_SERVICES` with a searchable **"Add from price book"** picker that inserts a
   `LineItem` (name → description, unit, price). Keep ad-hoc custom line items too — the
   price book is additive (pick **or** type).
4. **QuoteForm** (`src/components/forms/QuoteForm.tsx`, the dashboard new-quote modal) — same
   picker.

## Permissions
Manage = owner/admin with `quotes` permission. Read = everyone in the company. Reuse
`resolvePermissions` so this stays consistent with the quote-approval gate we just shipped.

## Phasing
- **Phase 1 (MVP):** table + RLS + migration · `usePriceBook` hook · management UI · picker
  in smart-quote + QuoteForm · starter-list seed · tests. Delivers the core "approved
  pricing" value.
- **Phase 2:** category management UI · Good/Better/Best package bundles · `taxable` per item ·
  cost/markup fields for margin.
- **Phase 3:** dynamic pricing (region/season/business-unit) · member pricing · on-site
  quoting inside the `/worker` field app (pairs with the approval gate's "designated
  approver" to let trusted techs send on the spot).

## Rough effort — Phase 1
Table + migration (S) · hook (S) · management UI (M) · builder + QuoteForm integration (M) ·
tests (S). ≈ a few focused days.

## Integration notes / gotchas
- Reuse `LINE_ITEM_UNITS` so the builder and the price book share the same unit set.
- `quote_items` does **not** currently persist `unit` — if we want the unit to show on the
  customer's quote, add a `unit` column to `quote_items` (optional, small).
- Follow CLAUDE.md gates: `.ts` routes (unless Stripe), `npm run build` + `npm test` +
  `npm run lint` before commit, develop on a feature branch → PR to `sandbox`.

## Decisions needed before build
1. **Category:** free-text field (simple) or a managed category list? — _rec: free text for MVP._
2. **Where it lives:** own nav item `/dashboard/price-book` or a Settings tab? — _rec: own nav item._
3. **Seeding:** auto-seed starter items on signup, or a manual "load starter list" button? — _rec: manual button._
4. **Taxable per item:** Phase 1 or defer? — _rec: defer (quotes already carry a tax rate)._
5. **On-site worker quoting:** confirm this stays Phase 3 (needs quoting added to the `/worker` app).
