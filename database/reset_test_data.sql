-- Reset test data on the SANDBOX Supabase project.
--
-- Wipes every company, its rows in every dependent table (jobs, customers,
-- quotes, invoices, sessions, ... all cascade from companies since migration
-- 20260416000000_cascade_delete_company_fks), the public.users rows, AND the
-- auth.users rows, so the same emails can sign up again afterwards.
--
-- Why auth.users too: the signup route (src/app/api/signup/route.ts) refuses
-- an email whose auth user is already confirmed with "An account with this
-- email already exists" (409). Deleting only the public tables leaves that
-- auth row behind and the email becomes unusable for re-testing. Deleting the
-- auth row cascades to public.users (schema.sql: users.id REFERENCES
-- auth.users ON DELETE CASCADE), so this script never has to touch users
-- directly.
--
-- Run it in the Supabase SQL Editor of the SANDBOX project only. Two guards:
--   1. v_confirm must be set to the literal 'SANDBOX' or nothing runs.
--   2. v_keep_emails lists accounts to preserve (their auth user, users row,
--      company, and everything under the company survive).
--
-- Afterwards follow "Reset Test Data" in database/TEST_ACCOUNT_SETUP.md —
-- the QA logins and portal tokens stored as GitHub secrets point at rows this
-- script removes, so the authenticated E2E job fails until they are re-created.

DO $$
DECLARE
  -- Type SANDBOX here after confirming the SQL editor tab is the sandbox project.
  v_confirm TEXT := '';

  -- Accounts to keep. Matched case-insensitively against auth.users.email,
  -- users.email and companies.email. Leave empty to wipe everything.
  v_keep_emails TEXT[] := ARRAY[]::TEXT[];

  -- true  -> only delete companies flagged is_test = true (migration 053).
  -- false -> delete every company not protected by v_keep_emails.
  v_only_flagged_test_companies BOOLEAN := false;

  v_has_is_test BOOLEAN;
  v_keep_company_ids UUID[];
  v_companies_before INT;
  v_companies_after INT;
  v_auth_before INT;
  v_auth_after INT;
  v_orphan_customers INT;
BEGIN
  IF v_confirm IS DISTINCT FROM 'SANDBOX' THEN
    RAISE EXCEPTION 'Refusing to run: set v_confirm to ''SANDBOX'' after checking this SQL editor is the sandbox project, not production.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'is_test'
  ) INTO v_has_is_test;

  IF v_only_flagged_test_companies AND NOT v_has_is_test THEN
    RAISE EXCEPTION 'companies.is_test does not exist here. Apply database/migrations/053_companies_is_test.sql first, or set v_only_flagged_test_companies = false.';
  END IF;

  SELECT count(*) INTO v_companies_before FROM public.companies;
  SELECT count(*) INTO v_auth_before FROM auth.users;

  -- Companies to preserve: matched by the company's own email, or owned by a
  -- kept user (same resolution as database/grant_beta_testers.sql).
  SELECT COALESCE(array_agg(DISTINCT c.id), ARRAY[]::UUID[]) INTO v_keep_company_ids
  FROM public.companies c
  WHERE lower(c.email) = ANY (SELECT lower(e) FROM unnest(v_keep_emails) e)
     OR c.id IN (
       SELECT u.company_id FROM public.users u
       WHERE lower(u.email) = ANY (SELECT lower(e) FROM unnest(v_keep_emails) e)
     );

  -- 1. Companies. Everything with a company_id cascades from here.
  IF v_only_flagged_test_companies THEN
    EXECUTE 'DELETE FROM public.companies WHERE is_test = true AND NOT (id = ANY($1))'
      USING v_keep_company_ids;
  ELSE
    DELETE FROM public.companies WHERE NOT (id = ANY (v_keep_company_ids));
  END IF;

  -- 2. Customers whose company_id is NULL never cascade; remove them so the
  --    customers table is actually empty after a full wipe.
  v_orphan_customers := 0;
  IF NOT v_only_flagged_test_companies THEN
    DELETE FROM public.customers WHERE company_id IS NULL;
    GET DIAGNOSTICS v_orphan_customers = ROW_COUNT;
  END IF;

  -- 3. Auth users that no longer have a profile row (their company is gone),
  --    unless explicitly kept. This is what frees the email for re-signup.
  DELETE FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
    AND NOT (lower(au.email) = ANY (SELECT lower(e) FROM unnest(v_keep_emails) e));

  SELECT count(*) INTO v_companies_after FROM public.companies;
  SELECT count(*) INTO v_auth_after FROM auth.users;

  RAISE NOTICE 'companies: % -> %', v_companies_before, v_companies_after;
  RAISE NOTICE 'auth.users: % -> %', v_auth_before, v_auth_after;
  RAISE NOTICE 'orphan customers removed: %', v_orphan_customers;
  RAISE NOTICE 'kept companies: %', COALESCE(array_length(v_keep_company_ids, 1), 0);
END $$;

-- Sanity check: anything left in auth.users without a users row is an orphan
-- that will 409 on signup. This should return zero rows after a full wipe.
SELECT au.id, au.email, au.email_confirmed_at
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL
ORDER BY au.email;
