-- Recurring job templates
CREATE TABLE IF NOT EXISTS recurring_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  customer_id UUID REFERENCES customers(id),
  assigned_worker_ids UUID[] DEFAULT '{}',
  total_amount DECIMAL(10,2),
  priority VARCHAR(20) DEFAULT 'normal',
  -- Recurrence config
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'monthly', 'custom'
  interval_days INTEGER, -- for custom frequency
  day_of_week INTEGER, -- 0=Sun, 1=Mon, ... 6=Sat (for weekly/biweekly)
  day_of_month INTEGER, -- 1-28 (for monthly)
  preferred_time_start TIME DEFAULT '09:00',
  preferred_time_end TIME DEFAULT '10:00',
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  next_scheduled_date DATE,
  last_generated_date DATE,
  starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at DATE, -- null = no end
  max_occurrences INTEGER, -- null = unlimited
  occurrences_generated INTEGER DEFAULT 0,
  -- Invoicing
  auto_invoice BOOLEAN DEFAULT FALSE,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recurring_jobs_company ON recurring_jobs(company_id);
CREATE INDEX idx_recurring_jobs_next_date ON recurring_jobs(next_scheduled_date) WHERE is_active = TRUE;
