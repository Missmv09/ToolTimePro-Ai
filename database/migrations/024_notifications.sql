CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'new_lead', 'job_assigned', 'invoice_paid', 'invoice_overdue', 'compliance_alert', 'review_received', 'booking_received', 'worker_clock_in', 'quote_accepted', 'quote_expired'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500), -- where to navigate on click
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id);
