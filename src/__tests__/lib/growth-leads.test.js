/**
 * Tests for growth lead validation and normalization.
 *
 * These back the public lead capture endpoint, so the cases that matter most
 * are the ones with consequences outside the app: consent handling (mailing
 * someone who never opted in) and first-touch attribution (the numbers the
 * growth agent will make decisions from).
 */

import {
  LEAD_SOURCES,
  isValidEmail,
  isValidLeadSource,
  normalizeEmail,
  validateLeadInput,
  buildLeadRecord,
  buildLeadUpdate,
} from '@/lib/growth-leads';

const NOW = '2026-08-17T12:00:00.000Z';

function validInput(overrides = {}) {
  return {
    email: 'Contractor@Example.com',
    source: 'tool_calculator',
    ...overrides,
  };
}

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('someone@example.com')).toBe(true);
    expect(isValidEmail('first.last@sub.example.co.uk')).toBe(true);
  });

  it('accepts plus-addressing rather than rejecting real leads', () => {
    expect(isValidEmail('someone+tools@example.com')).toBe(true);
  });

  it('rejects input that cannot be delivered to', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('no@tld')).toBe(false);
    expect(isValidEmail('two@@example.com')).toBe(false);
    expect(isValidEmail('spaces in@example.com')).toBe(false);
  });

  it('rejects non-strings and over-long input', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(42)).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('lowercases and trims so it matches the unique index on lower(email)', () => {
    expect(normalizeEmail('  Contractor@Example.COM ')).toBe('contractor@example.com');
  });
});

