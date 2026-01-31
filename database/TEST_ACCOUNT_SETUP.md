# Test Account Setup Guide

This guide walks you through setting up a complete test/demo environment for ToolTime Pro.

## Quick Reference

| Access Type | URL | Credentials |
|-------------|-----|-------------|
| Admin Dashboard | `/auth/login` | Your signup email/password |
| Worker App | `/demo/worker` | Demo mode (no login needed) |
| Customer Booking | `/demo/booking` | Demo mode (no login needed) |
| View Quotes | `/p/quote/{quote_id}` | Public link (no login) |
| View Invoices | `/p/invoice/{invoice_id}` | Public link (no login) |

---

## Option 1: Quick Demo Mode (No Database)

The fastest way to explore ToolTime Pro features without any setup:

```
http://localhost:3000/demo/dashboard    - Dashboard preview
http://localhost:3000/demo/dispatch     - Real-time dispatch map
http://localhost:3000/demo/scheduling   - Job scheduling
http://localhost:3000/demo/invoicing    - Invoice management
http://localhost:3000/dashboard/smart-quote - Smart Quote creation (DB-connected)
http://localhost:3000/demo/booking      - Customer booking widget
http://localhost:3000/demo/reviews      - Review request system
http://localhost:3000/demo/shield       - Compliance tracking
http://localhost:3000/demo/worker       - Worker mobile app
http://localhost:3000/demo/quickbooks   - QuickBooks sync
```

**Pros:** Instant, no setup required
**Cons:** Data is hardcoded, changes don't persist

---

## Option 2: Full Test Account (Recommended)

### Prerequisites

