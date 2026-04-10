# API Reference

<!-- AUTO-GENERATED from src/app/api/ directory scan — do not edit manually -->
<!-- To update: add/modify API routes, then run: node scripts/generate-wiki.js -->

Complete list of ToolTime Pro API endpoints, auto-generated from source code.

**Base URL:** `https://app.tooltimepro.com` (production) or `http://localhost:3000` (local dev)

---

## Admin

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/admin/companies` | `GET` `POST` | `src/app/api/admin/companies/route.ts` |
| `/api/admin/companies/[id]` | `GET` | `src/app/api/admin/companies/[id]/route.ts` |
| `/api/admin/companies/[id]/actions` | `POST` | `src/app/api/admin/companies/[id]/actions/route.ts` |
| `/api/admin/settings/admins` | `GET` `POST` `DELETE` | `src/app/api/admin/settings/admins/route.ts` |
| `/api/admin/stats` | `GET` | `src/app/api/admin/stats/route.ts` |
| `/api/admin/verify` | `GET` | `src/app/api/admin/verify/route.ts` |

## Ai Photo Analysis

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/ai-photo-analysis` | `POST` | `src/app/api/ai-photo-analysis/route.ts` |

## Ai Quote

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/ai-quote` | `POST` | `src/app/api/ai-quote/route.ts` |

## Auth

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/auth/2fa/check-device` | `POST` | `src/app/api/auth/2fa/check-device/route.ts` |
| `/api/auth/2fa/send-code` | `POST` | `src/app/api/auth/2fa/send-code/route.ts` |
| `/api/auth/2fa/settings` | `GET` `POST` `DELETE` | `src/app/api/auth/2fa/settings/route.ts` |
| `/api/auth/2fa/verify-code` | `POST` | `src/app/api/auth/2fa/verify-code/route.ts` |
| `/api/auth/check-needs-password` | `GET` | `src/app/api/auth/check-needs-password/route.ts` |
| `/api/auth/password-setup-complete` | `POST` | `src/app/api/auth/password-setup-complete/route.ts` |
| `/api/auth/session-guard` | `GET` `POST` | `src/app/api/auth/session-guard/route.ts` |
| `/api/auth/signout-all` | `POST` | `src/app/api/auth/signout-all/route.ts` |

## Blog

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/blog` | `GET` `POST` | `src/app/api/blog/route.js` |
| `/api/blog/ai-generate` | `POST` | `src/app/api/blog/ai-generate/route.js` |

## Bookings

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/bookings` | `POST` | `src/app/api/bookings/route.js` |

## Checkout

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/checkout` | `GET` | `src/app/api/checkout/route.js` |
| `/api/checkout/session` | `GET` | `src/app/api/checkout/session/route.js` |

## Google Calendar

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/google-calendar/callback` | `GET` | `src/app/api/google-calendar/callback/route.js` |
| `/api/google-calendar/connect` | `GET` | `src/app/api/google-calendar/connect/route.js` |
| `/api/google-calendar/disconnect` | `POST` | `src/app/api/google-calendar/disconnect/route.js` |
| `/api/google-calendar/sync` | `POST` | `src/app/api/google-calendar/sync/route.js` |

## Invoice

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/invoice/pay` | `POST` | `src/app/api/invoice/pay/route.ts` |
| `/api/invoice/send` | `POST` | `src/app/api/invoice/send/route.ts` |

## Jenny Actions

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/jenny-actions` | `GET` `POST` | `src/app/api/jenny-actions/route.ts` |

## Jenny Exec

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/jenny-exec/chat` | `POST` | `src/app/api/jenny-exec/chat/route.ts` |

## Jenny Pro

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/jenny-pro/settings` | `GET` `POST` | `src/app/api/jenny-pro/settings/route.js` |
| `/api/jenny-pro/sms-webhook` | `POST` | `src/app/api/jenny-pro/sms-webhook/route.js` |

## Jobs

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/jobs/assign` | `POST` | `src/app/api/jobs/assign/route.ts` |
| `/api/jobs/list` | `GET` | `src/app/api/jobs/list/route.ts` |
| `/api/jobs/save` | `POST` | `src/app/api/jobs/save/route.ts` |

## Material Price Logs

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/material-price-logs` | `GET` `POST` | `src/app/api/material-price-logs/route.ts` |

## Platform Blog

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/platform-blog` | `GET` `POST` `PATCH` `DELETE` | `src/app/api/platform-blog/route.js` |
| `/api/platform-blog/ai-generate` | `POST` | `src/app/api/platform-blog/ai-generate/route.js` |

## Portal

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/portal` | `GET` `POST` | `src/app/api/portal/route.ts` |

