-- Let each contractor teach Jenny about their business — pricing, service area,
-- hours, specials, and tone. This text is injected into Jenny's prompt so her
-- SMS + voice replies are accurate and on-brand (the practical "improve Jenny"
-- lever the operator controls).

ALTER TABLE jenny_pro_settings
  ADD COLUMN IF NOT EXISTS business_info TEXT;
