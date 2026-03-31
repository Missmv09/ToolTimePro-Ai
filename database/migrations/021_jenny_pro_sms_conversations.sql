-- Jenny Pro: SMS Conversations & Voice Call Tracking
-- Tracks two-way SMS conversations and (future) inbound call logs

-- ============================================
-- SMS CONVERSATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_sms_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    customer_phone VARCHAR(50) NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(30) DEFAULT 'active', -- active, resolved, needs_response
    message_count INTEGER DEFAULT 0,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    source VARCHAR(50) DEFAULT 'inbound', -- inbound, booking_confirm, lead_followup, review_request
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jenny_sms_conv_company ON jenny_sms_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_jenny_sms_conv_phone ON jenny_sms_conversations(customer_phone);

-- ============================================
-- SMS MESSAGES (individual messages in a conversation)
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES jenny_sms_conversations(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    body TEXT NOT NULL,
    twilio_sid VARCHAR(100),
    status VARCHAR(30) DEFAULT 'sent', -- sent, delivered, failed, received
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jenny_sms_msg_conv ON jenny_sms_messages(conversation_id);

-- ============================================
-- VOICE CALL LOG (for future use when Twilio approved)
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_voice_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    caller_phone VARCHAR(50) NOT NULL,
    caller_name VARCHAR(255),
    duration_seconds INTEGER DEFAULT 0,
    call_type VARCHAR(30) DEFAULT 'inbound', -- inbound, outbound
    status VARCHAR(30) DEFAULT 'completed', -- ringing, in_progress, completed, missed, voicemail
    transcript TEXT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    booking_created BOOLEAN DEFAULT false,
    emergency BOOLEAN DEFAULT false,
    twilio_sid VARCHAR(100),
    recording_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jenny_voice_company ON jenny_voice_calls(company_id);

-- ============================================
-- JENNY PRO SETTINGS (per-company configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS jenny_pro_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    business_hours_greeting TEXT,
    after_hours_greeting TEXT,
    emergency_keywords TEXT[] DEFAULT ARRAY['emergency', 'urgent', 'burst', 'leak', 'flood', 'fire', 'broken'],
    escalation_phone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en', -- en, es, both
    auto_booking BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE jenny_sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenny_pro_settings ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only see their company's conversations
CREATE POLICY "Users see own company conversations"
    ON jenny_sms_conversations FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Messages: users can see messages from their company's conversations
CREATE POLICY "Users see own company messages"
    ON jenny_sms_messages FOR SELECT
    USING (conversation_id IN (
        SELECT id FROM jenny_sms_conversations
        WHERE company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    ));

-- Voice calls: users can only see their company's calls
CREATE POLICY "Users see own company calls"
    ON jenny_voice_calls FOR SELECT
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

-- Settings: users can view/edit their company's settings
CREATE POLICY "Users manage own company jenny pro settings"
    ON jenny_pro_settings FOR ALL
    USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));
