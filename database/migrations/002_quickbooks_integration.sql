-- QuickBooks Online Integration Migration
-- Run this in Supabase SQL Editor

-- ============================================
-- QBO CONNECTIONS (QuickBooks connection status per user)
-- ============================================
CREATE TABLE IF NOT EXISTS qbo_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    qbo_realm_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- QBO SYNC LOG (Sync log for troubleshooting)
-- ============================================
CREATE TABLE IF NOT EXISTS qbo_sync_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL,
    direction TEXT NOT NULL,
    record_id UUID,
    qbo_id TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ADD QBO SYNC FIELDS TO EXISTING TABLES
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qbo_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qbo_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_qbo_connections_user ON qbo_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_user ON qbo_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_status ON qbo_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_customers_qbo_id ON customers(qbo_id);
CREATE INDEX IF NOT EXISTS idx_invoices_qbo_id ON invoices(qbo_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own QBO connection
CREATE POLICY "Users see own QBO connection" ON qbo_connections
    FOR ALL USING (user_id = auth.uid());

-- Users can only see their own sync logs
CREATE POLICY "Users see own sync logs" ON qbo_sync_log
    FOR ALL USING (user_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_qbo_connections_updated_at BEFORE UPDATE ON qbo_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
