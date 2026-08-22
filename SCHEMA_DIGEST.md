# SCHEMA_DIGEST

Schema source: `prisma/schema.prisma` (single file; `prisma/` contains no other files, no `migrations/` dir).
Datasource: `postgresql` via `env("DATABASE_URL")`. Generator: `prisma-client-js`.

## 1. Models

### User
| field | type | attributes / relation |
|---|---|---|
| id | String | `@id @default(cuid())` |
| email | String | `@unique` |
| name | String? | |
| role | Role | `@default(OWNER)` |
| orgId | String? | scalar only — no `Org` relation field declared |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |

### Org
| field | type | attributes / relation |
|---|---|---|
| id | String | `@id @default(cuid())` |
| name | String | |
| stripeId | String? | |
| users | User[] | back-relation (no matching relation field on `User`) |
| clients | Client[] | back-relation of `Client.org` |
| quotes | Quote[] | back-relation of `Quote.org` |
| invoices | Invoice[] | back-relation of `Invoice.org` |
| createdAt | DateTime | `@default(now())` |

### Client
| field | type | attributes / relation |
|---|---|---|
| id | String | `@id @default(cuid())` |
| orgId | String | FK scalar |
| name | String | |
| email | String? | |
| phone | String? | |
| address | String? | |
| notes | String? | |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |
| org | Org | `@relation(fields: [orgId], references: [id])` |

### Quote
| field | type | attributes / relation |
|---|---|---|
| id | String | `@id @default(cuid())` |
| orgId | String | FK scalar |
| clientId | String | FK scalar |
| number | Int | `@default(autoincrement())` |
| status | QuoteStatus | `@default(DRAFT)` |
| items | Json | |
| subtotal | Decimal | `@default(0)` |
| tax | Decimal | `@default(0)` |
| total | Decimal | `@default(0)` |
| notes | String? | |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |
| org | Org | `@relation(fields: [orgId], references: [id])` |
| client | Client | `@relation(fields: [clientId], references: [id])` — no back-relation on `Client` |

### Invoice
| field | type | attributes / relation |
|---|---|---|
| id | String | `@id @default(cuid())` |
| orgId | String | FK scalar |
| clientId | String | FK scalar |
| quoteId | String? | FK scalar (optional) |
| number | Int | `@default(autoincrement())` |
| status | InvoiceStatus | `@default(UNPAID)` |
| items | Json | |
| subtotal | Decimal | `@default(0)` |
| tax | Decimal | `@default(0)` |
| total | Decimal | `@default(0)` |
| stripePaymentIntent | String? | |
| createdAt | DateTime | `@default(now())` |
| updatedAt | DateTime | `@updatedAt` |
| org | Org | `@relation(fields: [orgId], references: [id])` |
| client | Client | `@relation(fields: [clientId], references: [id])` — no back-relation on `Client` |
| quote | Quote? | `@relation(fields: [quoteId], references: [id])` — no back-relation on `Quote` |

## 2. Enums

| enum | values |
|---|---|
| Role | OWNER, MANAGER, WORKER |
| QuoteStatus | DRAFT, SENT, APPROVED, REJECTED |
| InvoiceStatus | UNPAID, PAID, VOID |

## 3. Block-level directives

None. `prisma/schema.prisma` contains no `@@index`, `@@unique`, or `@@map`.
Field-level attributes in use: `@id`, `@unique` (`User.email`), `@default(cuid())`, `@default(now())`, `@default(autoincrement())`, `@default(0)`, `@updatedAt`, `@relation`.

Note: the Prisma schema is not the live database schema. The running system uses Supabase/Postgres defined in `database/schema.sql`, `database/migrations/001–053`, and `supabase/migrations/*.sql`.

## 4. References outside the schema

### 4a. Industry / trade lists