describe('isValidLeadSource', () => {
  it('accepts every declared source', () => {
    for (const source of LEAD_SOURCES) {
      expect(isValidLeadSource(source)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isValidLeadSource('tool_unknown')).toBe(false);
    expect(isValidLeadSource('')).toBe(false);
    expect(isValidLeadSource(undefined)).toBe(false);
  });
});

describe('validateLeadInput', () => {
  it('normalizes a valid submission', () => {
    const result = validateLeadInput(validInput());
    expect(result.valid).toBe(true);
    expect(result.data.email).toBe('contractor@example.com');
    expect(result.data.source).toBe('tool_calculator');
  });

  it('rejects a missing or malformed email', () => {
    expect(validateLeadInput({ source: 'blog' }).valid).toBe(false);
    expect(validateLeadInput(validInput({ email: 'nope' })).valid).toBe(false);
  });

  it('rejects an unrecognized source', () => {
    expect(validateLeadInput(validInput({ source: 'somewhere_else' })).valid).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(validateLeadInput(null).valid).toBe(false);
    expect(validateLeadInput('email=x').valid).toBe(false);
  });

  // Consent is the one field where a permissive default means mailing people
  // who never asked for it, so only boolean true counts.
  it.each([
    ['missing', undefined],
    ['the string "true"', 'true'],
    ['the string "on"', 'on'],
    ['the number 1', 1],
    ['explicit false', false],
  ])('treats %s as no consent', (_label, value) => {
    const result = validateLeadInput(validInput({ marketingConsent: value }));
    expect(result.valid).toBe(true);
    expect(result.data.marketingConsent).toBe(false);
  });

  it('records consent when it is explicitly true', () => {
    const result = validateLeadInput(validInput({ marketingConsent: true }));
    expect(result.data.marketingConsent).toBe(true);
  });

  it('drops referrer and landing page values that are not URL-ish', () => {
    const result = validateLeadInput(
      validInput({ landingPage: 'javascript:alert(1)', referrer: 'not a url' })
    );
    expect(result.data.landingPage).toBeNull();
    expect(result.data.referrer).toBeNull();
  });

  it('keeps absolute and root-relative paths', () => {
    const result = validateLeadInput(
      validInput({ landingPage: '/tools/calculator', referrer: 'https://google.com/search' })
    );
    expect(result.data.landingPage).toBe('/tools/calculator');
    expect(result.data.referrer).toBe('https://google.com/search');
  });

  it('trims blank optional text to null', () => {
    const result = validateLeadInput(validInput({ name: '   ', trade: '' }));
    expect(result.data.name).toBeNull();
    expect(result.data.trade).toBeNull();
  });
});

describe('buildLeadRecord', () => {
  it('stamps the consent timestamp only when consent was given', () => {
    const consented = buildLeadRecord(
      validateLeadInput(validInput({ marketingConsent: true })).data,
      NOW
    );
    expect(consented.marketing_consent).toBe(true);
    expect(consented.marketing_consent_at).toBe(NOW);

    const notConsented = buildLeadRecord(validateLeadInput(validInput()).data, NOW);
    expect(notConsented.marketing_consent).toBe(false);
    expect(notConsented.marketing_consent_at).toBeNull();
  });

  it('opens the touch history with the first visit', () => {
    const record = buildLeadRecord(validateLeadInput(validInput()).data, NOW);
    expect(record.metadata.touches).toHaveLength(1);
    expect(record.metadata.touches[0].source).toBe('tool_calculator');
  });
});

describe('buildLeadUpdate', () => {
  const laterInput = () =>
    validateLeadInput(validInput({ source: 'pricing', name: 'Sam Rivera' })).data;

  it('never overwrites first-touch attribution', () => {
    const update = buildLeadUpdate(laterInput(), { metadata: {}, marketing_consent: false }, NOW);
    expect(update).not.toHaveProperty('source');
    expect(update).not.toHaveProperty('utm_source');
    expect(update).not.toHaveProperty('landing_page');
    expect(update).not.toHaveProperty('first_seen_at');
  });

  it('appends the new visit to the touch history', () => {
    const existing = {
      metadata: { touches: [{ at: '2026-08-01T00:00:00.000Z', source: 'tool_calculator' }] },
      marketing_consent: false,
    };
    const update = buildLeadUpdate(laterInput(), existing, NOW);
    expect(update.metadata.touches).toHaveLength(2);
    expect(update.metadata.touches[1].source).toBe('pricing');
  });

  it('caps stored touches so one row cannot grow without bound', () => {
    const touches = Array.from({ length: 25 }, (_, i) => ({ at: NOW, source: `s${i}` }));
    const update = buildLeadUpdate(laterInput(), { metadata: { touches } }, NOW);
    expect(update.metadata.touches).toHaveLength(20);
    // The most recent survive; the oldest are dropped.
    expect(update.metadata.touches[19].source).toBe('pricing');
    expect(update.metadata.touches[0].source).toBe('s6');
  });

  it('preserves unrelated metadata keys', () => {
    const update = buildLeadUpdate(laterInput(), { metadata: { notes: 'from import' } }, NOW);
    expect(update.metadata.notes).toBe('from import');
  });

  it('tolerates metadata that is missing or the wrong shape', () => {
    expect(buildLeadUpdate(laterInput(), null, NOW).metadata.touches).toHaveLength(1);
    expect(buildLeadUpdate(laterInput(), { metadata: 'oops' }, NOW).metadata.touches).toHaveLength(1);
    expect(buildLeadUpdate(laterInput(), { metadata: [] }, NOW).metadata.touches).toHaveLength(1);
  });

  it('upgrades consent and stamps the moment it was given', () => {
    const input = validateLeadInput(validInput({ marketingConsent: true })).data;
    const update = buildLeadUpdate(input, { metadata: {}, marketing_consent: false }, NOW);
    expect(update.marketing_consent).toBe(true);
    expect(update.marketing_consent_at).toBe(NOW);
  });

  it('does not silently revoke existing consent', () => {
    const update = buildLeadUpdate(laterInput(), { metadata: {}, marketing_consent: true }, NOW);
    expect(update.marketing_consent).toBe(true);
    // Already consented, so the original timestamp must not be overwritten.
    expect(update).not.toHaveProperty('marketing_consent_at');
  });

  it('fills in newly supplied details without clobbering what exists', () => {
    const update = buildLeadUpdate(laterInput(), { metadata: {} }, NOW);
    expect(update.name).toBe('Sam Rivera');

    const noName = buildLeadUpdate(validateLeadInput(validInput()).data, { metadata: {} }, NOW);
    expect(noName).not.toHaveProperty('name');
  });
});
