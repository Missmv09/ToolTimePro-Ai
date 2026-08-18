/**
 * Tests for ad click ID and campaign attribution capture.
 *
 * The failure mode these guard against is silent and expensive: a click ID
 * that isn't persisted means a lead who later pays can never be reported back
 * to Google Ads, so Smart Bidding keeps optimizing toward free-tool signups.
 * Nothing errors — the money just goes to the wrong clicks.
 */

import { captureAttribution, readAttribution, CLICK_ID_PARAMS } from '@/lib/analytics';

/** Point jsdom at a URL without triggering a real navigation. */
function visit(url) {
  const parsed = new URL(url, 'https://taskiguana.com');
  delete window.location;
  window.location = {
    search: parsed.search,
    pathname: parsed.pathname,
    origin: parsed.origin,
    href: parsed.href,
  };
}

function setReferrer(value) {
  Object.defineProperty(document, 'referrer', { value, configurable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  visit('https://taskiguana.com/');
  setReferrer('');
});

describe('click ID capture', () => {
  it.each(CLICK_ID_PARAMS)('persists a %s from the landing URL', (param) => {
    visit(`https://taskiguana.com/tools/final-wage?${param}=abc123`);
    captureAttribution();

    // Navigate away, as a real visitor would before submitting.
    visit('https://taskiguana.com/tools/calculator');
    expect(readAttribution()[param]).toBe('abc123');
  });

  it('survives navigation to a page with no query string at all', () => {
    visit('https://taskiguana.com/?gclid=click-1');
    captureAttribution();
    visit('https://taskiguana.com/pricing');

    const attribution = readAttribution();
    expect(attribution.gclid).toBe('click-1');
    // The landing page is where the visit started, not where they submitted.
    expect(attribution.landingPage).toBe('/');
  });

  it('keeps the most recent click, because Google attributes last-click', () => {
    visit('https://taskiguana.com/?gclid=older');
    captureAttribution();

    visit('https://taskiguana.com/pricing?gclid=newer');
    captureAttribution();

    expect(readAttribution().gclid).toBe('newer');
  });

  it('does not clear a stored click ID when a later visit has none', () => {
    visit('https://taskiguana.com/?gclid=from-ad');
    captureAttribution();

    visit('https://taskiguana.com/blog');
    captureAttribution();

    expect(readAttribution().gclid).toBe('from-ad');
  });

  it('prefers gclid when a URL somehow carries more than one identifier', () => {
    visit('https://taskiguana.com/?gclid=g-1&wbraid=w-1');
    captureAttribution();

    const attribution = readAttribution();
    expect(attribution.gclid).toBe('g-1');
    expect(attribution.wbraid).toBeUndefined();
  });

  it('expires a click ID past Google\'s 90-day attribution window', () => {
    visit('https://taskiguana.com/?gclid=stale');
    captureAttribution();

    const stored = JSON.parse(window.localStorage.getItem('ti_click_id'));
    stored.at = Date.now() - 91 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem('ti_click_id', JSON.stringify(stored));

    visit('https://taskiguana.com/pricing');
    expect(readAttribution().gclid).toBeUndefined();
  });
});

describe('campaign attribution', () => {
  it('keeps the first touch rather than the most recent', () => {
    visit('https://taskiguana.com/?utm_source=google&utm_campaign=first');
    captureAttribution();

    visit('https://taskiguana.com/pricing?utm_source=facebook&utm_campaign=second');
    captureAttribution();

    const attribution = readAttribution();
    expect(attribution.utmSource).toBe('google');
    expect(attribution.utmCampaign).toBe('first');
  });

  it('records an external referrer but ignores internal navigation', () => {
    setReferrer('https://www.google.com/search?q=field+service');
    visit('https://taskiguana.com/blog');
    captureAttribution();
    expect(readAttribution().referrer).toBe('https://www.google.com/search?q=field+service');

    window.localStorage.clear();
    setReferrer('https://taskiguana.com/pricing');
    visit('https://taskiguana.com/tools');
    captureAttribution();
    expect(readAttribution().referrer).toBeUndefined();
  });

  it('does not lock in an empty first touch on a direct visit', () => {
    visit('https://taskiguana.com/');
    captureAttribution();
    // Nothing stored yet, so a real campaign arriving later still wins.
    expect(window.localStorage.getItem('ti_attribution')).toBeNull();

    visit('https://taskiguana.com/pricing?utm_source=google');
    captureAttribution();
    expect(readAttribution().utmSource).toBe('google');
  });

  it('reads parameters from the current URL when nothing is stored', () => {
    visit('https://taskiguana.com/tools?utm_source=newsletter');
    expect(readAttribution().utmSource).toBe('newsletter');
  });
});

describe('resilience', () => {
  it('returns an empty object rather than throwing when storage is blocked', () => {
    const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled');
    });
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError: storage disabled');
    });

    visit('https://taskiguana.com/?gclid=abc');
    expect(() => captureAttribution()).not.toThrow();
    // Same-page attribution still works; only cross-page persistence is lost.
    expect(readAttribution().utmSource).toBeUndefined();

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('discards corrupt stored data instead of propagating it', () => {
    window.localStorage.setItem('ti_click_id', 'not json{{');
    visit('https://taskiguana.com/pricing');
    expect(() => readAttribution()).not.toThrow();
    expect(readAttribution().gclid).toBeUndefined();
  });
});
