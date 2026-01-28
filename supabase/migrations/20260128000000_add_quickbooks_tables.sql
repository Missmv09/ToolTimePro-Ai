-- QuickBooks Integration Tables
-- Run this migration in your Supabase SQL editor

-- QuickBooks Connections table
-- Stores OAuth tokens and connection status for each user
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
  UNIQUE(user_id)
);

-- QuickBooks Sync Log table
-- Tracks sync operations for debugging and audit
CREATE TABLE IF NOT EXISTS qbo_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'customer', 'invoice', 'payment'
  direction TEXT NOT NULL, -- 'push' or 'pull'
  record_id UUID, -- Local record ID
  qbo_id TEXT, -- QuickBooks record ID
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add QuickBooks ID columns to existing tables
-- This allows us to track which local records are synced to QuickBooks

-- Add qbo_id to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS qbo_id TEXT;

-- Add qbo_id to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS qbo_id TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_qbo_connections_user_id ON qbo_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_user_id ON qbo_sync_log(user_id);
CREATE INDEX IF NOT EXISTS idx_qbo_sync_log_created_at ON qbo_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_qbo_id ON customers(qbo_id) WHERE qbo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_qbo_id ON invoices(qbo_id) WHERE qbo_id IS NOT NULL;

-- Row Level Security (RLS) policies
-- Users can only see their own QBO connections

ALTER TABLE qbo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qbo_sync_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own connections
CREATE POLICY "Users can view own qbo_connections" ON qbo_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own connections
CREATE POLICY "Users can insert own qbo_connections" ON qbo_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own connections
CREATE POLICY "Users can update own qbo_connections" ON qbo_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own connections
CREATE POLICY "Users can delete own qbo_connections" ON qbo_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Users can view their own sync logs
CREATE POLICY "Users can view own qbo_sync_log" ON qbo_sync_log
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own sync logs
CREATE POLICY "Users can insert own qbo_sync_log" ON qbo_sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
