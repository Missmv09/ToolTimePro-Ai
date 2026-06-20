-- Migration: Fix job_assignments RLS policy for INSERT operations
-- The existing FOR ALL USING(...) policy fails on INSERT because
-- it lacks an explicit WITH CHECK clause. In Postgres, INSERT/UPDATE
-- rows are validated against WITH CHECK; when it is absent on a
-- permissive FOR ALL policy, the new row is rejected with:
--   "new row violates row-level security policy for table job_assignments"
-- Adding WITH CHECK ensures new rows are validated against the same
-- company-ownership check used for reads (mirrors the invoice_items fix).

DROP POLICY IF EXISTS "Job assignments for company jobs" ON job_assignments;

CREATE POLICY "Job assignments for company jobs" ON job_assignments
    FOR ALL
    USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );
