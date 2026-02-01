-- ============================================
-- Test Jobs Seed Data
-- Run this in Supabase SQL Editor
-- For user: missmv@gmail.com
-- ============================================

DO $$
DECLARE
    v_company_id UUID;
    v_customer_john UUID;
    v_customer_sarah UUID;
    v_customer_mike UUID;
    v_customer_lisa UUID;
BEGIN
    -- Get company_id for missmv@gmail.com
    SELECT company_id INTO v_company_id
    FROM users
    WHERE email = 'missmv@gmail.com';

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User missmv@gmail.com not found or has no company_id';
    END IF;

    RAISE NOTICE 'Found company_id: %', v_company_id;

    -- Get existing customer IDs
    SELECT id INTO v_customer_john FROM customers
    WHERE company_id = v_company_id AND name = 'John Martinez' LIMIT 1;

    SELECT id INTO v_customer_sarah FROM customers
    WHERE company_id = v_company_id AND name = 'Sarah Chen' LIMIT 1;

    SELECT id INTO v_customer_mike FROM customers
    WHERE company_id = v_company_id AND name = 'Mike Thompson' LIMIT 1;

    SELECT id INTO v_customer_lisa FROM customers
    WHERE company_id = v_company_id AND name = 'Lisa Rodriguez' LIMIT 1;

    -- Verify all customers exist
    IF v_customer_john IS NULL THEN
        RAISE EXCEPTION 'Customer John Martinez not found';
    END IF;
    IF v_customer_sarah IS NULL THEN
        RAISE EXCEPTION 'Customer Sarah Chen not found';
    END IF;
    IF v_customer_mike IS NULL THEN
        RAISE EXCEPTION 'Customer Mike Thompson not found';
    END IF;
    IF v_customer_lisa IS NULL THEN
        RAISE EXCEPTION 'Customer Lisa Rodriguez not found';
    END IF;

    RAISE NOTICE 'Found all 4 customers';

    -- ============================================
    -- INSERT 4 TEST JOBS
    -- ============================================

    -- Job 1: Weekly Lawn Service (John Martinez) - scheduled for tomorrow
    INSERT INTO jobs (
        company_id, customer_id, title, description,
        address, city, state, zip,
        scheduled_date, status, priority
    )
    VALUES (
        v_company_id,
        v_customer_john,
        'Weekly Lawn Service',
        'Regular weekly lawn maintenance service',
        '123 Main St',
        'Los Angeles',
        'CA',
        '90001',
        CURRENT_DATE + INTERVAL '1 day',
        'scheduled',
        'normal'
    );

    RAISE NOTICE 'Inserted Job 1: Weekly Lawn Service (scheduled for tomorrow)';

    -- Job 2: Backyard Redesign (Sarah Chen) - in_progress today
    INSERT INTO jobs (
        company_id, customer_id, title, description,
        address, city, state, zip,
        scheduled_date, status, priority
    )
    VALUES (
        v_company_id,
        v_customer_sarah,
        'Backyard Redesign',
        'Complete backyard landscape redesign project',
        '456 Oak Ave',
        'Pasadena',
        'CA',
        '91101',
        CURRENT_DATE,
        'in_progress',
        'high'
    );

    RAISE NOTICE 'Inserted Job 2: Backyard Redesign (in_progress today)';

    -- Job 3: Sprinkler Repair (Mike Thompson) - completed yesterday
    INSERT INTO jobs (
        company_id, customer_id, title, description,
        address, city, state, zip,
        scheduled_date, status, priority
    )
    VALUES (
        v_company_id,
        v_customer_mike,
        'Sprinkler Repair',
        'Repair and replace faulty sprinkler heads',
        '789 Beach Blvd',
        'Newport Beach',
        'CA',
        '92660',
        CURRENT_DATE - INTERVAL '1 day',
        'completed',
        'normal'
    );

    RAISE NOTICE 'Inserted Job 3: Sprinkler Repair (completed yesterday)';

    -- Job 4: Tree Trimming (Lisa Rodriguez) - scheduled for next week
    INSERT INTO jobs (
        company_id, customer_id, title, description,
        address, city, state, zip,
        scheduled_date, status, priority
    )
    VALUES (
        v_company_id,
        v_customer_lisa,
        'Tree Trimming',
        'Trim and shape trees in front and backyard',
        '321 Palm Dr',
        'San Diego',
        'CA',
        '92101',
        CURRENT_DATE + INTERVAL '7 days',
        'scheduled',
        'normal'
    );

    RAISE NOTICE 'Inserted Job 4: Tree Trimming (scheduled for next week)';

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SUCCESS: Inserted 4 test jobs';
    RAISE NOTICE '============================================';

END $$;

-- ============================================
-- VERIFICATION QUERY (run separately to check data)
-- ============================================

-- SELECT j.title, c.name as customer, j.status, j.scheduled_date, j.address, j.city
-- FROM jobs j
-- JOIN customers c ON j.customer_id = c.id
-- WHERE c.source = 'test-data'
-- ORDER BY j.scheduled_date;
