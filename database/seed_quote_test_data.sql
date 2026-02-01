-- ============================================
-- Quote Testing: Seed Test Customers and Quotes
-- Run this in Supabase SQL Editor
-- For user: missmv@gmail.com
-- ============================================

-- First, let's get the company_id for the user
DO $$
DECLARE
    v_company_id UUID;
    v_customer_john UUID;
    v_customer_sarah UUID;
    v_customer_mike UUID;
    v_customer_lisa UUID;
    v_customer_david UUID;
    v_quote_1 UUID;
    v_quote_2 UUID;
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
    -- INSERT 5 TEST CUSTOMERS
    -- ============================================

    -- Customer 1: John Martinez
    INSERT INTO customers (id, company_id, name, email, phone, address, city, state, zip, source)
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        'John Martinez',
        'john@test.com',
        '310-555-0101',
        '123 Main St',
        'Los Angeles',
        'CA',
        '90001',
        'test-data'
    )
    RETURNING id INTO v_customer_john;

    -- Customer 2: Sarah Chen
    INSERT INTO customers (id, company_id, name, email, phone, address, city, state, zip, source)
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        'Sarah Chen',
        'sarah@test.com',
        '818-555-0202',
        '456 Oak Ave',
        'Pasadena',
        'CA',
        '91101',
        'test-data'
    )
    RETURNING id INTO v_customer_sarah;

    -- Customer 3: Mike Thompson
    INSERT INTO customers (id, company_id, name, email, phone, address, city, state, zip, source)
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        'Mike Thompson',
        'mike@test.com',
        '949-555-0303',
        '789 Beach Blvd',
        'Newport Beach',
        'CA',
        '92660',
        'test-data'
    )
    RETURNING id INTO v_customer_mike;

    -- Customer 4: Lisa Rodriguez
    INSERT INTO customers (id, company_id, name, email, phone, address, city, state, zip, source)
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        'Lisa Rodriguez',
        'lisa@test.com',
        '619-555-0404',
        '321 Palm Dr',
        'San Diego',
        'CA',
        '92101',
        'test-data'
    )
    RETURNING id INTO v_customer_lisa;

    -- Customer 5: David Kim
    INSERT INTO customers (id, company_id, name, email, phone, address, city, state, zip, source)
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        'David Kim',
        'david@test.com',
        '408-555-0505',
        '555 Tech Way',
        'San Jose',
        'CA',
        '95110',
        'test-data'
    )
    RETURNING id INTO v_customer_david;

    RAISE NOTICE 'Inserted 5 test customers';

    -- ============================================
    -- INSERT QUOTE 1 (for John Martinez)
    -- Status: sent, Total: $225
    -- ============================================

    INSERT INTO quotes (
        id,
        company_id,
        customer_id,
        title,
        description,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        status,
        valid_until,
        sent_at,
        notes
    )
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        v_customer_john,
        'Lawn Care Services',
        'Regular lawn maintenance and hedge trimming for property at 123 Main St',
        225.00,
        0,
        0,
        225.00,
        'sent',
        CURRENT_DATE + INTERVAL '30 days',
        NOW() - INTERVAL '1 day',
        'Test quote for John Martinez'
    )
    RETURNING id INTO v_quote_1;

    -- Quote 1 Line Items
    INSERT INTO quote_items (quote_id, description, quantity, unit_price, total_price, sort_order)
    VALUES
        (v_quote_1, 'Lawn Maintenance', 1, 150.00, 150.00, 1),
        (v_quote_1, 'Hedge Trimming', 1, 75.00, 75.00, 2);

    RAISE NOTICE 'Inserted Quote 1 (sent) for John Martinez with 2 line items';

    -- ============================================
    -- INSERT QUOTE 2 (for Sarah Chen)
    -- Status: draft, Total: $700
    -- ============================================

    INSERT INTO quotes (
        id,
        company_id,
        customer_id,
        title,
        description,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        status,
        valid_until,
        notes
    )
    VALUES (
        uuid_generate_v4(),
        v_company_id,
        v_customer_sarah,
        'Landscape Design & Repair',
        'Design consultation and sprinkler repair for property at 456 Oak Ave',
        700.00,
        0,
        0,
        700.00,
        'draft',
        CURRENT_DATE + INTERVAL '30 days',
        'Test quote for Sarah Chen'
    )
    RETURNING id INTO v_quote_2;

    -- Quote 2 Line Items
    INSERT INTO quote_items (quote_id, description, quantity, unit_price, total_price, sort_order)
    VALUES
        (v_quote_2, 'Landscape Design Consultation', 1, 500.00, 500.00, 1),
        (v_quote_2, 'Sprinkler System Repair', 1, 200.00, 200.00, 2);

    RAISE NOTICE 'Inserted Quote 2 (draft) for Sarah Chen with 2 line items';

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SUCCESS: Inserted 5 customers and 2 quotes';
    RAISE NOTICE '============================================';

END $$;

-- ============================================
-- VERIFICATION QUERIES (run separately to check data)
-- ============================================

-- View inserted customers
-- SELECT id, name, email, phone, city, state FROM customers WHERE source = 'test-data';

-- View inserted quotes with customer names
-- SELECT q.quote_number, q.title, q.status, q.total, c.name as customer_name
-- FROM quotes q
-- JOIN customers c ON q.customer_id = c.id
-- WHERE c.source = 'test-data';

-- View quote line items
-- SELECT q.quote_number, qi.description, qi.quantity, qi.unit_price, qi.total_price
-- FROM quote_items qi
-- JOIN quotes q ON qi.quote_id = q.id
-- JOIN customers c ON q.customer_id = c.id
-- WHERE c.source = 'test-data'
-- ORDER BY q.quote_number, qi.sort_order;
