-- Migration: Add missing RLS policies for job-related tables
-- Run this in Supabase SQL Editor to fix job assignment functionality

-- Job assignments: users can manage assignments for jobs in their company
CREATE POLICY IF NOT EXISTS "Job assignments for company jobs" ON job_assignments
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job services: users can manage services for jobs in their company
CREATE POLICY IF NOT EXISTS "Job services for company jobs" ON job_services
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job checklists: users can manage checklists for jobs in their company
CREATE POLICY IF NOT EXISTS "Job checklists for company jobs" ON job_checklists
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job photos: users can manage photos for jobs in their company
CREATE POLICY IF NOT EXISTS "Job photos for company jobs" ON job_photos
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Job notes: users can manage notes for jobs in their company
CREATE POLICY IF NOT EXISTS "Job notes for company jobs" ON job_notes
    FOR ALL USING (
        job_id IN (
            SELECT j.id FROM jobs j
            WHERE j.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Quote items: users can manage items for quotes in their company
CREATE POLICY IF NOT EXISTS "Quote items for company quotes" ON quote_items
    FOR ALL USING (
        quote_id IN (
            SELECT q.id FROM quotes q
            WHERE q.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Invoice items: users can manage items for invoices in their company
CREATE POLICY IF NOT EXISTS "Invoice items for company invoices" ON invoice_items
    FOR ALL USING (
        invoice_id IN (
            SELECT i.id FROM invoices i
            WHERE i.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );

-- Payments: users can manage payments in their company
CREATE POLICY IF NOT EXISTS "Payments belong to company" ON payments
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Incidents: users can manage incidents in their company
CREATE POLICY IF NOT EXISTS "Incidents belong to company" ON incidents
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Review requests: users can manage review requests in their company
CREATE POLICY IF NOT EXISTS "Review requests belong to company" ON review_requests
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Breaks: users can manage breaks for time entries in their company
CREATE POLICY IF NOT EXISTS "Breaks for company time entries" ON breaks
    FOR ALL USING (
        time_entry_id IN (
            SELECT t.id FROM time_entries t
            WHERE t.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
        )
    );