1. Supabase project created ([supabase.com](https://supabase.com))
2. `.env.local` configured with Supabase credentials
3. Database schema created (run `database/schema.sql`)

### Step 1: Create Owner Account via UI

1. Start the app: `npm run dev`
2. Go to: `http://localhost:3000/auth/signup`
3. Fill in the form:
   - **Full Name:** Test Admin
   - **Company Name:** Green Scene Landscaping
   - **Email:** admin@greenscene.test (use a real email to receive confirmation)
   - **Password:** TestPassword123!
4. Check your email and click the confirmation link
5. You now have an owner account!

### Step 2: Get Your User ID

1. Go to Supabase Dashboard > Authentication > Users
2. Find your user and copy the UUID (it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Step 3: Run the Seed Script

1. Open `database/seed.sql` in a text editor
2. Find this line near the top:
   ```sql
   v_owner_id UUID := '00000000-0000-0000-0000-000000000000'; -- CHANGE THIS!
   ```
3. Replace with your actual user ID:
   ```sql
   v_owner_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; -- Your ID
   ```
4. Go to Supabase Dashboard > SQL Editor
5. Paste the entire seed.sql content
6. Click **Run**
7. You should see success messages in the output

### Step 4: Login and Explore

1. Go to: `http://localhost:3000/auth/login`
2. Login with your signup credentials
3. You'll be redirected to the dashboard with all demo data!

---

## What the Seed Data Includes

### Company
- **Name:** Green Scene Landscaping
- **Location:** Los Angeles, CA
- **Plan:** Pro

### Services (5)
| Service | Price | Type |
|---------|-------|------|
| Weekly Lawn Maintenance | $75 | Fixed |
| Hedge Trimming | $45/hr | Hourly |
| Sprinkler Repair | $125 | Fixed |
| Tree Trimming | $200 | Fixed |
| Full Landscape Design | $50/sq ft | Per Sq Ft |

### Customers (5)
- Sarah Johnson (Beverly Hills)
- Michael Chen (Santa Monica)
- Jennifer Williams (Malibu) - VIP
- Robert Davis (Brentwood)
- Amanda Foster (Pacific Palisades)

### Leads (3)
- David Martinez - New lead, needs follow-up tomorrow
- Lisa Thompson - Contacted, $15k landscape redesign
- James Wilson - Already quoted, sprinkler repair

### Jobs (4)
- Today: 2 jobs (1 scheduled, 1 in progress)
- Tomorrow: 1 job (high priority)
- Yesterday: 1 completed job

### Quotes (2)
- Monthly Lawn Care Package - Sent, awaiting approval ($328.50)
- Backyard Makeover Project - Approved ($4,927.50)

### Invoices (2)
- Paid invoice ($82.13) - from completed job
- Sent invoice ($246.38) - awaiting payment

### Time Entries
- Yesterday: Complete 8-hour shift with lunch break
- Today: Active shift (clocked in 3 hours ago)

---

## Adding Test Workers

Workers must be created through Supabase Auth (they need real auth accounts).

### Option A: Via Supabase Dashboard

1. Go to Supabase > Authentication > Users
2. Click **Add User** > **Create New User**
3. Enter email and password
4. Copy the new user's UUID
5. Insert the user record:

```sql
INSERT INTO users (id, company_id, email, full_name, role, hourly_rate)
SELECT
    'PASTE-WORKER-UUID-HERE',
    (SELECT company_id FROM users WHERE role = 'owner' LIMIT 1),
    'worker1@greenscene.test',
    'Carlos Rodriguez',
    'worker',
    25.00;
```

### Option B: Via App (Invite Flow - Future Feature)

The invite worker feature is on the roadmap. For now, use Option A.

---

## Testing Different User Roles

### Owner (Full Access)
- Can see all data
- Can manage users, billing, settings
- Has access to all dashboard pages

### Admin
- Can see all company data
- Cannot manage billing or owner settings
- Can manage jobs, customers, invoices

### Worker
- Can see assigned jobs only
- Can clock in/out
- Can update job status and add photos
- Limited dashboard access

To test different roles, create users via Supabase and set their `role` field to `owner`, `admin`, or `worker`.

---

## Customer-Facing Pages

These pages work without login (public access):

### Quote View
```
http://localhost:3000/p/quote/{quote_id}
```
Get quote IDs from: Supabase > Table Editor > quotes

### Invoice View / Payment
```
http://localhost:3000/p/invoice/{invoice_id}
```
Get invoice IDs from: Supabase > Table Editor > invoices

### Online Booking
```
http://localhost:3000/book/{company_slug}
http://localhost:3000/demo/booking (demo mode)
```

---

## Reset Test Data

To start fresh with new seed data:

```sql
-- Delete all data except auth users (run in Supabase SQL Editor)
DELETE FROM payments;
DELETE FROM invoice_items;
DELETE FROM invoices;
DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM breaks;
DELETE FROM time_entries;
DELETE FROM job_notes;
DELETE FROM job_photos;
DELETE FROM job_checklists;
DELETE FROM job_assignments;
DELETE FROM job_services;
DELETE FROM jobs;
DELETE FROM leads;
DELETE FROM services;
DELETE FROM customers;
-- Don't delete users or companies - they're linked to auth

-- Then run seed.sql again
```

---

## Troubleshooting

### "User not found" error in seed script
- Make sure you signed up first at `/auth/signup`
- Copy the correct UUID from Supabase Auth > Users
- Update the `v_owner_id` variable in seed.sql

### Can't see data after seeding
- Check browser console for errors
- Verify you're logged in with the owner account
- Check Supabase Table Editor to confirm data exists

### RLS policy errors
- Run `database/schema.sql` again to ensure policies exist
- Make sure `company_id` is set on all records

### Email confirmation not arriving
- Check spam folder
- In Supabase Auth settings, you can disable email confirmation for testing
- Or manually confirm users in Supabase Auth dashboard

---

## Quick SQL Queries for Testing

```sql
-- View all users
SELECT id, email, full_name, role FROM users;

-- View today's jobs
SELECT j.title, c.name as customer, j.status, j.scheduled_time_start
FROM jobs j
JOIN customers c ON j.customer_id = c.id
WHERE j.scheduled_date = CURRENT_DATE;

-- View unpaid invoices
SELECT invoice_number, total, status, due_date
FROM invoices
WHERE status IN ('sent', 'overdue');

-- View active time entries
SELECT u.full_name, te.clock_in, te.status
FROM time_entries te
JOIN users u ON te.user_id = u.id
WHERE te.status = 'active';
```
