-- ToolTime Pro - Demo/Test Account Seed Data
-- ============================================
--
-- USAGE: Run this in Supabase SQL Editor AFTER:
-- 1. Running schema.sql to create tables
-- 2. Creating at least one user through /auth/signup (this creates the owner)
--
-- This script will:
-- - Create a demo company (or use existing)
-- - Add sample customers, services, leads
-- - Create sample jobs, quotes, invoices
-- - Add sample time entries and breaks
--
-- IMPORTANT: Update the OWNER_USER_ID variable below with your actual user ID!

-- ============================================
-- CONFIGURATION - UPDATE THESE VALUES!
-- ============================================

-- Get your user ID from Supabase Auth > Users after signing up
-- Or run: SELECT id, email FROM auth.users;

DO $$
DECLARE
    -- REPLACE THIS with your actual user ID from Supabase Auth
    -- Find it: Supabase Dashboard > Authentication > Users > Copy UUID
    v_owner_id UUID := '00000000-0000-0000-0000-000000000000'; -- CHANGE THIS!

    -- Variables for created records
    v_company_id UUID;
    v_customer_1 UUID;
    v_customer_2 UUID;
    v_customer_3 UUID;
    v_customer_4 UUID;
    v_customer_5 UUID;
    v_service_1 UUID;
    v_service_2 UUID;
    v_service_3 UUID;
    v_service_4 UUID;
    v_service_5 UUID;
    v_worker_1 UUID;
    v_worker_2 UUID;
    v_job_1 UUID;
    v_job_2 UUID;
    v_job_3 UUID;
    v_job_4 UUID;
    v_quote_1 UUID;
    v_quote_2 UUID;
    v_invoice_1 UUID;
    v_invoice_2 UUID;
    v_lead_1 UUID;
    v_lead_2 UUID;
    v_lead_3 UUID;

