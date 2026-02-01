# ToolTime Pro - Test Environment Access

> **Last Updated:** January 31, 2026
> **Status:** ✅ FULLY CONFIGURED - Test accounts ready!

---

## Test Credentials

### ADMIN ACCESS (Owner)
```
URL:      http://localhost:3000/auth/login
Email:    missmv@gmail.com
Password: [your existing password]
Role:     Owner (full access)
Name:     Maria Valencia Powell
```

### WORKER ACCESS
```
URL:      http://localhost:3000/auth/login
Email:    worker@greenscene.test
Password: TestWorker123!
Role:     Worker (limited access)
Name:     Carlos Rodriguez
```

### CUSTOMER-FACING PAGES (No Login)
```
Booking:  http://localhost:3000/demo/booking
Quotes:   http://localhost:3000/p/quote/[quote-id]
Invoices: http://localhost:3000/p/invoice/[invoice-id]
```

---

## Current State

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Database | ✅ CONFIGURED | Connected to bqcymeefaizydfogaxcp |
| Seed Data | ✅ LOADED | 5 customers, 3 jobs, 2 quotes, etc. |
| Admin Account | ✅ READY | missmv@gmail.com (owner) |
| Worker Account | ✅ READY | worker@greenscene.test |
| Demo Mode | ✅ WORKING | 14 demo pages with mock data |

---

## Quick Start

```bash
cd ToolTimePro-Ai
npm run dev
# Open http://localhost:3000/auth/login
```

---

## What's Available NOW (No Setup Required)

### Demo Mode Pages

All demo pages use hardcoded mock data and work without any database or authentication.

**Run locally:**
```bash
npm install
npm run dev
# Open http://localhost:3000
```

| Feature | Demo URL | Description |
|---------|----------|-------------|
| **Dashboard** | `/demo/dashboard` | Admin dashboard with stats, jobs, leads |
| **Dispatch** | `/demo/dispatch` | Real-time map with technician tracking |
| **Scheduling** | `/demo/scheduling` | Calendar view, job scheduling |
| **Quoting** | `/demo/quoting` | Create and send quotes |
| **Invoicing** | `/demo/invoicing` | Invoice management |
| **Booking** | `/demo/booking` | Customer-facing booking widget |
| **Reviews** | `/demo/reviews` | Review request system |
| **Worker App** | `/demo/worker` | Mobile worker interface |
| **Shield/Compliance** | `/demo/shield` | CA labor law compliance |
| **QuickBooks** | `/demo/quickbooks` | QuickBooks sync demo |
| **Route Optimization** | `/demo/route-optimization` | Route planning |
| **Phone Receptionist** | `/demo/phone-receptionist` | AI phone answering |
| **Chatbot** | `/demo/chatbot` | AI chat widget |
| **Website Builder** | `/demo/website` | Website templates |

### Demo Data (Hardcoded)

The demo pages include this sample data:

**Company:** Green Scene Landscaping
**Technicians:** Miguel R., Carlos M., David L., James K., Maria S., etc.
**Jobs:** 12 sample jobs (scheduled, en_route, in_progress)
**Revenue:** $2,450 today, $12,340 this week
**Leads:** Robert Wilson, Amanda Foster, James Lee

---

## Full Test Environment Setup

To test with real authentication and database:

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project (free tier works)
3. Copy your credentials from Project Settings > API

### Step 2: Configure Environment

Create `.env.local` in project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### Step 3: Run Database Schema

1. Open Supabase SQL Editor
2. Paste contents of `database/schema.sql`
3. Click Run

### Step 4: Create Test Accounts

**Option A: Via UI (Recommended for Owner)**
1. Go to `http://localhost:3000/auth/signup`
2. Create account with real email
3. Confirm email
4. This creates owner + company automatically

**Option B: Via Supabase Dashboard (For Workers)**
1. Supabase > Authentication > Users > Add User
2. Create user with email/password
3. Copy the user UUID
4. Run SQL to add to users table:

```sql
INSERT INTO users (id, company_id, email, full_name, role, hourly_rate)
SELECT
    'PASTE-UUID-HERE',
    (SELECT id FROM companies LIMIT 1),
    'worker@test.com',
    'Test Worker',
    'worker',
    25.00;
```

### Step 5: Run Seed Data

1. Get your owner user ID from Supabase Auth > Users
2. Edit `database/seed.sql`, line ~18:
   ```sql
   v_owner_id UUID := 'YOUR-OWNER-UUID';
   ```
3. Run seed.sql in Supabase SQL Editor

---

## Test Credentials Template

Once Supabase is configured, your credentials will be:

### ADMIN ACCESS
```
URL:      http://localhost:3000/auth/login
Email:    [your signup email]
Password: [your signup password]
Role:     Owner (full access)
```

### WORKER ACCESS
```
URL:      http://localhost:3000/auth/login
Email:    [created in Supabase]
Password: [created in Supabase]
Role:     Worker (limited access)
```

### CUSTOMER-FACING PAGES (No Login Required)
```
Booking:  http://localhost:3000/demo/booking
Quote:    http://localhost:3000/p/quote/[quote-id]
Invoice:  http://localhost:3000/p/invoice/[invoice-id]
```

Note: Quote/Invoice IDs come from database after seeding.

---

## Quick Test Checklist

### Demo Mode (Works Now)
- [ ] `npm run dev` starts successfully
- [ ] `/demo/dashboard` loads with mock data
- [ ] `/demo/dispatch` shows map with technicians
- [ ] `/demo/worker` shows worker mobile interface
- [ ] `/demo/booking` shows customer booking flow

### Full Auth Mode (After Supabase Setup)
- [ ] `/auth/signup` creates new account
- [ ] Email confirmation received
- [ ] `/auth/login` works with credentials
- [ ] Dashboard shows seeded data
- [ ] Worker can clock in/out
- [ ] Quotes/invoices generate correctly

---

## Troubleshooting

### "Supabase environment variables not configured"
- Create `.env.local` file
- Restart dev server after changes

### Demo pages show "Loading..."
- Check browser console for errors
- Ensure you're on localhost:3000

### Auth pages redirect or error
- Supabase not configured (expected without .env.local)
- Demo mode doesn't support auth - use demo pages instead

---

## Production Deployment Notes

The domain `tooltimepro.com` is referenced in code but currently returns 403.

To deploy to production:
1. Set up Vercel or Netlify
2. Add environment variables in deployment dashboard
3. Configure Supabase auth redirect URLs
4. Run schema.sql on production Supabase

---

## File References

| File | Purpose |
|------|---------|
| `database/schema.sql` | Full database schema |
| `database/seed.sql` | Demo data script |
| `database/TEST_ACCOUNT_SETUP.md` | Detailed setup guide |
| `.env.example` | Environment template |
| `PRODUCT_SETUP.md` | Full setup documentation |
