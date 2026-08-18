import { readJson, HttpJsonError } from '@/lib/http';

// Minimal stand-in for a fetch Response — jsdom's Response is not guaranteed to
// be present across Node versions, and we only exercise the parts readJson uses.
function makeResponse(
  body: string,
  { status = 200, contentType = 'application/json', url = 'https://taskiguana.com/api/portal/' } = {},
): Response {
  return {
    status,
    url,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  } as unknown as Response;
}

describe('readJson', () => {
  it('parses a normal JSON body', async () => {
    const res = makeResponse('{"invoices":[{"id":"inv_1"}]}');
    await expect(readJson(res)).resolves.toEqual({ invoices: [{ id: 'inv_1' }] });
  });

  // The regression this helper exists for: Sentry JAVASCRIPT-NEXTJS-2,
  // "Failed to execute 'json' on 'Response': Unexpected end of JSON input".
  it('returns the fallback for a zero-length body instead of throwing', async () => {
    const res = makeResponse('');
    await expect(readJson(res, {})).resolves.toEqual({});
  });

  it('returns the fallback for a whitespace-only body', async () => {
    const res = makeResponse('\n  \t ');
    await expect(readJson(res, { hasPortalPro: false })).resolves.toEqual({ hasPortalPro: false });
  });

  it('defaults the fallback to null when none is given', async () => {
    await expect(readJson(makeResponse(''))).resolves.toBeNull();
  });

  it('returns the fallback for a 502 with an empty body (Netlify function timeout)', async () => {
    const res = makeResponse('', { status: 502, contentType: 'text/html' });
    await expect(readJson(res, {})).resolves.toEqual({});
  });

  it.each([204, 205, 304])('returns the fallback for HTTP %i without reading the body', async (status) => {
    let read = false;
    const res = {
      status,
      url: 'https://taskiguana.com/api/portal/',
      headers: { get: () => null },
      text: async () => {
        read = true;
        return '';
      },
    } as unknown as Response;

    await expect(readJson(res, {})).resolves.toEqual({});
    expect(read).toBe(false);
  });

  it('returns the fallback when the body stream fails mid-read', async () => {
    const res = {
      status: 200,
      url: 'https://taskiguana.com/api/portal/',
      headers: { get: () => null },
      text: async () => {
        throw new TypeError('network error');
      },
    } as unknown as Response;

    await expect(readJson(res, {})).resolves.toEqual({});
  });

  it('throws a diagnostic HttpJsonError for an HTML body', async () => {
    const res = makeResponse('<!DOCTYPE html><html><head><title>Redirecting</title></head></html>', {
      status: 301,
      contentType: 'text/html; charset=utf-8',
      url: 'https://taskiguana.com/api/portal',
    });

    await expect(readJson(res, {})).rejects.toThrow(HttpJsonError);
    const err = await readJson(res, {}).catch((e) => e as HttpJsonError);
    expect(err.status).toBe(301);
    expect(err.url).toBe('https://taskiguana.com/api/portal');
    expect(err.contentType).toBe('text/html; charset=utf-8');
    // The message must name the endpoint — that is what makes the Sentry report
    // actionable instead of an anonymous SyntaxError.
    expect(err.message).toContain('https://taskiguana.com/api/portal');
    expect(err.message).toContain('text/html');
    expect(err.message).toContain('<!DOCTYPE html>');
  });

  it('truncates a long non-JSON body in the error message', async () => {
    const res = makeResponse('x'.repeat(5000), { contentType: 'text/html' });
    const err = await readJson(res, {}).catch((e) => e as HttpJsonError);
    expect(err.bodySnippet).toHaveLength(201); // 200 chars + the ellipsis
    expect(err.bodySnippet.endsWith('…')).toBe(true);
  });

  it('tolerates a response with no headers object', async () => {
    const res = { status: 200, url: '', text: async () => 'not json' } as unknown as Response;
    const err = await readJson(res).catch((e) => e as HttpJsonError);
    expect(err).toBeInstanceOf(HttpJsonError);
    expect(err.contentType).toBe('');
  });

  it('parses JSON primitives, not just objects', async () => {
    await expect(readJson(makeResponse('null'))).resolves.toBeNull();
    await expect(readJson(makeResponse('[]'))).resolves.toEqual([]);
    await expect(readJson(makeResponse('"ok"'))).resolves.toBe('ok');
  });
});
