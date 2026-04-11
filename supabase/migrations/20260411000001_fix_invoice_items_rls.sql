-- Migration: Fix invoice_items RLS policy for INSERT operations
-- The existing FOR ALL USING(...) policy fails on INSERT because
-- it lacks an explicit WITH CHECK clause. Adding WITH CHECK ensures
-- new rows are validated against the same company ownership check.

DROP POLICY IF EXISTS "Invoice items for company invoices" ON invoice_items;

CREATE POLICY "Invoice items for company invoices" ON invoice_items
    FOR ALL
    USING (
        invoice_id IN (
            SELECT i.id FROM invoices i
            WHERE i.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    )
    WITH CHECK (
        invoice_id IN (
            SELECT i.id FROM invoices i
            WHERE i.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );
