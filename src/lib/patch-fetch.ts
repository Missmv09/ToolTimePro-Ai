'use client';

// Global fetch patch: auto-add trailing slashes to /api/ routes.
// Required because next.config.js has trailingSlash: true and Netlify
// returns HTML redirects (not JSON) for API routes without trailing slashes.

let patched = false;

function applyPatch() {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const originalFetch = window.fetch;
  window.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const qIndex = input.indexOf('?');
      const hIndex = input.indexOf('#');
      const splitIndex =
        qIndex >= 0 ? qIndex : hIndex >= 0 ? hIndex : -1;

      let pathname: string;
      let suffix: string;
      if (splitIndex >= 0) {
        pathname = input.slice(0, splitIndex);
        suffix = input.slice(splitIndex);
      } else {
        pathname = input;
        suffix = '';
      }

      if (!pathname.endsWith('/')) {
        input = pathname + '/' + suffix;
      }
    }
    return originalFetch.call(this, input, init);
  };
}

export function FetchPatch() {
  applyPatch();
  return null;
}
