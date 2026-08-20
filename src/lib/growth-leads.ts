/**
 * Growth lead capture — validation and normalization.
 *
 * Pure functions, no I/O, so they can be unit-tested without a server. The API
 * route (src/app/api/growth/lead/route.ts) owns the database work; everything
 * about *what counts as a valid lead* lives here.
 */

/**
 * Where a lead came from. First-touch only — see the note on
 * growth_leads.source in migration 048.
 *
 * Keep in sync with the CHECK-free `source` column: we validate in app code
 * rather than the database so adding a source doesn't require a migration.
 */
export const LEAD_SOURCES = [
  'tool_final_wage',
  'tool_calculator',
  'tool_checklist',
  'tool_classification',
  'newsletter',
  'blog',
  'pricing',
  'demo',
  'compare',
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export function isValidLeadSource(value: unknown): value is LeadSource {
  return typeof value === 'string' && (LEAD_SOURCES as readonly string[]).includes(value);
}

/**
 * Email validation.
 *
 * Deliberately permissive — the only thing worth rejecting here is input that
 * clearly cannot be delivered to. Over-strict regexes reject valid addresses
 * (plus-addressing, long TLDs, apostrophes) and a rejected real lead costs far
 * more than a bounced send.
 */
const EMAIL_PATTERN = /^[^\s@,;:<>()[\]\\]+@[^\s@,;:<>()[\]\\.]+(\.[^\s@,;:<>()[\]\\.]+)+$/;

/** Max lengths, mirroring what the columns and a sane UI accept. */
const MAX_EMAIL_LENGTH = 254; // RFC 5321
const MAX_NAME_LENGTH = 200;
const MAX_TEXT_LENGTH = 500;

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_PATTERN.test(trimmed);
}

/**
 * Lowercase and trim. The unique index in migration 048 is on `lower(email)`,
 * so storing the normalized form keeps reads and writes consistent.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Trim a free-text field to a bounded length, or drop it if empty. */
function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, maxLength);
}

