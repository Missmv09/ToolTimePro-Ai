-- ============================================================
-- 045: Add missing team-member columns to public.users
-- ============================================================
-- WHY: The Add/Edit Team Member flow writes `notes`, `admin_permissions`,
-- `home_address`, and `home_city` to the users table, but `notes` was never
-- added to the schema (worker HR notes live in the separate worker_notes
-- table, which is for categorized notes only — not this free-text field).
-- Result: creating a team member failed with
--   "Could not find the 'notes' column of 'users' in the schema cache".
-- The other three are added by earlier migrations, but are included here with
-- IF NOT EXISTS so a database missing any of them is fully repaired in one run.
-- Idempotent — safe to run repeatedly.
-- ============================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admin_permissions JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS home_city TEXT;

-- Ask PostgREST to reload its schema cache so the new columns are usable
-- immediately (Supabase normally does this automatically on DDL).
NOTIFY pgrst, 'reload schema';
