# CLAUDE.md — ToolTime Pro Development Guidelines

## Project Overview
ToolTime Pro is a field service management SaaS for contractors (landscaping, plumbing, HVAC, etc.). Built with Next.js 14, TypeScript, React, Supabase, deployed on Netlify.

## Quality Gates — MUST FOLLOW

### Before Every Commit
1. **Run `npm run build`** — catches TypeScript errors that `npm test` misses
2. **Run `npm test`** — all 382+ tests must pass
3. **Run `npm run lint`** — no new lint errors

### Code Standards
- **Use `.js` for API routes** that use complex SDK types (Stripe, external APIs) to avoid TypeScript inference issues
- **Use `.tsx` for React components** with proper type annotations
- **Never commit `.env` files** — all secrets go in Netlify env vars
- **Test locally before pushing** — the CI checks lint + test + build

### Architecture Rules
- **Supabase** is the database — all queries go through `@/lib/supabase`
- **Stripe prices** use `NEXT_PUBLIC_STRIPE_PRICES` JSON env var parsed by `@/lib/stripe-prices.js` — never hardcode price IDs
- **Auth** is via Supabase Auth (client-side localStorage + middleware cookie refresh)
- **Cron schedules** go in `netlify.toml` ONLY — never duplicate in function file config exports
- **Static marketing site** lives in `tooltimepro/` — separate from the Next.js app

### Pricing & Products
When adding new products or add-ons:
1. Add to `src/lib/stripe-prices.js` schema comment
2. Add to `scripts/setup-stripe-products.js` PRODUCTS array
3. Add to `src/app/api/stripe/setup-products/route.js` PRODUCTS array
4. Add to `src/app/pricing/page.jsx` UI
5. Add to `src/app/page.tsx` features/demoCards/pricingPlans
6. Add to `tooltimepro/index.html` features + pricing sections
7. Add to `netlify/functions/checkout.js` if needed

### Current Product Catalog (keep in sync)
**Plans:** Starter ($49), Pro ($79), Elite ($129), Booking Only ($15), Invoicing Only ($15)
**Jenny AI:** Lite (free/included), Pro ($49), Exec Admin ($79)
**Add-ons:** Website Builder ($25), Compliance Autopilot ($29), Extra Page ($10), QuickBooks Sync ($12), Customer Portal Pro ($24), Extra Worker ($7/user)
**Setup:** Assisted Onboarding ($199), White Glove ($499)

### Branch & PR Workflow
- Always develop on feature branches (`claude/feature-name-xxxxx`)
- Push with `git push -u origin <branch-name>`
- Merge main into your branch before creating PR if branch is behind
- Check CI passes before requesting merge

### Common Pitfalls to Avoid
- Don't define cron schedules in both `netlify.toml` AND function config exports
- Don't use TypeScript for Stripe API routes (circular type inference fails the build)
- Don't forget to update BOTH `tooltimepro/index.html` AND `src/app/page.tsx` when adding features
- Don't push without verifying `npm run build` succeeds
- Always add `customer_portal_pro` when listing add-ons (it's new and easy to forget)
