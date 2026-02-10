-- Platform Admin table
-- Tracks which users have vendor-level (platform) admin access to manage all companies
-- This is separate from the per-company admin/owner roles

CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'admin', -- admin, super_admin
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_platform_admins_email ON platform_admins(email);
CREATE INDEX IF NOT EXISTS idx_platform_admins_user_id ON platform_admins(user_id);

-- RLS: Only service role can access this table (no client-side access)
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role key can read/write
-- This is intentional: platform admin checks happen server-side only

-- Auto-update timestamp
CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON platform_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
