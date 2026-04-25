-- Migration 035: handle_new_signup sets subscription_status = 'trialing'
--
-- Migration 034 added the column and backfilled existing rows, but the
-- handle_new_signup RPC was never updated to populate it on insert. Every
-- new signup since 034 has subscription_status = NULL, which is harmless
-- (banner / gate fall back to deriving state from trial_ends_at) but sloppy.
--
-- Run this in Supabase SQL Editor on sandbox AND prod.

CREATE OR REPLACE FUNCTION public.handle_new_signup(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_company_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    INSERT INTO companies (
      name, email, plan, trial_starts_at, trial_ends_at,
      subscription_status, onboarding_completed
    )
    VALUES (
      p_company_name, p_email, 'pro', NOW(), NOW() + INTERVAL '14 days',
      'trialing', false
    )
    RETURNING id INTO v_company_id;

    INSERT INTO users (id, email, full_name, company_id, role)
    VALUES (p_user_id, p_email, p_full_name, v_company_id, 'owner');

    RETURN json_build_object(
        'company_id', v_company_id,
        'user_id', p_user_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_signup FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_signup TO authenticated;

-- Backfill any signups created between 034 and this migration that still
-- have NULL subscription_status but a future trial_ends_at.
UPDATE companies
SET subscription_status = 'trialing'
WHERE subscription_status IS NULL
  AND trial_ends_at IS NOT NULL
  AND trial_ends_at > NOW()
  AND stripe_customer_id IS NULL;
