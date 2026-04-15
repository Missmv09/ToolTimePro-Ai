-- ============================================================
-- Migration: Fix Missing RLS Policies
-- Date: 2026-04-15
--
-- Fixes critical Supabase security advisor warnings:
--   1. "Table publicly accessible" (rls_disabled_in_public)
--   2. "Sensitive data publicly accessible" (sensitive_columns_exposed)
--
-- Tables fixed:
--   - recurring_jobs (no RLS)
--   - notifications (no RLS)
--   - google_calendar_connections (no RLS — contains OAuth tokens)
--   - payment_plans (no RLS)
--   - payment_plan_installments (no RLS — contains Stripe payment intents)
--   - webhooks (no RLS — contains HMAC secrets)
--   - webhook_logs (no RLS)
--   - companies (RLS enabled but no policies defined)
-- ============================================================

-- ============================================
-- 1. recurring_jobs — company-scoped job templates
-- ============================================
ALTER TABLE recurring_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recurring jobs belong to company"
    ON recurring_jobs FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 2. notifications — per-user, company-scoped
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System inserts notifications for company users"
    ON notifications FOR INSERT
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 3. google_calendar_connections — CRITICAL: contains OAuth tokens
-- ============================================
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar connection"
    ON google_calendar_connections FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. payment_plans — company-scoped financial data
-- ============================================
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment plans belong to company"
    ON payment_plans FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 5. payment_plan_installments — linked to payment_plans
-- ============================================
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Installments belong to company payment plans"
    ON payment_plan_installments FOR ALL
    USING (
        payment_plan_id IN (
            SELECT id FROM payment_plans
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        payment_plan_id IN (
            SELECT id FROM payment_plans
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- ============================================
-- 6. webhooks — CRITICAL: contains HMAC secrets and endpoint URLs
-- ============================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhooks belong to company"
    ON webhooks FOR ALL
    USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- 7. webhook_logs — linked to webhooks
-- ============================================
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook logs belong to company webhooks"
    ON webhook_logs FOR ALL
    USING (
        webhook_id IN (
            SELECT id FROM webhooks
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        webhook_id IN (
            SELECT id FROM webhooks
            WHERE company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- ============================================
-- 8. companies — RLS enabled since schema.sql but NO policies exist
--    Without a policy, RLS blocks ALL access via anon/authenticated roles.
--    The app works because API routes use service_role, but the table
--    still triggers the Supabase security advisor warning.
--    Add a read policy so authenticated users can see their own company,
--    and an update policy for owners/admins.
-- ============================================
CREATE POLICY "Users can view their own company"
    ON companies FOR SELECT
    USING (id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Owners and admins can update their company"
    ON companies FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM users
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );
