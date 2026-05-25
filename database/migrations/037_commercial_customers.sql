-- Migration: 037_commercial_customers.sql
-- Adds commercial customer support: residential/commercial type on customers,
-- business_name (DBA / legal entity for invoices), and PO number + payment
-- terms on invoices so contractors can bill commercial clients' AP departments
-- properly.
--
-- Non-breaking: all columns are nullable / have defaults, and existing UI
-- gracefully no-ops if a column is missing.

-- ============================================
-- CUSTOMERS: type + business name
-- ============================================

-- customer_type: 'residential' (default) or 'commercial'
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type VARCHAR(20) DEFAULT 'residential';

-- Backfill any nulls left by older rows
UPDATE customers SET customer_type = 'residential' WHERE customer_type IS NULL;

-- business_name: the entity name on the invoice when customer_type = 'commercial'
-- (the existing `name` column holds the primary on-site contact's name)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_customers_company_type
  ON customers (company_id, customer_type);

-- ============================================
-- INVOICES: PO number + payment terms
-- ============================================

-- po_number: customer's purchase order number — required by most commercial AP
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS po_number VARCHAR(100);

-- payment_terms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60'
-- Stored as text rather than enum to stay flexible without future migrations.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_invoices_po_number
  ON invoices (company_id, po_number) WHERE po_number IS NOT NULL;

-- ============================================
-- COMMENTS (for schema documentation)
-- ============================================
COMMENT ON COLUMN customers.customer_type IS 'residential | commercial - drives invoice formatting and filtering';
COMMENT ON COLUMN customers.business_name IS 'Legal entity / DBA shown on invoices when customer_type = commercial';
COMMENT ON COLUMN invoices.po_number IS 'Customer PO number - required by commercial AP departments to process payment';
COMMENT ON COLUMN invoices.payment_terms IS 'due_on_receipt | net_15 | net_30 | net_60 - auto-computes due_date';
