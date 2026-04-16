-- Outbound webhook subscriptions for Zapier/integration support
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url VARCHAR(2000) NOT NULL,
  secret VARCHAR(255), -- HMAC secret for signature verification
  events TEXT[] NOT NULL DEFAULT '{}', -- array of event types to subscribe to
  is_active BOOLEAN DEFAULT TRUE,
  description VARCHAR(255),
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_webhooks_company ON webhooks(company_id);
CREATE INDEX idx_webhook_logs_webhook ON webhook_logs(webhook_id, created_at DESC);