/** Optional URL-ish field. Stored for attribution, so cap it and drop junk. */
function cleanUrl(value: unknown): string | null {
  const text = cleanText(value, MAX_TEXT_LENGTH);
  if (!text) return null;
  // Accept absolute URLs and root-relative paths; anything else is noise.
  if (text.startsWith('/')) return text;
  if (/^https?:\/\//i.test(text)) return text;
  return null;
}

/**
 * Click IDs are opaque platform-generated tokens. They are URL-safe by
 * construction, so anything containing characters that cannot appear in one is
 * not a click ID and would only pollute the conversion upload.
 */
const CLICK_ID_PATTERN = /^[A-Za-z0-9_.\-]{1,512}$/;

function cleanClickId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !CLICK_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

/**
 * Accept a small flat object of tool output and nothing else.
 *
 * Bounded on purpose: this lands in a JSONB column and is rendered into an
 * email, so a nested or oversized payload is rejected rather than stored.
 */
const MAX_RESULT_KEYS = 20;

function cleanResultData(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
    .slice(0, MAX_RESULT_KEYS)
    .map(([k, v]) => [k, typeof v === 'string' ? v.slice(0, MAX_TEXT_LENGTH) : v]);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export interface LeadInput {
  email: string;
  source: LeadSource;
  sourceDetail: string | null;
  name: string | null;
  companyName: string | null;
  trade: string | null;
  marketingConsent: boolean;
  landingPage: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  // Ad platform click IDs. Google requires exactly one of these on an
  // uploaded conversion; see migration 049.
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  /**
   * The tool output the visitor just saw, echoed back so the result email can
   * contain their actual numbers. Browser-supplied and therefore untrusted —
   * buildToolResultEmail coerces every field it reads.
   */
  resultData: Record<string, unknown> | null;
}

export type ValidationResult =
  | { valid: true; data: LeadInput }
  | { valid: false; error: string };

/**
 * Validate and normalize a raw request body into a lead we can store.
 *
 * Returns the first problem rather than a list — this backs a single-field
 * form, so there is only ever one thing to fix.
 */
export function validateLeadInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const raw = body as Record<string, unknown>;

  if (!isValidEmail(raw.email)) {
    return { valid: false, error: 'A valid email address is required' };
  }

  if (!isValidLeadSource(raw.source)) {
    return { valid: false, error: 'A recognized source is required' };
  }

  return {
    valid: true,
    data: {
      email: normalizeEmail(raw.email as string),
      source: raw.source,
      sourceDetail: cleanText(raw.sourceDetail, MAX_TEXT_LENGTH),
      name: cleanText(raw.name, MAX_NAME_LENGTH),
      companyName: cleanText(raw.companyName, MAX_NAME_LENGTH),
      trade: cleanText(raw.trade, MAX_NAME_LENGTH),
      // Consent must be an explicit boolean true. Anything else — missing,
      // "false", 0, "on" — is treated as no consent. Defaulting this the
      // other way is how people end up sending unsolicited mail.
      marketingConsent: raw.marketingConsent === true,
      landingPage: cleanUrl(raw.landingPage),
      referrer: cleanUrl(raw.referrer),
      utmSource: cleanText(raw.utmSource, MAX_TEXT_LENGTH),
      utmMedium: cleanText(raw.utmMedium, MAX_TEXT_LENGTH),
      utmCampaign: cleanText(raw.utmCampaign, MAX_TEXT_LENGTH),
      utmTerm: cleanText(raw.utmTerm, MAX_TEXT_LENGTH),
      utmContent: cleanText(raw.utmContent, MAX_TEXT_LENGTH),
      gclid: cleanClickId(raw.gclid),
      gbraid: cleanClickId(raw.gbraid),
      wbraid: cleanClickId(raw.wbraid),
      resultData: cleanResultData(raw.resultData),
    },
  };
}

/**
 * Build the row for a brand-new lead.
 */
export function buildLeadRecord(input: LeadInput, now: string): Record<string, unknown> {
  return {
    email: input.email,
    name: input.name,
    company_name: input.companyName,
    trade: input.trade,
    source: input.source,
    source_detail: input.sourceDetail,
    landing_page: input.landingPage,
    referrer: input.referrer,
    utm_source: input.utmSource,
    utm_medium: input.utmMedium,
    utm_campaign: input.utmCampaign,
    utm_term: input.utmTerm,
    utm_content: input.utmContent,
    gclid: input.gclid,
    gbraid: input.gbraid,
    wbraid: input.wbraid,
    marketing_consent: input.marketingConsent,
    marketing_consent_at: input.marketingConsent ? now : null,
    status: 'new',
    metadata: {
      touches: [buildTouch(input, now)],
      ...(input.resultData ? { last_result: input.resultData } : {}),
    },
    first_seen_at: now,
    last_seen_at: now,
  };
}

/**
 * Build the patch for a lead we've already seen.
 *
 * First-touch attribution columns are intentionally absent: the source that
 * first brought someone in is the number the growth agent optimizes against,
 * so a later visit must not overwrite it. The new touch is appended to
 * metadata.touches instead, which keeps the full path available.
 *
 * Consent is upgrade-only for the same reason it defaults to false — someone
 * opting in on a second visit counts, but a later form submitted without the
 * box ticked does not silently revoke it (that's what unsubscribe is for).
 *
 * Click IDs are the one attribution field that DOES get overwritten. Google
 * attributes a conversion to the last ad click, so if someone returns via a
 * newer ad, that newer click is the one to report. A visit with no click ID
 * leaves the stored one alone rather than clearing it — organic browsing
 * between the ad click and the conversion must not erase the ad click.
 */
export function buildLeadUpdate(
  input: LeadInput,
  existing: { metadata?: unknown; marketing_consent?: boolean } | null,
  now: string
): Record<string, unknown> {
  const existingMetadata =
    existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};

  const existingTouches = Array.isArray(existingMetadata.touches) ? existingMetadata.touches : [];

  // Cap stored touches so a bot or an obsessive refresher can't grow one row
  // without bound. The most recent 20 are plenty to reconstruct a path.
  const touches = [...existingTouches, buildTouch(input, now)].slice(-20);

  const alreadyConsented = existing?.marketing_consent === true;
  const consent = alreadyConsented || input.marketingConsent;

  const update: Record<string, unknown> = {
    last_seen_at: now,
    metadata: {
      ...existingMetadata,
      touches,
      // Keep the newest result so a failed email send stays recoverable.
      ...(input.resultData ? { last_result: input.resultData } : {}),
    },
    marketing_consent: consent,
  };

  // Only stamp the consent timestamp on the transition into consent.
  if (!alreadyConsented && input.marketingConsent) {
    update.marketing_consent_at = now;
  }

  // Last ad click wins — see the note above.
  if (input.gclid) update.gclid = input.gclid;
  if (input.gbraid) update.gbraid = input.gbraid;
  if (input.wbraid) update.wbraid = input.wbraid;

  // Fill in details we didn't have before, without clobbering what we did.
  if (input.name) update.name = input.name;
  if (input.companyName) update.company_name = input.companyName;
  if (input.trade) update.trade = input.trade;

  return update;
}

function buildTouch(input: LeadInput, now: string): Record<string, unknown> {
  return {
    at: now,
    source: input.source,
    source_detail: input.sourceDetail,
    landing_page: input.landingPage,
    utm_campaign: input.utmCampaign,
    click_id: input.gclid || input.gbraid || input.wbraid || null,
  };
}
