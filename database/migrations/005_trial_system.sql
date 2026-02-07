-- Migration: Add 14-day Pro trial system
--
-- New users get a 14-day free trial of the Pro plan.
-- After trial expires, they must pick a paid plan to continue.
--
-- Run this in Supabase SQL Editor.

-- ============================================
-- 1. Add trial tracking columns to companies
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- ============================================
-- 2. Update handle_new_signup to set Pro trial
-- ============================================

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
    -- Create the company with Pro trial (14 days)
    INSERT INTO companies (name, email, plan, trial_starts_at, trial_ends_at, onboarding_completed)
    VALUES (p_company_name, p_email, 'pro', NOW(), NOW() + INTERVAL '14 days', false)
    RETURNING id INTO v_company_id;

    -- Create the user profile linked to the company
    INSERT INTO users (id, email, full_name, company_id, role)
    VALUES (p_user_id, p_email, p_full_name, v_company_id, 'owner');

    -- Return the created IDs
    RETURN json_build_object(
        'company_id', v_company_id,
        'user_id', p_user_id
    );
END;
$$;

-- Revoke direct execute from anon, only authenticated users should call this
REVOKE EXECUTE ON FUNCTION public.handle_new_signup FROM anon;
GRANT EXECUTE ON FUNCTION public.handle_new_signup TO authenticated;
