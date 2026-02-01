-- ============================================
-- Workers and Pricing Test Data
-- Run this in Supabase SQL Editor
-- For user: missmv@gmail.com
-- ============================================

DO $$
DECLARE
    v_company_id UUID;
    v_worker_carlos UUID;
    v_worker_maria UUID;
    v_worker_james UUID;
    v_job_weekly_maintenance UUID;
    v_job_backyard_redesign UUID;
BEGIN
    -- Get company_id for missmv@gmail.com
    SELECT company_id INTO v_company_id
    FROM users
    WHERE email = 'missmv@gmail.com';

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'User missmv@gmail.com not found or has no company_id';
    END IF;

    RAISE NOTICE 'Found company_id: %', v_company_id;

    -- ============================================
    -- STEP 1: Create auth.users entries for workers
    -- ============================================

    -- Generate UUIDs for workers
    v_worker_carlos := uuid_generate_v4();
    v_worker_maria := uuid_generate_v4();
    v_worker_james := uuid_generate_v4();

    -- Insert into auth.users (minimal entries for test workers)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    )
    VALUES
        (
            v_worker_carlos,
            '00000000-0000-0000-0000-000000000000',
            'carlos@tooltimepro.com',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Carlos Ramirez"}',
            'authenticated',
            'authenticated'
        ),
        (
            v_worker_maria,
            '00000000-0000-0000-0000-000000000000',
            'maria@tooltimepro.com',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "Maria Santos"}',
            'authenticated',
            'authenticated'
        ),
        (
            v_worker_james,
            '00000000-0000-0000-0000-000000000000',
            'james@tooltimepro.com',
            crypt('testpassword123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"full_name": "James Wilson"}',
            'authenticated',
            'authenticated'
        );

    RAISE NOTICE 'Created 3 auth.users entries';

    -- ============================================
    -- STEP 2: Create user profiles for workers
    -- ============================================

    INSERT INTO users (id, company_id, email, full_name, phone, role, hourly_rate, is_active)
    VALUES
        (
            v_worker_carlos,
            v_company_id,
            'carlos@tooltimepro.com',
            'Carlos Ramirez',
            '310-555-0601',
            'worker',
            25.00,
            true
        ),
        (
            v_worker_maria,
            v_company_id,
            'maria@tooltimepro.com',
            'Maria Santos',
            '310-555-0602',
            'worker',
            28.00,
            true
        ),
        (
            v_worker_james,
            v_company_id,
            'james@tooltimepro.com',
            'James Wilson',
            '310-555-0603',
            'worker',
            35.00,
            true
        );

    RAISE NOTICE 'Created 3 worker profiles';

    -- ============================================
    -- STEP 3: Update job prices
    -- ============================================

    -- Sprinkler Repair: $175.00
    UPDATE jobs
    SET total_amount = 175.00
    WHERE company_id = v_company_id AND title = 'Sprinkler Repair';

    -- Backyard Redesign: $2500.00
    UPDATE jobs
    SET total_amount = 2500.00
    WHERE company_id = v_company_id AND title = 'Backyard Redesign';

    -- Hedge Trimming & Cleanup: $225.00
    UPDATE jobs
    SET total_amount = 225.00
    WHERE company_id = v_company_id AND title = 'Hedge Trimming & Cleanup';

    -- Weekly Lawn Maintenance: $85.00
    UPDATE jobs
    SET total_amount = 85.00
    WHERE company_id = v_company_id AND title = 'Weekly Lawn Maintenance';

    -- Weekly Lawn Service: $85.00
    UPDATE jobs
    SET total_amount = 85.00
    WHERE company_id = v_company_id AND title = 'Weekly Lawn Service';

    -- Emergency Sprinkler Repair: $250.00
    UPDATE jobs
    SET total_amount = 250.00
    WHERE company_id = v_company_id AND title = 'Emergency Sprinkler Repair';

    -- Tree Trimming: $450.00
    UPDATE jobs
    SET total_amount = 450.00
    WHERE company_id = v_company_id AND title = 'Tree Trimming';

    RAISE NOTICE 'Updated job prices';

    -- ============================================
    -- STEP 4: Assign workers to jobs
    -- ============================================

    -- Get job IDs
    SELECT id INTO v_job_weekly_maintenance FROM jobs
    WHERE company_id = v_company_id AND title = 'Weekly Lawn Maintenance' LIMIT 1;

    SELECT id INTO v_job_backyard_redesign FROM jobs
    WHERE company_id = v_company_id AND title = 'Backyard Redesign' LIMIT 1;

    -- Assign Carlos to Weekly Lawn Maintenance
    IF v_job_weekly_maintenance IS NOT NULL THEN
        INSERT INTO job_assignments (job_id, user_id, is_lead)
        VALUES (v_job_weekly_maintenance, v_worker_carlos, false)
        ON CONFLICT (job_id, user_id) DO NOTHING;
        RAISE NOTICE 'Assigned Carlos to Weekly Lawn Maintenance';
    ELSE
        RAISE NOTICE 'Job "Weekly Lawn Maintenance" not found';
    END IF;

    -- Assign James (crew lead) to Backyard Redesign
    IF v_job_backyard_redesign IS NOT NULL THEN
        INSERT INTO job_assignments (job_id, user_id, is_lead)
        VALUES (v_job_backyard_redesign, v_worker_james, true)
        ON CONFLICT (job_id, user_id) DO NOTHING;
        RAISE NOTICE 'Assigned James (as lead) to Backyard Redesign';
    ELSE
        RAISE NOTICE 'Job "Backyard Redesign" not found';
    END IF;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SUCCESS: Created workers, updated prices, assigned jobs';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Workers created:';
    RAISE NOTICE '  - Carlos Ramirez ($25/hr) - field_worker';
    RAISE NOTICE '  - Maria Santos ($28/hr) - field_worker';
    RAISE NOTICE '  - James Wilson ($35/hr) - crew_lead';
    RAISE NOTICE '============================================';

END $$;

-- ============================================
-- VERIFICATION QUERIES (run separately)
-- ============================================

-- View workers
-- SELECT full_name, email, role, hourly_rate FROM users WHERE email LIKE '%@tooltimepro.com';

-- View job prices
-- SELECT title, total_amount, status FROM jobs ORDER BY scheduled_date;

-- View job assignments
-- SELECT j.title, u.full_name, ja.is_lead
-- FROM job_assignments ja
-- JOIN jobs j ON ja.job_id = j.id
-- JOIN users u ON ja.user_id = u.id;
