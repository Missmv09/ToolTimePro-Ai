import { NextResponse } from 'next/server';

/**
 * Decode a Supabase JWT without making a network call back to Supabase.
 * Returns { payload } on success or { reason } on failure.
 */
function decodeSupabaseJWT(token) {
  try {
    if (!token || typeof token !== 'string') {
      return { reason: 'no_token' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { reason: 'bad_format' };
    }

    // Use standard base64 with URL-safe char replacement (more compatible
    // than 'base64url' which may not be supported in all runtimes)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { reason: 'expired' };
    }

    if (!payload.sub) {
      return { reason: 'no_sub' };
    }

    return { payload };
  } catch (err) {
    return { reason: `decode_error: ${err.message}` };
  }
}

/**
 * Extract and validate the user from the request.
 *
 * Token resolution order:
 *   1. Authorization: Bearer <token>  header  (standard)
 *   2. bodyToken parameter            (fallback — survives 308 redirects
 *      that strip headers on Netlify / CDN edge)
 *   3. ?_token=<token> query param    (fallback for GET requests)
 *
 * Returns { user } on success or { error: NextResponse } on failure.
 */
export function authenticateRequest(request, bodyToken = null) {
  // Collect all available tokens from every source.
  // Netlify/CDN 308 redirects strip the Authorization header and may drop
  // the request body, so we try every channel and use the first VALID one.
  const candidates = [];

  // 1. Authorization header (preferred)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    candidates.push({ token: authHeader.replace('Bearer ', ''), source: 'header' });
  }

  // 2. Body token (POST fallback — bypasses header stripping)
  if (bodyToken) {
    candidates.push({ token: bodyToken, source: 'body' });
  }

  // 3. Query param (survives ALL redirects)
  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get('_token');
    if (qToken) {
      candidates.push({ token: qToken, source: 'query' });
    }
  } catch { /* ignore URL parse errors */ }

  // 4. Cookie (most reliable — cookies are ALWAYS sent automatically with
  // every request, even after 308 redirects, unlike headers/body/query)
  try {
    const cookieToken = request.cookies?.get?.('_auth_token')?.value;
    if (cookieToken) {
      candidates.push({ token: decodeURIComponent(cookieToken), source: 'cookie' });
    }
  } catch { /* ignore cookie parse errors */ }

  if (candidates.length === 0) {
    console.error('[Auth] No token found in any source. Header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing', '| bodyToken:', !!bodyToken);
    return { error: NextResponse.json({ error: 'Unauthorized — no token provided' }, { status: 401 }) };
  }

  // De-duplicate tokens (header and body are usually the same value)
  const seen = new Set();
  const unique = candidates.filter(c => {
    if (seen.has(c.token)) return false;
    seen.add(c.token);
    return true;
  });

  // Try each unique token — use the first one that validates successfully.
  // This way if the header token is expired/bad but the query param has a
  // fresh token (from a retry), we still succeed.
  let lastReason = 'unknown';
  for (const { token, source } of unique) {
    const { payload, reason } = decodeSupabaseJWT(token);
    if (payload) {
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
        },
      };
    }
    console.warn('[Auth] Token from', source, 'failed:', reason, '| len:', token.length);
    lastReason = reason;
  }

  console.error('[Auth] All token sources failed. Sources tried:', unique.map(c => c.source).join(', '), '| Last reason:', lastReason);
  return {
    error: NextResponse.json(
      { error: `Auth failed: ${lastReason}. Please log out, log back in, and try again.` },
      { status: 401 }
    ),
  };
}
