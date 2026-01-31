-- ============================================
-- Chatbot Bookings Migration
-- Run this in Supabase SQL Editor AFTER initial schema
-- Adds persistent storage for ToolTime Assistant bookings
-- ============================================

-- ============================================
-- CHATBOT_BOOKINGS (Store bookings from AI chatbot)
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time VARCHAR(10) NOT NULL, -- 24h format: "10:00", "14:30"
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    service TEXT,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled, no_show
    source VARCHAR(50) DEFAULT 'chatbot', -- chatbot, widget, api
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Link to converted lead
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL, -- Link to created job
    confirmed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chatbot_bookings_company ON chatbot_bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_bookings_date ON chatbot_bookings(date);
CREATE INDEX IF NOT EXISTS idx_chatbot_bookings_status ON chatbot_bookings(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_bookings_phone ON chatbot_bookings(phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_bookings_date_time ON chatbot_bookings(date, time);

-- Unique constraint to prevent double-booking same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_bookings_unique_slot
    ON chatbot_bookings(company_id, date, time)
    WHERE status IN ('scheduled', 'confirmed');

-- Enable Row Level Security
ALTER TABLE chatbot_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see bookings from their company
CREATE POLICY "Chatbot bookings belong to company" ON chatbot_bookings
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- RLS Policy: Allow anonymous inserts for public chatbot widget
-- The chatbot function will set the company_id based on widget configuration
CREATE POLICY "Allow anonymous chatbot inserts" ON chatbot_bookings
    FOR INSERT WITH CHECK (true);

-- ============================================
-- CHATBOT_CONVERSATIONS (Optional: Store chat history)
-- ============================================
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL, -- Browser session identifier
    booking_id UUID REFERENCES chatbot_bookings(id) ON DELETE SET NULL,
    messages JSONB DEFAULT '[]', -- Array of {role, content, timestamp}
    lead_captured BOOLEAN DEFAULT false,
    phone_captured VARCHAR(50),
    booking_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_company ON chatbot_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session ON chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_lead ON chatbot_conversations(lead_captured);

-- Enable RLS
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policy for conversations
CREATE POLICY "Chatbot conversations belong to company" ON chatbot_conversations
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Allow anonymous inserts for public chatbot
CREATE POLICY "Allow anonymous conversation inserts" ON chatbot_conversations
    FOR INSERT WITH CHECK (true);

-- ============================================
-- Helper function: Update timestamp on modification
-- ============================================
CREATE OR REPLACE FUNCTION update_chatbot_booking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_chatbot_booking_timestamp ON chatbot_bookings;
CREATE TRIGGER update_chatbot_booking_timestamp
    BEFORE UPDATE ON chatbot_bookings
    FOR EACH ROW EXECUTE FUNCTION update_chatbot_booking_timestamp();

-- ============================================
-- Helper function: Auto-create lead from booking
-- ============================================
CREATE OR REPLACE FUNCTION create_lead_from_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create lead if one doesn't exist
    IF NEW.lead_id IS NULL AND NEW.status = 'scheduled' THEN
        INSERT INTO leads (company_id, name, phone, email, service_requested, source, status, created_at)
        VALUES (
            NEW.company_id,
            NEW.name,
            NEW.phone,
            NEW.email,
            NEW.service,
            'chatbot',
            'new',
            NOW()
        )
        RETURNING id INTO NEW.lead_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create leads (optional - uncomment if desired)
-- DROP TRIGGER IF EXISTS create_lead_from_booking ON chatbot_bookings;
-- CREATE TRIGGER create_lead_from_booking
--     BEFORE INSERT ON chatbot_bookings
--     FOR EACH ROW EXECUTE FUNCTION create_lead_from_booking();
