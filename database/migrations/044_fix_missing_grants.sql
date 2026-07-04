-- ============================================================
-- 044: Fix missing role GRANTs on public schema
-- ============================================================
-- WHY: Migration 043 created ~22 tables (customer_sessions, portal_*,
-- reschedule_requests, etc.) with plain CREATE TABLE + RLS, but no GRANTs.
-- On a normal Supabase project, tables created in the dashboard are
-- auto-granted to anon/authenticated/service_role via ALTER DEFAULT
-- PRIVILEGES. Tables created by this raw migration were NOT, so even the
-- service_role key (which bypasses RLS) got "permission denied for table"
-- because it lacked the base table-level privilege. This restores the
-- standard Supabase grant set and default privileges so it never recurs.
-- Idempotent — safe to run repeatedly.
-- ============================================================

BEGIN;

-- Schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Privileges on everything that already exists
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure anything created in the future is auto-granted too
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

COMMIT;

-- NOTE: RLS remains enabled on all these tables, so anon/authenticated are
-- still row-filtered by their policies. These grants only restore the
-- table-level access layer that Supabase normally provisions automatically.