## Quickbooks

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/quickbooks/callback` | `GET` | `src/app/api/quickbooks/callback/route.ts` |
| `/api/quickbooks/connect` | `GET` | `src/app/api/quickbooks/connect/route.ts` |
| `/api/quickbooks/disconnect` | `POST` | `src/app/api/quickbooks/disconnect/route.ts` |
| `/api/quickbooks/sync` | `POST` | `src/app/api/quickbooks/sync/route.ts` |

## Quote

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/quote/delete` | `POST` | `src/app/api/quote/delete/route.ts` |
| `/api/quote/deposit-pay` | `POST` | `src/app/api/quote/deposit-pay/route.ts` |
| `/api/quote/notify-approval` | `POST` | `src/app/api/quote/notify-approval/route.ts` |
| `/api/quote/notify-cancellation` | `POST` | `src/app/api/quote/notify-cancellation/route.ts` |
| `/api/quote/notify-scheduling` | `POST` | `src/app/api/quote/notify-scheduling/route.ts` |
| `/api/quote/public` | `GET` | `src/app/api/quote/public/route.ts` |
| `/api/quote/request-scheduling` | `POST` | `src/app/api/quote/request-scheduling/route.ts` |
| `/api/quote/respond` | `POST` | `src/app/api/quote/respond/route.ts` |
| `/api/quote/save` | `POST` | `src/app/api/quote/save/route.ts` |
| `/api/quote/save-items` | `POST` | `src/app/api/quote/save-items/route.ts` |
| `/api/quote/send` | `POST` | `src/app/api/quote/send/route.ts` |

## Reset Password

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/reset-password` | `POST` | `src/app/api/reset-password/route.ts` |

## Reviews

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/reviews` | `GET` `POST` | `src/app/api/reviews/route.js` |
| `/api/reviews/track` | `GET` | `src/app/api/reviews/track/route.ts` |

## Routes

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/routes/optimize` | `POST` | `src/app/api/routes/optimize/route.ts` |
| `/api/routes/saved` | `GET` `POST` | `src/app/api/routes/saved/route.ts` |
| `/api/routes/saved/[id]` | `GET` `DELETE` | `src/app/api/routes/saved/[id]/route.ts` |
| `/api/routes/settings` | `GET` `PUT` | `src/app/api/routes/settings/route.ts` |
| `/api/routes/worker/[id]` | `GET` | `src/app/api/routes/worker/[id]/route.ts` |

## Send Confirmation Email

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/send-confirmation-email` | `POST` | `src/app/api/send-confirmation-email/route.ts` |

## Send Team Invite

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/send-team-invite` | `POST` | `src/app/api/send-team-invite/route.ts` |

## Send Welcome Email

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/send-welcome-email` | `POST` | `src/app/api/send-welcome-email/route.ts` |

## Signup

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/signup` | `POST` | `src/app/api/signup/route.ts` |

## Sms

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/sms` | `GET` `POST` | `src/app/api/sms/route.js` |

## Stripe

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/stripe/connect` | `POST` | `src/app/api/stripe/connect/route.js` |
| `/api/stripe/connect/callback` | `POST` | `src/app/api/stripe/connect/callback/route.js` |
| `/api/stripe/connect/status` | `GET` | `src/app/api/stripe/connect/status/route.js` |
| `/api/stripe/setup-products` | `GET` `POST` | `src/app/api/stripe/setup-products/route.js` |

## Supplier Pricing

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/supplier-pricing` | `GET` `POST` | `src/app/api/supplier-pricing/route.ts` |

## Team Member

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/team-member/create` | `POST` | `src/app/api/team-member/create/route.ts` |
| `/api/team-member/delete` | `POST` | `src/app/api/team-member/delete/route.ts` |
| `/api/team-member/toggle-status` | `POST` | `src/app/api/team-member/toggle-status/route.ts` |
| `/api/team-member/update-email` | `POST` | `src/app/api/team-member/update-email/route.ts` |

## Trial Reminders

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/trial-reminders` | `GET` | `src/app/api/trial-reminders/route.ts` |

## Webhook

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/webhook/stripe` | `POST` | `src/app/api/webhook/stripe/route.js` |
| `/api/webhook/stripe-connect` | `POST` | `src/app/api/webhook/stripe-connect/route.ts` |

## Website Builder

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/website-builder/create-site` | `POST` | `src/app/api/website-builder/create-site/route.js` |
| `/api/website-builder/delete-site` | `DELETE` | `src/app/api/website-builder/delete-site/route.js` |
| `/api/website-builder/domain-register` | `POST` | `src/app/api/website-builder/domain-register/route.js` |
| `/api/website-builder/domain-search` | `POST` | `src/app/api/website-builder/domain-search/route.js` |
| `/api/website-builder/leads` | `POST` | `src/app/api/website-builder/leads/route.js` |
| `/api/website-builder/public-site` | `GET` | `src/app/api/website-builder/public-site/route.js` |
| `/api/website-builder/publish-status` | `GET` | `src/app/api/website-builder/publish-status/route.js` |
| `/api/website-builder/status` | `GET` | `src/app/api/website-builder/status/route.js` |
| `/api/website-builder/stock-photos` | `GET` | `src/app/api/website-builder/stock-photos/route.js` |
| `/api/website-builder/update-site` | `PUT` | `src/app/api/website-builder/update-site/route.js` |

## Workforce

| Endpoint | Methods | Source |
|----------|---------|--------|
| `/api/workforce` | `GET` `POST` | `src/app/api/workforce/route.ts` |

---

> **Total endpoints:** 89 routes across 33 groups

_Last generated: 2026-04-10_