BEGIN
    -- ============================================
    -- STEP 1: Get or create company from owner user
    -- ============================================

    -- Check if user exists and get their company
    SELECT company_id INTO v_company_id FROM users WHERE id = v_owner_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User not found! Please sign up first at /auth/signup, then update v_owner_id with your user ID from Supabase Auth > Users';
    END IF;

    RAISE NOTICE 'Found company: %', v_company_id;

    -- Update company with demo details
    UPDATE companies SET
        name = 'Green Scene Landscaping',
        phone = '(310) 555-0100',
        address = '456 Garden Way',
        city = 'Los Angeles',
        state = 'CA',
        zip = '90210',
        plan = 'pro'
    WHERE id = v_company_id;

    -- ============================================
    -- STEP 2: Create sample services
    -- ============================================

    INSERT INTO services (id, company_id, name, description, default_price, price_type, duration_minutes)
    VALUES
        (uuid_generate_v4(), v_company_id, 'Weekly Lawn Maintenance', 'Mowing, edging, blowing, and basic cleanup', 75.00, 'fixed', 60),
        (uuid_generate_v4(), v_company_id, 'Hedge Trimming', 'Shape and trim hedges and shrubs', 45.00, 'hourly', 90),
        (uuid_generate_v4(), v_company_id, 'Sprinkler Repair', 'Diagnose and repair irrigation issues', 125.00, 'fixed', 120),
        (uuid_generate_v4(), v_company_id, 'Tree Trimming', 'Trim and shape trees, remove dead branches', 200.00, 'fixed', 180),
        (uuid_generate_v4(), v_company_id, 'Full Landscape Design', 'Complete landscape design and installation', 50.00, 'per_sqft', 480)
    RETURNING id INTO v_service_1;

    -- Get service IDs for later use
    SELECT id INTO v_service_1 FROM services WHERE company_id = v_company_id AND name = 'Weekly Lawn Maintenance';
    SELECT id INTO v_service_2 FROM services WHERE company_id = v_company_id AND name = 'Hedge Trimming';
    SELECT id INTO v_service_3 FROM services WHERE company_id = v_company_id AND name = 'Sprinkler Repair';
    SELECT id INTO v_service_4 FROM services WHERE company_id = v_company_id AND name = 'Tree Trimming';
    SELECT id INTO v_service_5 FROM services WHERE company_id = v_company_id AND name = 'Full Landscape Design';

    RAISE NOTICE 'Created 5 services';

    -- ============================================
    -- STEP 3: Create sample customers
    -- ============================================

    INSERT INTO customers (id, company_id, name, email, phone, address, city, state, zip, notes, source)
    VALUES
        (uuid_generate_v4(), v_company_id, 'Sarah Johnson', 'sarah.johnson@email.com', '(310) 555-1001', '123 Oak Street', 'Beverly Hills', 'CA', '90210', 'Prefers service on Tuesdays. Has two dogs.', 'website'),
        (uuid_generate_v4(), v_company_id, 'Michael Chen', 'michael.chen@email.com', '(310) 555-1002', '456 Maple Avenue', 'Santa Monica', 'CA', '90401', 'Large backyard, gate code: 1234', 'referral'),
        (uuid_generate_v4(), v_company_id, 'Jennifer Williams', 'j.williams@email.com', '(310) 555-1003', '789 Palm Drive', 'Malibu', 'CA', '90265', 'VIP customer - priority scheduling', 'google'),
        (uuid_generate_v4(), v_company_id, 'Robert Davis', 'rdavis@email.com', '(310) 555-1004', '321 Cedar Lane', 'Brentwood', 'CA', '90049', 'New customer, prefers morning appointments', 'website'),
        (uuid_generate_v4(), v_company_id, 'Amanda Foster', 'amanda.foster@email.com', '(310) 555-1005', '654 Birch Court', 'Pacific Palisades', 'CA', '90272', 'HOA community - check in at gate', 'referral')
    RETURNING id INTO v_customer_1;

    -- Get customer IDs
    SELECT id INTO v_customer_1 FROM customers WHERE company_id = v_company_id AND name = 'Sarah Johnson';
    SELECT id INTO v_customer_2 FROM customers WHERE company_id = v_company_id AND name = 'Michael Chen';
    SELECT id INTO v_customer_3 FROM customers WHERE company_id = v_company_id AND name = 'Jennifer Williams';
    SELECT id INTO v_customer_4 FROM customers WHERE company_id = v_company_id AND name = 'Robert Davis';
    SELECT id INTO v_customer_5 FROM customers WHERE company_id = v_company_id AND name = 'Amanda Foster';

    RAISE NOTICE 'Created 5 customers';

    -- ============================================
    -- STEP 4: Create sample leads
    -- ============================================

    INSERT INTO leads (id, company_id, name, email, phone, address, service_requested, message, source, status, estimated_value, follow_up_date, assigned_to)
    VALUES
        (uuid_generate_v4(), v_company_id, 'David Martinez', 'david.m@email.com', '(310) 555-2001', '111 Rose Street, LA, CA 90001', 'Weekly Lawn Care', 'Found you on Google. Looking for regular lawn maintenance for my new home.', 'google', 'new', 300.00, CURRENT_DATE + 1, v_owner_id),
        (uuid_generate_v4(), v_company_id, 'Lisa Thompson', 'lisa.t@email.com', '(310) 555-2002', '222 Lily Lane, LA, CA 90002', 'Landscape Redesign', 'We want to completely redo our backyard. Budget around $15,000.', 'website', 'contacted', 15000.00, CURRENT_DATE + 3, v_owner_id),
        (uuid_generate_v4(), v_company_id, 'James Wilson', 'jwilson@email.com', '(310) 555-2003', '333 Daisy Drive, LA, CA 90003', 'Sprinkler System', 'Our sprinklers aren''t working properly. Need someone ASAP.', 'phone', 'quoted', 500.00, CURRENT_DATE, v_owner_id)
    RETURNING id INTO v_lead_1;

    SELECT id INTO v_lead_1 FROM leads WHERE company_id = v_company_id AND name = 'David Martinez';
    SELECT id INTO v_lead_2 FROM leads WHERE company_id = v_company_id AND name = 'Lisa Thompson';
    SELECT id INTO v_lead_3 FROM leads WHERE company_id = v_company_id AND name = 'James Wilson';

    RAISE NOTICE 'Created 3 leads';

    -- ============================================
    -- STEP 5: Create sample jobs
    -- ============================================

    -- Job 1: Today, scheduled
    INSERT INTO jobs (id, company_id, customer_id, title, description, address, city, state, zip, scheduled_date, scheduled_time_start, scheduled_time_end, status, priority, total_amount, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_1, 'Weekly Lawn Maintenance', 'Regular weekly service', '123 Oak Street', 'Beverly Hills', 'CA', '90210', CURRENT_DATE, '09:00', '10:00', 'scheduled', 'normal', 75.00, 'Customer prefers we use side gate');
    SELECT id INTO v_job_1 FROM jobs WHERE company_id = v_company_id AND customer_id = v_customer_1 AND scheduled_date = CURRENT_DATE;

    -- Job 2: Today, in progress
    INSERT INTO jobs (id, company_id, customer_id, title, description, address, city, state, zip, scheduled_date, scheduled_time_start, scheduled_time_end, status, priority, total_amount, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_2, 'Hedge Trimming & Cleanup', 'Trim front yard hedges and cleanup', '456 Maple Avenue', 'Santa Monica', 'CA', '90401', CURRENT_DATE, '10:30', '12:30', 'in_progress', 'normal', 135.00, 'Gate code: 1234');
    SELECT id INTO v_job_2 FROM jobs WHERE company_id = v_company_id AND customer_id = v_customer_2;

    -- Job 3: Tomorrow, scheduled
    INSERT INTO jobs (id, company_id, customer_id, title, description, address, city, state, zip, scheduled_date, scheduled_time_start, scheduled_time_end, status, priority, total_amount, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_3, 'Emergency Sprinkler Repair', 'Fix broken sprinkler head and check system', '789 Palm Drive', 'Malibu', 'CA', '90265', CURRENT_DATE + 1, '08:00', '10:00', 'scheduled', 'high', 150.00, 'VIP customer - call 15 min before arrival');
    SELECT id INTO v_job_3 FROM jobs WHERE company_id = v_company_id AND customer_id = v_customer_3;

    -- Job 4: Completed yesterday
    INSERT INTO jobs (id, company_id, customer_id, title, description, address, city, state, zip, scheduled_date, scheduled_time_start, scheduled_time_end, status, priority, total_amount, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_4, 'Initial Lawn Assessment', 'First visit - assess lawn and provide quote for regular service', '321 Cedar Lane', 'Brentwood', 'CA', '90049', CURRENT_DATE - 1, '14:00', '15:00', 'completed', 'normal', 0.00, 'New customer consultation');
    SELECT id INTO v_job_4 FROM jobs WHERE company_id = v_company_id AND customer_id = v_customer_4;

    RAISE NOTICE 'Created 4 jobs';

    -- ============================================
    -- STEP 6: Create job services
    -- ============================================

    INSERT INTO job_services (job_id, service_id, service_name, quantity, unit_price, total_price)
    VALUES
        (v_job_1, v_service_1, 'Weekly Lawn Maintenance', 1, 75.00, 75.00),
        (v_job_2, v_service_2, 'Hedge Trimming', 2, 45.00, 90.00),
        (v_job_2, v_service_1, 'Weekly Lawn Maintenance', 1, 45.00, 45.00),
        (v_job_3, v_service_3, 'Sprinkler Repair', 1, 125.00, 125.00);

    RAISE NOTICE 'Created job services';

    -- ============================================
    -- STEP 7: Create job assignments (assign owner to jobs)
    -- ============================================

    INSERT INTO job_assignments (job_id, user_id, is_lead)
    VALUES
        (v_job_1, v_owner_id, true),
        (v_job_2, v_owner_id, true),
        (v_job_3, v_owner_id, true),
        (v_job_4, v_owner_id, true);

    RAISE NOTICE 'Created job assignments';

    -- ============================================
    -- STEP 8: Create job checklists
    -- ============================================

    INSERT INTO job_checklists (job_id, item_text, is_completed, sort_order)
    VALUES
        (v_job_1, 'Mow front lawn', false, 1),
        (v_job_1, 'Mow back lawn', false, 2),
        (v_job_1, 'Edge walkways', false, 3),
        (v_job_1, 'Blow debris', false, 4),
        (v_job_2, 'Trim front hedges', true, 1),
        (v_job_2, 'Trim side hedges', true, 2),
        (v_job_2, 'Clean up clippings', false, 3),
        (v_job_2, 'Take after photos', false, 4);

    RAISE NOTICE 'Created job checklists';

    -- ============================================
    -- STEP 9: Create sample quotes
    -- ============================================

    -- Quote 1: Sent, awaiting approval
    INSERT INTO quotes (id, company_id, customer_id, title, description, subtotal, tax_rate, tax_amount, total, status, valid_until, sent_at, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_4, 'Monthly Lawn Care Package', 'Comprehensive monthly lawn care including mowing, edging, and seasonal treatments', 300.00, 9.5, 28.50, 328.50, 'sent', CURRENT_DATE + 30, NOW() - INTERVAL '2 days', 'Includes 4 weekly visits per month');
    SELECT id INTO v_quote_1 FROM quotes WHERE company_id = v_company_id AND customer_id = v_customer_4;

    -- Quote 2: Approved
    INSERT INTO quotes (id, company_id, customer_id, title, description, subtotal, tax_rate, tax_amount, total, status, valid_until, sent_at, approved_at, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_5, 'Backyard Makeover Project', 'Complete backyard redesign including new sod, plants, and irrigation', 4500.00, 9.5, 427.50, 4927.50, 'approved', CURRENT_DATE + 60, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', 'Project to start next month');
    SELECT id INTO v_quote_2 FROM quotes WHERE company_id = v_company_id AND customer_id = v_customer_5;

    -- Quote items
    INSERT INTO quote_items (quote_id, service_id, description, quantity, unit_price, total_price, sort_order)
    VALUES
        (v_quote_1, v_service_1, 'Weekly Lawn Maintenance (4x)', 4, 75.00, 300.00, 1),
        (v_quote_2, v_service_5, 'Landscape Design (500 sq ft)', 500, 5.00, 2500.00, 1),
        (v_quote_2, v_service_3, 'New Irrigation System', 1, 1200.00, 1200.00, 2),
        (v_quote_2, NULL, 'Sod Installation', 1, 800.00, 800.00, 3);

    RAISE NOTICE 'Created 2 quotes with items';

    -- ============================================
    -- STEP 10: Create sample invoices
    -- ============================================

    -- Invoice 1: Paid
    INSERT INTO invoices (id, company_id, customer_id, job_id, subtotal, tax_rate, tax_amount, total, amount_paid, status, due_date, sent_at, paid_at, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_1, v_job_4, 75.00, 9.5, 7.13, 82.13, 82.13, 'paid', CURRENT_DATE - 7, NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', 'Thank you for your business!');
    SELECT id INTO v_invoice_1 FROM invoices WHERE company_id = v_company_id AND status = 'paid' LIMIT 1;

    -- Invoice 2: Sent, awaiting payment
    INSERT INTO invoices (id, company_id, customer_id, subtotal, tax_rate, tax_amount, total, amount_paid, status, due_date, sent_at, notes)
    VALUES (uuid_generate_v4(), v_company_id, v_customer_2, 225.00, 9.5, 21.38, 246.38, 0, 'sent', CURRENT_DATE + 14, NOW() - INTERVAL '1 day', 'Net 15 payment terms');
    SELECT id INTO v_invoice_2 FROM invoices WHERE company_id = v_company_id AND status = 'sent' LIMIT 1;

    -- Invoice items
    INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, sort_order)
    VALUES
        (v_invoice_1, 'Weekly Lawn Maintenance - January Week 4', 1, 75.00, 75.00, 1),
        (v_invoice_2, 'Hedge Trimming Service', 3, 45.00, 135.00, 1),
        (v_invoice_2, 'Debris Removal', 1, 50.00, 50.00, 2),
        (v_invoice_2, 'Equipment Fee', 1, 40.00, 40.00, 3);

    -- Payment for invoice 1
    INSERT INTO payments (company_id, invoice_id, amount, payment_method, notes, paid_at)
    VALUES (v_company_id, v_invoice_1, 82.13, 'card', 'Paid via Stripe', NOW() - INTERVAL '3 days');

    RAISE NOTICE 'Created 2 invoices with items and 1 payment';

    -- ============================================
    -- STEP 11: Create sample time entries
    -- ============================================

    -- Yesterday's completed shift
    INSERT INTO time_entries (company_id, user_id, job_id, clock_in, clock_out, clock_in_location, clock_out_location, break_minutes, notes, status)
    VALUES (
        v_company_id,
        v_owner_id,
        v_job_4,
        (CURRENT_DATE - 1) + TIME '08:00',
        (CURRENT_DATE - 1) + TIME '16:30',
        '{"lat": 34.0522, "lng": -118.2437, "address": "321 Cedar Lane, Brentwood, CA"}',
        '{"lat": 34.0522, "lng": -118.2437, "address": "321 Cedar Lane, Brentwood, CA"}',
        30,
        'Full day - completed 3 jobs',
        'completed'
    );

    -- Today's active shift
    INSERT INTO time_entries (company_id, user_id, job_id, clock_in, clock_in_location, notes, status)
    VALUES (
        v_company_id,
        v_owner_id,
        v_job_2,
        CURRENT_TIMESTAMP - INTERVAL '3 hours',
        '{"lat": 34.0195, "lng": -118.4912, "address": "456 Maple Avenue, Santa Monica, CA"}',
        'Morning shift started',
        'active'
    );

    RAISE NOTICE 'Created 2 time entries';

    -- ============================================
    -- STEP 12: Create breaks for yesterday's shift
    -- ============================================

    INSERT INTO breaks (time_entry_id, user_id, break_type, break_start, break_end, notes)
    SELECT
        te.id,
        v_owner_id,
        'meal',
        (CURRENT_DATE - 1) + TIME '12:00',
        (CURRENT_DATE - 1) + TIME '12:30',
        'Lunch break'
    FROM time_entries te
    WHERE te.user_id = v_owner_id
    AND te.status = 'completed'
    LIMIT 1;

    RAISE NOTICE 'Created break record';

    -- ============================================
    -- STEP 13: Create job notes
    -- ============================================

    INSERT INTO job_notes (job_id, user_id, note_text, is_internal)
    VALUES
        (v_job_2, v_owner_id, 'Customer mentioned they want to add monthly fertilizer treatment - follow up next visit', true),
        (v_job_4, v_owner_id, 'Lawn is in good condition. Recommended weekly service.', false);

    RAISE NOTICE 'Created job notes';

    -- ============================================
    -- SUMMARY
    -- ============================================

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Company: Green Scene Landscaping';
    RAISE NOTICE 'Created: 5 services, 5 customers, 3 leads';
    RAISE NOTICE 'Created: 4 jobs with checklists';
    RAISE NOTICE 'Created: 2 quotes, 2 invoices';
    RAISE NOTICE 'Created: 2 time entries with breaks';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Login at: /auth/login';
    RAISE NOTICE 'Dashboard: /dashboard';
    RAISE NOTICE '========================================';

END $$;
