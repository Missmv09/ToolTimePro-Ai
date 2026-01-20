-- ============================================
-- Time Clock & California Compliance Migration
-- Run this in Supabase SQL Editor AFTER initial schema
-- ============================================

-- Add photo verification to time_entries
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS clock_in_photo_url TEXT,
ADD COLUMN IF NOT EXISTS clock_out_photo_url TEXT;

-- Add attestation fields to time_entries (for end-of-day attestation)
ALTER TABLE time_entries
ADD COLUMN IF NOT EXISTS attestation_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attestation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS attestation_signature TEXT, -- Base64 signature image
ADD COLUMN IF NOT EXISTS missed_meal_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS missed_meal_reason TEXT,
ADD COLUMN IF NOT EXISTS missed_rest_break BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS missed_rest_reason TEXT;

-- Add location tracking to breaks
ALTER TABLE breaks
ADD COLUMN IF NOT EXISTS location JSONB; -- {lat, lng, address}

-- ============================================
-- COMPLIANCE_ALERTS (Track violations and warnings)
-- ============================================
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL, -- meal_break_due, meal_break_missed, rest_break_due, overtime_warning, double_time_warning
    severity VARCHAR(20) DEFAULT 'warning', -- info, warning, violation
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hours_worked DECIMAL(5,2), -- Hours at time of alert
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for compliance alerts
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_company ON compliance_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_user ON compliance_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_date ON compliance_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_type ON compliance_alerts(alert_type);

-- Enable RLS
ALTER TABLE compliance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy for compliance_alerts
CREATE POLICY IF NOT EXISTS "Compliance alerts belong to company" ON compliance_alerts
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- OFFLINE_SYNC_QUEUE (For offline mode)
-- ============================================
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- clock_in, clock_out, break_start, break_end
    payload JSONB NOT NULL,
    created_offline_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When action was taken offline
    synced_at TIMESTAMP WITH TIME ZONE, -- When synced to server
    sync_status VARCHAR(20) DEFAULT 'pending', -- pending, synced, failed
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for sync queue
CREATE INDEX IF NOT EXISTS idx_offline_sync_company ON offline_sync_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_user ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_queue(sync_status);

-- Enable RLS
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policy for offline_sync_queue
CREATE POLICY IF NOT EXISTS "Sync queue belongs to company" ON offline_sync_queue
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- ============================================
-- Helper function: Calculate hours worked
-- ============================================
CREATE OR REPLACE FUNCTION calculate_hours_worked(entry_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    hours DECIMAL;
    entry_record RECORD;
    total_break_minutes INTEGER;
BEGIN
    SELECT clock_in, clock_out, break_minutes INTO entry_record
    FROM time_entries WHERE id = entry_id;

    IF entry_record.clock_out IS NULL THEN
        hours := EXTRACT(EPOCH FROM (NOW() - entry_record.clock_in)) / 3600;
    ELSE
        hours := EXTRACT(EPOCH FROM (entry_record.clock_out - entry_record.clock_in)) / 3600;
    END IF;

    -- Subtract breaks
    total_break_minutes := COALESCE(entry_record.break_minutes, 0);
    hours := hours - (total_break_minutes::DECIMAL / 60);

    RETURN ROUND(hours::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-create compliance alerts
-- ============================================
CREATE OR REPLACE FUNCTION check_compliance_on_update()
RETURNS TRIGGER AS $$
DECLARE
    hours_worked DECIMAL;
    alert_exists BOOLEAN;
BEGIN
    -- Only check if entry is active (no clock_out yet)
    IF NEW.clock_out IS NULL THEN
        hours_worked := EXTRACT(EPOCH FROM (NOW() - NEW.clock_in)) / 3600;

        -- Check for 5-hour meal break requirement
        IF hours_worked >= 5 THEN
            SELECT EXISTS(
                SELECT 1 FROM compliance_alerts
                WHERE time_entry_id = NEW.id
                AND alert_type = 'meal_break_due'
            ) INTO alert_exists;

            IF NOT alert_exists THEN
                -- Check if they took a meal break
                IF NOT EXISTS(SELECT 1 FROM breaks WHERE time_entry_id = NEW.id AND break_type = 'meal' AND break_end IS NOT NULL) THEN
                    INSERT INTO compliance_alerts (company_id, user_id, time_entry_id, alert_type, severity, title, description, hours_worked)
                    VALUES (
                        NEW.company_id,
                        NEW.user_id,
                        NEW.id,
                        'meal_break_missed',
                        'violation',
                        'Meal Break Violation',
                        'Employee worked over 5 hours without a 30-minute meal break',
                        hours_worked
                    );
                END IF;
            END IF;
        END IF;

        -- Check for overtime (8 hours)
        IF hours_worked >= 8 THEN
            SELECT EXISTS(
                SELECT 1 FROM compliance_alerts
                WHERE time_entry_id = NEW.id
                AND alert_type = 'overtime_warning'
            ) INTO alert_exists;

            IF NOT alert_exists THEN
                INSERT INTO compliance_alerts (company_id, user_id, time_entry_id, alert_type, severity, title, description, hours_worked)
                VALUES (
                    NEW.company_id,
                    NEW.user_id,
                    NEW.id,
                    'overtime_warning',
                    'info',
                    'Overtime Started',
                    'Employee has worked 8+ hours - overtime pay applies',
                    hours_worked
                );
            END IF;
        END IF;

        -- Check for double time (12 hours)
        IF hours_worked >= 12 THEN
            SELECT EXISTS(
                SELECT 1 FROM compliance_alerts
                WHERE time_entry_id = NEW.id
                AND alert_type = 'double_time_warning'
            ) INTO alert_exists;

            IF NOT alert_exists THEN
                INSERT INTO compliance_alerts (company_id, user_id, time_entry_id, alert_type, severity, title, description, hours_worked)
                VALUES (
                    NEW.company_id,
                    NEW.user_id,
                    NEW.id,
                    'double_time_warning',
                    'warning',
                    'Double Time Started',
                    'Employee has worked 12+ hours - double time pay applies',
                    hours_worked
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would run on every update which may not be ideal
-- Consider using a scheduled function instead for production
-- CREATE TRIGGER check_compliance_trigger AFTER UPDATE ON time_entries
--     FOR EACH ROW EXECUTE FUNCTION check_compliance_on_update();
