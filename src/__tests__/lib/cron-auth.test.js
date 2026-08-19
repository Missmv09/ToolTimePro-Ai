/**
 * Tests for cron/background function authorization.
 *
 * The risk here is asymmetric. A check that is too strict silently disables the
 * growth agent — that is the failure that actually happened, and it looked
 * identical whether the variable was missing, the value was wrong, or the
 * header never arrived. A check that is too loose lets anyone on the internet
 * spend the AI budget. So the cases below pin both edges: what must be accepted
 * despite cosmetic differences, and what must never be.
 */

import { authorizeCronRequest, cronAuthHeaders } from '@/lib/cron-auth';

const SECRET = 'a-real-looking-secret-value';

// jsdom does not provide the WHATWG Request, so build the only part the code
// touches. Header lookup is case-insensitive in the real thing, and the code
// relies on that (it reads 'authorization' while callers send 'Authorization'),
// so the stub must be too — otherwise these tests would pass on a bug.
const req = (headers) => ({
  headers: {
    get: (name) => {
      const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
      return key === undefined ? null : headers[key];
    },
  },
});

describe('authorizeCronRequest', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('accepts a conventional Bearer header', () => {
    expect(authorizeCronRequest(req({ Authorization: `Bearer ${SECRET}` })).ok).toBe(true);
  });

  it('accepts the fallback header, for when Authorization does not survive transit', () => {
    expect(authorizeCronRequest(req({ 'X-Cron-Secret': SECRET })).ok).toBe(true);
  });

  it('accepts a lowercase scheme', () => {
    expect(authorizeCronRequest(req({ Authorization: `bearer ${SECRET}` })).ok).toBe(true);
  });

  it('accepts a bare secret with no scheme', () => {
    expect(authorizeCronRequest(req({ Authorization: SECRET })).ok).toBe(true);
  });

  it('tolerates whitespace pasted around the value in a dashboard', () => {
    process.env.CRON_SECRET = `  ${SECRET}\n`;
    expect(authorizeCronRequest(req({ Authorization: `Bearer ${SECRET} ` })).ok).toBe(true);
  });

  it('still rejects a wrong secret', () => {
    const result = authorizeCronRequest(req({ Authorization: 'Bearer not-the-secret' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it('rejects a value that merely starts with the secret', () => {
    expect(authorizeCronRequest(req({ Authorization: `Bearer ${SECRET}x` })).ok).toBe(false);
  });

  it('distinguishes a missing environment variable from a bad value', () => {
    delete process.env.CRON_SECRET;
    const result = authorizeCronRequest(req({ Authorization: `Bearer ${SECRET}` }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not visible to this function/i);
  });

  it('distinguishes a header that never arrived from one that is wrong', () => {
    const result = authorizeCronRequest(req({}));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/No secret header arrived/i);
    expect(result.reason).toContain('x-cron-secret');
  });

  it('never puts the secret in the reason, since these logs are widely readable', () => {
    const cases = [req({}), req({ Authorization: 'Bearer wrong' }), req({ 'X-Cron-Secret': 'wrong' })];
    for (const request of cases) {
      const { reason } = authorizeCronRequest(request);
      expect(reason).not.toContain(SECRET);
      // A 4-character prefix is deliberate and allowed; the whole value is not.
      expect(reason).not.toContain(SECRET.slice(0, 8));
    }
  });
});

describe('cronAuthHeaders', () => {
  it('sends the same secret under both names', () => {
    const headers = cronAuthHeaders(SECRET);
    expect(headers.Authorization).toBe(`Bearer ${SECRET}`);
    expect(headers['X-Cron-Secret']).toBe(SECRET);
  });

  it('trims, so a stray newline in the variable does not travel', () => {
    expect(cronAuthHeaders(` ${SECRET}\n`)['X-Cron-Secret']).toBe(SECRET);
  });

  it('produces headers its own checker accepts', () => {
    process.env.CRON_SECRET = SECRET;
    expect(authorizeCronRequest(req(cronAuthHeaders(SECRET))).ok).toBe(true);
  });
});
