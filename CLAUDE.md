# CLAUDE.md - AI Assistant Guide for ToolTime Pro

This document provides essential context for AI assistants working on the ToolTime Pro codebase.

## Project Overview

**ToolTime Pro** is a SaaS platform for service contractors (landscapers, painters, plumbers, handymen). It provides job management, time tracking, invoicing, compliance tools, and business automation.

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Styling**: Tailwind CSS with custom navy/gold theme
- **Deployment**: Netlify (primary), Vercel-compatible

## Project Structure

```
/src
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API routes (webhooks, integrations)
│   ├── auth/              # Authentication pages (login, signup, reset)
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── clients/       # Customer management
│   │   ├── compliance/    # Compliance tracking
│   │   ├── dispatch/      # Job dispatch
│   │   ├── hr-toolkit/    # HR tools
│   │   ├── invoices/      # Invoice management
│   │   ├── jobs/          # Job management
│   │   ├── leads/         # Lead tracking
│   │   ├── quotes/        # Quote generation
│   │   ├── reviews/       # Review management
│   │   ├── schedule/      # Scheduling
│   │   ├── services/      # Service catalog
│   │   ├── settings/      # Account settings
│   │   ├── shield/        # Compliance Shield feature
│   │   └── time-logs/     # Time tracking logs
│   ├── tools/             # Public tools (calculator, classification)
│   ├── worker/            # Worker-facing features (timeclock, safety)
│   ├── quote/             # Quote viewing
│   ├── book/              # Booking functionality
│   ├── checkout/          # Checkout flow
│   └── pricing/           # Pricing page
├── components/            # Reusable React components
│   ├── auth/              # Auth components (ProtectedRoute)
│   ├── layout/            # Layout components (DashboardLayout)
│   ├── forms/             # Form components
│   ├── table/             # Data table component
│   └── charts/            # Chart components
├── contexts/              # React Context providers
│   ├── AuthContext.tsx    # Main auth & user state
│   ├── LanguageContext.tsx # i18n support
│   └── WorkerAuthContext.tsx # Worker auth
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts         # Authentication
│   ├── useTimeClock.ts    # Time tracking logic
│   ├── useDashboard.ts    # Dashboard data
│   ├── useDispatch.ts     # Dispatch management
│   ├── useQuotes.ts       # Quote operations
│   ├── useInvoices.ts     # Invoice operations
│   ├── useJobs.ts         # Job operations
│   ├── useCustomers.ts    # Customer operations
│   └── useOfflineSync.ts  # Offline data sync
├── lib/                   # Utility functions and service clients
│   ├── supabase.ts        # Supabase client config
│   ├── supabase-browser.ts # Browser-side utilities
│   ├── supabase-server.ts # Server-side utilities
│   ├── auth.ts            # Auth utilities
│   ├── stripe.ts          # Stripe integration
│   ├── twilio.ts          # SMS integration
│   ├── mailerlite.ts      # Email marketing
│   └── zapier.ts          # Zapier webhooks
├── types/                 # TypeScript type definitions
│   ├── database.ts        # Database model types
│   ├── quote.ts           # Quote types
│   ├── invoice.ts         # Invoice types
│   └── shield.ts          # Compliance Shield types
└── styles/
    └── globals.css        # Global Tailwind styles

/database                  # PostgreSQL schema files
/supabase                  # Supabase migrations
/public                    # Static assets
/prisma                    # Prisma schema (legacy)
```

## Development Commands

```bash
npm install     # Install dependencies
npm run dev     # Start development server (http://localhost:3000)
npm run build   # Production build
npm run start   # Start production server
npm run lint    # Run ESLint
```

## Code Style & Conventions

### TypeScript
- **Strict mode** enabled - all code must be properly typed
- Use path alias `@/*` for imports from `src/` directory
- Example: `import { supabase } from '@/lib/supabase';`

### Formatting (Prettier)
- Single quotes: `'string'`
- Semicolons: required
- Run formatting is enforced via pre-commit hooks

### Linting (ESLint)
- Extends `next/core-web-vitals` and `prettier`
- Run `npm run lint` to check for issues

### Commit Messages
- Uses **conventional commits** format
- Examples: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `test:`
- Enforced via commitlint in commit-msg hook

