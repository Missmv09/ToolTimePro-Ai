-- ============================================
-- Migration: 037_website_builder_service_role_grants.sql
-- ============================================
-- Why this exists
--
-- Migration 003 created the website_builder tables with RLS enabled and
-- per-row policies tied to auth.uid(). It assumed Supabase's default
-- privileges would automatically extend table grants to service_role.
-- That assumption breaks when a table is created by a role that isn't
-- covered by the project's ALTER DEFAULT PRIVILEGES (e.g. when running
-- DDL via the Supabase SQL Editor instead of via the migration tooling).
--
-- Symptom: the backend, connecting with SUPABASE_SERVICE_ROLE_KEY, gets
-- "permission denied for table website_sites" (Postgres 42501) even
-- though the JWT verifies and PostgREST routes it correctly as
-- service_role. The role is valid; the role just has zero grants on
-- these tables.
--
-- This migration is idempotent — re-running it is safe.
-- ============================================

GRANT ALL ON TABLE public.website_sites      TO service_role;
GRANT ALL ON TABLE public.website_leads      TO service_role;
GRANT ALL ON TABLE public.website_domain_log TO service_role;
GRANT ALL ON TABLE public.website_templates  TO service_role;

-- Cover any sequences these tables rely on for default values.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Belt-and-suspenders: also fix default privileges going forward so any
-- table created after this point by the postgres role gets the grants
-- automatically. This is what stock Supabase configures by default; we
-- restate it here so a sandbox / fresh project provisioned outside the
-- normal flow inherits the right behavior.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;
