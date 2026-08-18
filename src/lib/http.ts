// Safe JSON parsing for `fetch` responses.
//
// WHY THIS EXISTS
// ---------------
// `await response.json()` throws when the body is not valid JSON. The two ways
// that happens in production here are:
//
//   1. EMPTY BODY -> "SyntaxError: Failed to execute 'json' on 'Response':
//      Unexpected end of JSON input". A Netlify function that times out (502 /
//      504), a proxy that drops the body, a 204/304, or a request the browser
//      aborts mid-flight (user navigates away, phone loses signal) all hand back
//      a zero-length body with no warning.
//
//   2. HTML BODY -> "SyntaxError: Unexpected token '<'". `next.config.js` sets
//      `trailingSlash: true`, so Netlify answers an `/api/...` call without the
//      trailing slash with an HTML redirect page. See `src/lib/patch-fetch.ts`.
//
// Case 1 is not an error worth crashing on — there is simply no payload — so
// `readJson` returns the caller's fallback. Case 2 IS a bug, so it still throws,
// but as an `HttpJsonError` carrying the status, URL, content-type and a body
// snippet. That turns an anonymous `SyntaxError` in Sentry into a report that
// names the endpoint that misbehaved.

/** Thrown when a response body is present but is not JSON. */
export class HttpJsonError extends Error {
  readonly status: number;
  readonly url: string;
  readonly contentType: string;
  readonly bodySnippet: string;

  constructor(args: {
    status: number;
    url: string;
    contentType: string;
    bodySnippet: string;
  }) {
    super(
      `Expected JSON from ${args.url || 'request'} but got ` +
        `${args.contentType || 'an unknown content type'} ` +
        `(HTTP ${args.status}): ${args.bodySnippet}`,
    );
    this.name = 'HttpJsonError';
    this.status = args.status;
    this.url = args.url;
    this.contentType = args.contentType;
    this.bodySnippet = args.bodySnippet;
  }
}

// Long HTML error pages are useless in full and blow up Sentry payloads.
const SNIPPET_LENGTH = 200;

/**
 * Read a `fetch` response as JSON without crashing on an empty body.
 *
 * @param response The response to read. Its body is consumed.
 * @param fallback Returned when the body is empty. Defaults to `null`; pass
 *                 `{}` at call sites that immediately read a property off the
 *                 result, so an empty body degrades instead of crashing.
 * @throws {HttpJsonError} when the body is non-empty but is not valid JSON.
 */
export async function readJson<T = any>(
  response: Response,
  fallback: unknown = null,
): Promise<T> {
  // 204 No Content / 205 Reset Content / 304 Not Modified are defined to have
  // no body at all — don't even try to read one.
  if (response.status === 204 || response.status === 205 || response.status === 304) {
    return fallback as T;
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    // The body stream failed mid-read (aborted request, connection dropped).
    // There is nothing to parse and nothing the caller can do about it.
    return fallback as T;
  }

  if (!text || !text.trim()) return fallback as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpJsonError({
      status: response.status,
      url: response.url,
      contentType: response.headers?.get?.('content-type') || '',
      bodySnippet:
        text.length > SNIPPET_LENGTH
          ? `${text.slice(0, SNIPPET_LENGTH)}…`
          : text,
    });
  }
}
