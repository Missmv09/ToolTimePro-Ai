# ToolTime Pro Database Setup

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Settings:
   - Name: `tooltimepro`
   - Database Password: (save this somewhere safe!)
   - Region: West US (closest to California)
5. Wait ~2 minutes for project to spin up

## Step 2: Get Your API Keys

1. Go to Settings > API
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Public Key**: `eyJ...` (long string)
3. Save these - you'll need them for the app

## Step 3: Run the Schema

1. Go to SQL Editor (left sidebar)
2. Click "New Query"
3. Copy/paste the entire `schema.sql` file
4. Click "Run" (or Cmd+Enter)
5. Should see "Success" message

## Step 4: Enable Auth

1. Go to Authentication > Providers
2. Email should be enabled by default
3. (Optional) Enable Google, Apple, etc.

## Step 5: Create Storage Bucket (for photos)

1. Go to Storage
2. Click "New Bucket"
3. Name: `job-photos`
4. Public: Yes (or use signed URLs)
5. Create another bucket: `avatars`

## Step 6: Configure Environment

Create a `.env.local` file in the project root (don't commit to git!):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-key-here
```

## Database Schema Overview

The schema includes the following tables:

### Core Tables
- **companies** - Multi-tenant company/business accounts
- **users** - Owners, admins, and workers (linked to Supabase Auth)
- **customers** - The company's customers/clients

### Operations
- **services** - Service types the company offers
- **leads** - Potential customers / inquiries
- **jobs** - Scheduled work/appointments
- **job_services** - Services included in each job
- **job_assignments** - Workers assigned to jobs
- **job_checklists** - Checklist items for jobs
- **job_photos** - Before/during/after photos
- **job_notes** - Notes and comments on jobs

### Time Tracking
- **time_entries** - Clock in/out records
- **breaks** - Meal/rest break tracking (CA compliance)

### Billing
- **quotes** - Estimates sent to customers
- **quote_items** - Line items in quotes
- **invoices** - Bills sent to customers
- **invoice_items** - Line items in invoices
- **payments** - Payment records

### Other
- **incidents** - Incident reports from workers
- **review_requests** - Automated review request tracking

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled to ensure multi-tenant data isolation. Users can only see data belonging to their company.

### Auto-generated Fields
- `updated_at` timestamps are automatically updated on changes
- Quote numbers are auto-generated (Q-YYYYMMDD-0001)
- Invoice numbers are auto-generated (INV-YYYYMMDD-0001)

## Troubleshooting

### "Permission denied" errors
- Make sure RLS policies are created
- Check that the user is properly authenticated
- Verify the user has a company_id set

### "UUID not found" errors
- Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` first

### Schema changes not reflecting
- Clear browser cache
- Restart the development server
- Check Supabase dashboard for any errors

## Next Steps

After setting up the database:
1. Install Supabase client: `npm install @supabase/supabase-js`
2. Create the Supabase client configuration
3. Set up authentication flows
4. Start building the app features!
