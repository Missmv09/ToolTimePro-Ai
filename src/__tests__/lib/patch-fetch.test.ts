import { withApiTrailingSlash } from '@/lib/patch-fetch';

describe('withApiTrailingSlash', () => {
  it('appends the trailing slash to a bare API path', () => {
    expect(withApiTrailingSlash('/api/portal')).toBe('/api/portal/');
  });

  it('leaves a path that already ends in a slash alone', () => {
    expect(withApiTrailingSlash('/api/portal/')).toBe('/api/portal/');
  });

  it('keeps the query string after the slash', () => {
    expect(withApiTrailingSlash('/api/portal?action=invoices')).toBe('/api/portal/?action=invoices');
  });

  it('keeps the hash after the slash', () => {
    expect(withApiTrailingSlash('/api/portal#top')).toBe('/api/portal/#top');
  });

  // A URL can carry both; the slash belongs before whichever comes first.
  it('splits on the first delimiter when both a query and a hash are present', () => {
    expect(withApiTrailingSlash('/api/portal?action=invoices#row-3')).toBe(
      '/api/portal/?action=invoices#row-3',
    );
    expect(withApiTrailingSlash('/api/portal#top?stale=1')).toBe('/api/portal/#top?stale=1');
  });

  it('rewrites absolute same-origin API URLs', () => {
    expect(withApiTrailingSlash(`${window.location.origin}/api/portal?action=profile`)).toBe(
      `${window.location.origin}/api/portal/?action=profile`,
    );
  });

  it('leaves non-API and cross-origin URLs untouched', () => {
    expect(withApiTrailingSlash('/dashboard/quotes')).toBe('/dashboard/quotes');
    expect(withApiTrailingSlash('https://api.stripe.com/v1/charges')).toBe(
      'https://api.stripe.com/v1/charges',
    );
    expect(withApiTrailingSlash('/.netlify/functions/checkout')).toBe('/.netlify/functions/checkout');
  });
});
