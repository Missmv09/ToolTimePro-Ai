-- Migration: Add quote reminder settings to companies
-- Enables automated daily digest emails and real-time view alerts for quote follow-ups

ALTER TABLE companies ADD COLUMN IF NOT EXISTS quote_reminder_settings JSONB DEFAULT '{
  "enabled": true,
  "email_enabled": true,
  "sms_enabled": false,
  "sms_phone": null,
  "stale_days": 3,
  "view_alerts": true
}'::jsonb;