| path | what is defined |
|---|---|
| src/lib/industries.ts | `industries[]` (36 entries: name/icon/slug/category/services), `categories` |
| src/app/industries/page.tsx | `industries[]` (60 entries), `categories` |
| src/app/industries/[slug]/page.tsx | `industryContent` per-slug map, `allIndustrySlugs[]` (58 slugs) |
| src/lib/materials-database.ts | `TradeType` union (21 trades), per-trade `Material[]` blocks |
| src/lib/material-estimator.ts | `TRADE_ESTIMATORS[]` (16 trades), `getEstimatorByTrade` |
| src/lib/supplier-pricing.ts | `DEFAULT_TRADE_MARKUPS`, `TRADE_VOLATILITY_MAP`, `TRADE_NAMES`, `MATERIAL_VOLATILITY` |
| src/app/api/jenny-actions/route.ts | `ALL_TRADES: TradeType[]` (21) |
| src/app/api/supplier-pricing/route.ts | trade-keyed pricing lookups |
| src/app/dashboard/website-builder/components/Step1TradeSelect.js | `trades[]` (17 website-builder trade ids) |
| src/app/dashboard/website-builder/components/WebsiteWizard.js | `industryToTrade` slug→trade-id map (34 entries) |
| src/lib/stock-photos.js | photo sets keyed by website-builder trade id (16 keys) |
| src/app/dashboard/estimator/page.tsx | `TRADE_ICONS`, consumes `TRADE_ESTIMATORS` / `DEFAULT_TRADE_MARKUPS` |
| src/app/demo/estimator/page.tsx | `trades[]` (9 demo trades) |
| src/app/page.tsx | homepage trade cards (8 slugs) |
| src/app/dashboard/jenny-lite/page.tsx | business-type `<select>` (18 options) |
| src/app/demo/smart-quote/page.tsx | `businessTypes[]` (9) |
| src/app/demo/website/page.tsx | demo trade templates |
| src/app/onboarding/page.tsx | imports `industries` from `@/lib/industries` |
| src/app/tools/page.tsx | industry nav links |
| src/lib/competitor-data.ts | "21 trades" comparison copy |
| src/app/compare/fieldedge/page.tsx | trade comparison copy |
| src/app/api/jenny-exec/chat/route.ts | trade context in prompt |
| src/app/api/help/ask-jenny/route.js | trade context in prompt |
| src/app/api/ai-quote/route.ts | `businessType` param |
| src/app/api/ai-photo-analysis/route.ts | `businessType` default `'landscaping/lawn care'` |
| src/app/api/platform-blog/ai-generate/route.js | trade topics |
| src/lib/state-compliance.ts | trade-keyed compliance rules |
| netlify/functions/ai-quote.js | `businessType` prompt default |
| netlify/functions/ai-photo-analysis.js | `businessType` prompt default |
| netlify/functions/ai-chatbot.js | service quick-replies |
| netlify/functions/ai-compliance.js | trade context |
| netlify/functions/ai-review.js | business-name default |
| tooltimepro/index.html | `business_type` radio group (6) |
| tooltimepro/quote.html, scheduler.html, website.html, chatbot.html, reviews.html | static-site trade copy |
| messages/en/marketing.json, messages/es/marketing.json | industry labels |
| messages/en/demo.json, messages/es/demo.json | `businessType*` labels |
| database/schema.sql | `website_templates.trade_category` |
| database/migrations/006_add_industry_to_companies.sql | `companies.industry VARCHAR(100)` |
| database/migrations/003_website_builder.sql, 003_website_builder_safe.sql | trade template seed rows |
| database/migrations/018_material_markup_staleness.sql | trade markup columns |
| database/sandbox-combined.sql, sandbox-chunk-1-schema.sql, sandbox-chunk-2-legacy.sql | sandbox copies of the above |
| public/trades/README.md | per-slug trade photo assets |
| src/__tests__/lib/jenny-company.test.js, jenny-sms-agent.test.js | `business_type` fixtures |
| src/__tests__/api/ai-quote.test.js | trade fixtures |
| src/__tests__/api/purchase-plans-and-upsells.test.js | trade fixtures |
| cypress/e2e/booking-demo.cy.js | trade selection |
| wiki/Adding-Services.md, Getting-Started.md, Jenny-AI.md, FAQ.md, Home.md, Customer-Portal.md | docs |
| CLAUDE.md, README.md, PRODUCT_ROADMAP.md, docs/QA_TEST_CASES.md | docs |

### 4b. Service address

| path | what is referenced |
|---|---|
| src/types/database.ts | `address`/`city`/`state`/`zip` on job, customer, company rows |
| src/lib/address-autocomplete.ts | address lookup/parse |
| src/lib/geocoding.ts | address → lat/lng |
| src/lib/booking-core.js | booking address capture |
| src/lib/twilio.ts | address in SMS body |
| src/app/api/jobs/save/route.ts | writes job address fields |
| src/app/api/portal/route.ts | returns job address |
| src/app/api/routes/optimize/route.ts | address → route stops |
| src/app/api/quickbooks/sync/route.ts | maps address to QBO customer |
| src/hooks/useDashboard.ts, useDispatch.ts, useLeads.ts, useWorkerJobs.ts | address fields in fetched rows |
| src/app/dashboard/jobs/page.tsx, schedule/page.tsx, dispatch/page.tsx, booking/page.tsx, recurring-jobs/page.tsx, route-optimizer/page.tsx, smart-quote/page.tsx | job address input/display |
| src/app/dashboard/clients/page.tsx, customers/page.tsx, customers/[id]/page.tsx | customer address |
| src/app/dashboard/invoices/page.tsx | address on invoice |
| src/app/dashboard/settings/page.tsx | company business address |
| src/app/dashboard/website-builder/components/Step4DomainSearch.js | business address |
| src/app/admin/companies/[id]/page.tsx | company address |
| src/app/onboarding/page.tsx | business address capture |
| src/app/book/[companyId]/page.tsx | customer-entered service address |
| src/app/worker/page.tsx, worker/job/page.tsx, worker/route/page.tsx | job site address |
| src/app/portal/appointments/page.tsx, portal/history/page.tsx, portal/tracker/page.tsx | service address display |
| src/app/demo/booking/page.tsx, demo/dispatch/page.jsx, demo/route-optimization/page.tsx, demo/worker/page.tsx, demo/phone-receptionist/page.tsx | demo addresses |
| database/schema.sql | `jobs.address/city/state/zip`, `customers.*`, `companies.address`, `users.home_address` |
| database/seed.sql, seed_test_jobs.sql, seed_quote_test_data.sql | address fixtures |
| scripts/generate-wiki.js | address fields in docs generation |
| src/__tests__/lib/address-autocomplete.test.ts, geocoding.test.ts, hooks/useDispatch.test.ts, components/quote-customer-flow.test.jsx | tests |