## Architecture Patterns

### Multi-Tenant Design
- All data is scoped by `company_id`
- Row-Level Security (RLS) policies enforce data isolation
- Users belong to companies with roles (owner, admin, worker)

### Authentication Flow
1. User signs up/logs in via Supabase Auth
2. `AuthContext` loads user profile and company data
3. `<ProtectedRoute>` wraps authenticated pages
4. Session persists via Supabase cookies

### Data Fetching Pattern
- Custom hooks in `/src/hooks/` handle data operations
- Direct Supabase queries (no REST API layer for internal data)
- Supabase real-time subscriptions for live updates
- Offline storage with sync queue (`useOfflineSync`)

### Component Patterns
- `DashboardLayout` wraps all dashboard pages with sidebar nav
- Forms use `react-hook-form` with `zod` validation
- Data tables use the reusable `DataTable` component

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with AuthProvider |
| `src/app/page.tsx` | Main landing page (45KB) |
| `src/app/dashboard/layout.tsx` | Dashboard layout with sidebar |
| `src/contexts/AuthContext.tsx` | Authentication state management |
| `src/components/layout/DashboardLayout.tsx` | Dashboard UI chrome |
| `src/lib/supabase.ts` | Supabase client configuration |
| `src/types/database.ts` | Core database type definitions |

## Third-Party Integrations

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| **Supabase** | Auth, Database, Real-time | `src/lib/supabase*.ts` |
| **Stripe** | Payments | `src/lib/stripe.ts`, `src/app/api/webhook/stripe/` |
| **Twilio** | SMS notifications | `src/lib/twilio.ts` |
| **QuickBooks** | Accounting sync | `src/app/api/quickbooks/` |
| **MailerLite** | Email marketing | `src/lib/mailerlite.ts` |
| **Zapier** | Workflow automation | `src/lib/zapier.ts` |

## Environment Variables

Required variables (see `.env.example`):

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional integrations
MAILERLITE_API_KEY=...
ZAPIER_WEBHOOK_URL_CLASSIFICATION=...
ZAPIER_WEBHOOK_URL_CALCULATOR=...
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_REDIRECT_URI=...
```

Note: `NEXT_PUBLIC_*` variables are exposed to the browser. All other variables are server-side only.

## Database Schema

Core tables (see `/database/` for full schema):

- `companies` - Business accounts with subscription plans
- `users` - User accounts linked to Supabase Auth
- `customers` - End customers of each business
- `services` - Service catalog with pricing
- `leads` - Potential customer tracking
- `jobs` - Scheduled work with assignments
- `time_entries` - Clock in/out records
- `breaks` - Meal/rest break tracking
- `quotes` - Estimates with auto-numbering
- `invoices` - Billing with payment status
- `incidents` - Safety incident reports
- `review_requests` - Automated review tracking

## Testing

Currently no test suite is configured (`npm test` outputs "No tests yet").

## CI/CD

- **GitHub Actions**: `.github/workflows/ci.yml` runs lint/test on `work` branch
- **Netlify**: Automatic deploys via `netlify.toml`
- **Pre-commit hooks**: Husky runs `npm run lint` before commits

## Common Tasks

### Adding a New Dashboard Page
1. Create folder in `src/app/dashboard/[page-name]/`
2. Add `page.tsx` with the page component
3. Add navigation link in `DashboardLayout.tsx`

### Adding a New API Route
1. Create folder in `src/app/api/[route-name]/`
2. Add `route.ts` with HTTP method handlers
3. Use `supabase-server.ts` for database operations

### Creating a New Hook
1. Add file in `src/hooks/use[Feature].ts`
2. Import supabase from `@/lib/supabase`
3. Export hook with data fetching and mutations
4. Use React state for loading/error handling

### Working with Forms
1. Use `react-hook-form` with `useForm()`
2. Define schema with `zod` for validation
3. Handle submission with Supabase mutations

## Important Notes

- The landing page (`src/app/page.tsx`) is 45KB - be careful with large edits
- Always check `isSupabaseConfigured` before Supabase operations
- RLS policies enforce data isolation - test with proper auth context
- QuickBooks has sandbox/production toggle via environment
- Time tracking has California labor law compliance features
