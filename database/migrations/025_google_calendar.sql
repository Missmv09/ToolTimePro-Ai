-- Google Calendar integration: connection tokens and job sync tracking
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add gcal_event_id to jobs for sync tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gcal_event_id VARCHAR(255);
