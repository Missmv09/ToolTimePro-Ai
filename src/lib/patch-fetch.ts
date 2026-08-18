'use client';

// Global fetch patch: auto-add trailing slashes to /api/ routes.
// Required because next.config.js has trailingSlash: true and Netlify
// returns HTML redirects (not JSON) for API routes without trailing slashes.
// A caller that then does `await res.json()` gets a SyntaxError instead of data,
// so this patch is what keeps API responses parseable. See `src/lib/http.ts`.

let patched = false;

/**
 * Add the trailing slash to an `/api/...` URL, preserving any query string and
 * hash. Accepts both root-relative paths and absolute same-origin URLs; returns
 * the input unchanged when it isn't a same-origin API route or already ends in
 * a slash.
 *
 * Exported for tests.
 */
export function withApiTrailingSlash(url: string): string {
  let pathname: string;
  let prefix: string;

  if (url.startsWith('/api/')) {
    pathname = url;
    prefix = '';
  } else if (typeof window !== 'undefined' && url.startsWith(window.location.origin + '/api/')) {
    // Absolute same-origin URL, e.g. `${window.location.origin}/api/portal`.
    prefix = window.location.origin;
    pathname = url.slice(prefix.length);
  } else {
    return url;
  }

  const qIndex = pathname.indexOf('?');
  const hIndex = pathname.indexOf('#');
  // The split point is whichever delimiter comes first — a URL may carry both,
  // and the hash can precede the query in malformed-but-accepted input.
  const splitIndex =
    qIndex >= 0 && hIndex >= 0
      ? Math.min(qIndex, hIndex)
      : qIndex >= 0
        ? qIndex
        : hIndex;

  const path = splitIndex >= 0 ? pathname.slice(0, splitIndex) : pathname;
  const suffix = splitIndex >= 0 ? pathname.slice(splitIndex) : '';

  if (path.endsWith('/')) return url;
  return prefix + path + '/' + suffix;
}

function applyPatch() {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const originalFetch = window.fetch;
  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    if (typeof input === 'string') {
      input = withApiTrailingSlash(input);
    } else if (input instanceof URL) {
      const patchedUrl = withApiTrailingSlash(input.toString());
      if (patchedUrl !== input.toString()) input = new URL(patchedUrl);
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      const patchedUrl = withApiTrailingSlash(input.url);
      // Only rebuild the Request when the URL actually changed — `new Request`
      // re-reads the body stream, which is wasted work (and a hazard) otherwise.
      if (patchedUrl !== input.url) input = new Request(patchedUrl, input);
    }
    return originalFetch.call(this, input, init);
  };
}

export function FetchPatch() {
  applyPatch();
  return null;
}
