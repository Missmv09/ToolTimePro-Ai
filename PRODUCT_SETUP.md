# ToolTime Pro - Real Product Setup Guide

This guide helps you set up the full ToolTime Pro product (the Next.js app with Supabase backend).

## Architecture Overview

- **Marketing/Demo Site** (`tooltimepro/`) - Static HTML deployed to Netlify
- **Real Product** (`src/`) - Full Next.js app with Supabase backend

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose a name (e.g., "tooltime-pro")
4. Set a strong database password (save this!)
5. Select a region close to your users
6. Click "Create new project" and wait ~2 minutes

## Step 2: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local
```

Then update with your Supabase values (found in Project Settings > API):

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key

# Optional for full features
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
MAILERLITE_API_KEY=...
```

## Step 3: Run Database Schema

1. In Supabase, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `database/schema.sql`
4. Paste and click **Run**
5. You should see "Success" for all statements

## Step 4: Configure Authentication

1. Go to **Authentication > Settings**
2. Under "Email Auth", ensure it's enabled
3. Under "Site URL", add:
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.com`
4. Under "Redirect URLs", add:
   - `http://localhost:3000/auth/reset-password`
   - `https://your-domain.com/auth/reset-password`

## Step 5: Run the App Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` and you should see the app!

## Step 6: Test the App

1. Go to `http://localhost:3000/auth/signup`
2. Create an account (use a real email to receive confirmation)
3. Check your email for the confirmation link
4. Click the link to verify your account
5. Log in at `/auth/login`
6. You should be redirected to the dashboard!

---

## Production Deployment

### Option A: Vercel (Recommended for Next.js)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Option B: Netlify

Update `netlify.toml` to build the Next.js app:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NEXT_RUNTIME = "nodejs"
```

---

## What's Already Built

### Authentication
- ✅ Sign up with company creation
- ✅ Email/password login
- ✅ Forgot password flow
- ✅ Password reset
- ✅ Session management

### Dashboard Pages
- ✅ Main dashboard with stats
- ✅ Jobs management
- ✅ Leads/CRM
- ✅ Clients
- ✅ Quotes
- ✅ Invoices
- ✅ Time logs
- ✅ Schedule
- ✅ Compliance/Shield
- ✅ HR Toolkit

### Features
- ✅ Multi-tenant (each company sees only their data)
- ✅ Row-level security in Supabase
- ✅ Real-time updates via Supabase subscriptions
- ✅ California labor law compliance tracking
- ✅ Break tracking for CA compliance

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `companies` | Multi-tenant company accounts |
| `users` | Owners, admins, workers |
| `customers` | Company's clients |
| `services` | Service catalog with pricing |
| `leads` | Lead capture and CRM |
| `jobs` | Scheduled work |
| `time_entries` | Clock in/out |
| `breaks` | Meal/rest break tracking |
| `quotes` | Estimates |
| `invoices` | Billing |
| `incidents` | Safety/incident reports |

---

## Troubleshooting

### "Supabase environment variables not configured"
- Make sure `.env.local` exists with correct values
- Restart the dev server after changing `.env.local`

### "User not found after signup"
- Check if email confirmation is required in Supabase settings
- Look in Supabase Auth dashboard for the user

### RLS policy errors
- Ensure the user's `company_id` is set correctly
- Check that RLS policies are created (run schema.sql again if needed)

---

## Need Help?

The codebase is well-structured:
- `src/app/` - Next.js pages (App Router)
- `src/components/` - Reusable React components
- `src/contexts/` - Auth and other React contexts
- `src/hooks/` - Custom hooks for data fetching
- `src/lib/` - Supabase client and utilities
- `src/types/` - TypeScript type definitions
- `database/` - SQL schema
