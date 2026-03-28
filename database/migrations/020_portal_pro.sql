-- ============================================================
-- Migration 020: Customer Portal Pro
-- Messages (customer-contractor threads) and Documents vault
-- ============================================================

-- ============================================================
-- PORTAL MESSAGES: Customer-contractor message threads per job
-- ============================================================
CREATE TABLE IF NOT EXISTS portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'contractor')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PORTAL DOCUMENTS: Contracts, warranties, permits, receipts
-- ============================================================
CREATE TABLE IF NOT EXISTS portal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'warranty', 'permit', 'receipt', 'photo', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  uploaded_by_type TEXT NOT NULL CHECK (uploaded_by_type IN ('customer', 'contractor')),
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_portal_messages_company ON portal_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_customer ON portal_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_job ON portal_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_portal_messages_unread ON portal_messages(customer_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_portal_documents_company ON portal_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_customer ON portal_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_documents_job ON portal_documents(job_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE portal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_documents ENABLE ROW LEVEL SECURITY;

-- Service role (API) can access all
CREATE POLICY "portal_messages_service_access" ON portal_messages
  FOR ALL USING (true);

CREATE POLICY "portal_documents_service_access" ON portal_documents
  FOR ALL USING (true);