### 4c. Job status

Canonical values (`database/schema.sql`, `jobs.status`): `scheduled`, `in_progress`, `completed`, `cancelled`.

| path |
|---|
| src/types/database.ts |
| src/hooks/useJobs.ts, useWorkerJobs.ts, useDispatch.ts, useOverdueJobs.ts, useOfflineSync.ts, useTimeClock.ts, useTimeLogs.ts |
| src/lib/booking-core.js, src/lib/google-calendar-sync.js |
| src/app/api/jobs/list/route.ts |
| src/app/api/jenny/reschedule/route.ts |
| src/app/api/jenny-actions/route.ts |
| src/app/api/jenny-pro/reminders/route.js, port-request/route.js, port-status/route.js |
| src/app/api/portal/route.ts |
| src/app/api/quickbooks/sync/route.ts |
| src/app/api/track/[token]/route.ts, track/location/route.ts |
| src/app/api/webhook/stripe/route.js, webhook/stripe-connect/route.ts |
| src/app/dashboard/jobs/page.tsx, schedule/page.tsx, dispatch/page.tsx, booking/page.tsx, page.tsx, route-optimizer/page.tsx, invoices/page.tsx, payment-plans/page.tsx, onboarding-status/page.tsx |
| src/app/dashboard/clients/page.tsx, customers/page.tsx, customers/[id]/page.tsx |
| src/app/worker/page.tsx, worker/job/page.tsx, worker/timeclock/page.tsx |
| src/app/portal/page.tsx, portal/appointments/page.tsx, portal/history/page.tsx, portal/tracker/page.tsx |
| src/app/track/[token]/page.tsx |
| src/app/demo/dashboard/page.tsx, demo/scheduling/page.tsx, demo/dispatch/page.jsx, demo/worker/page.tsx, demo/customer-portal/page.tsx |
| src/app/page.tsx |
| netlify/functions/booking-store.js |
| database/schema.sql, database/seed.sql, database/seed_test_jobs.sql |
| database/migrations/001_add_missing_columns.sql, 021_jenny_pro_sms_conversations.sql, 022_setup_service_orders.sql, 040_number_port_requests.sql |
| database/sandbox-combined.sql, sandbox-chunk-1-schema.sql, sandbox-chunk-2-legacy.sql |
| src/__tests__/hooks/useOverdueJobs.test.js, __tests__/lib/jenny-bookings.test.js, __tests__/api/jenny-actions-cron.test.js, __tests__/api/premium-purchase-all.test.js, __tests__/api/purchase-plans-and-upsells.test.js |

## 5. i18n

Present. `next-intl` `^4.9.0`, wired via `createNextIntlPlugin` in `next.config.js`.

- Locales: `en`, `es` — declared in `src/i18n/config.ts` (`locales`, `defaultLocale = 'en'`, `Locale` type).
- Request config: `src/i18n/request.ts` — reads the `NEXT_LOCALE` cookie (falls back to `en`), lazily imports all ten namespace files for the locale and merges them into one flat `messages` object.
- Locale strings: `messages/<locale>/` — `auth.json`, `blog.json`, `common.json`, `demo.json`, `legal.json`, `marketing.json`, `misc.json`, `portal.json`, `tools.json`, `worker.json` (identical namespace set for `en` and `es`).
- Consumed via `useTranslations` / `getTranslations` / `NextIntlClientProvider` in 71 files under `src/` (149 call sites); provider mounted in `src/app/layout.tsx`.
- Test double: `src/__mocks__/next-intl.js`.
- Per-company language preference stored as `companies.preferred_language VARCHAR(10) DEFAULT 'en'` (`database/schema.sql`).
- Static marketing site `tooltimepro/` uses its own `data-i18n` attribute scheme, separate from `next-intl`.
