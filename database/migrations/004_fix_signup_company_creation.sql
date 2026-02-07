-- Migration: Fix signup flow - add missing companies RLS policies and atomic signup function
--
-- ROOT CAUSE: The companies table has RLS enabled but no policies defined,
-- which blocks all operations including the INSERT during signup.
-- This leaves users in a broken state: auth account created but no company.
--
-- Run this in Supabase SQL Editor to fix the signup flow.

-- ============================================
-- 1. Add missing RLS policies for companies table
-- ============================================

-- Users can view their own company
CREATE POLICY IF NOT EXISTS "Users can view own company" ON companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Owners and admins can update their company
CREATE POLICY IF NOT EXISTS "Owners can update company" ON companies
    FOR UPDATE USING (
        id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- ============================================
-- 2. Create atomic signup function (SECURITY DEFINER)
-- ============================================
-- This function bypasses RLS and runs in a transaction so that
-- company + user profile creation either both succeed or both fail.
-- This avoids the broken state where auth user exists but company doesn't.

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
    -- Create the company
    INSERT INTO companies (name, email)
    VALUES (p_company_name, p_email)
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
