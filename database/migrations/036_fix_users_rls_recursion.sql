-- Migration 036: Fix recursive RLS policy on users table
--
-- The "Users see own company members" policy (defined in schema.sql) had a
-- subquery that read from `users` while evaluating an RLS policy ON `users`,
-- causing infinite recursion → 500 errors on user fetches.
--
-- Fix: replace the recursive subquery with a SECURITY DEFINER helper
-- function that bypasses RLS when looking up the caller's company_id.
-- Access semantics are identical (a user can only see other users in their
-- own company) — just without the self-referential evaluation loop.
--
-- This SQL was already applied to sandbox and prod manually — committing
-- here so the schema change is tracked in source going forward.
--
-- Run this in Supabase SQL Editor on any new environment.

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_company_id() TO authenticated;

DROP POLICY IF EXISTS "Users see own company members" ON users;
CREATE POLICY "Users see own company members" ON users
    FOR SELECT USING (
        company_id = public.current_user_company_id()
    );
