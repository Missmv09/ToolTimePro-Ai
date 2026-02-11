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
  // --- Resolve token from multiple sources ---
  let token = null;
  let source = 'none';

  // 1. Authorization header (preferred)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '');
    source = 'header';
  }

  // 2. Body token (POST fallback — bypasses 308 redirect header stripping)
  if (!token && bodyToken) {
    token = bodyToken;
    source = 'body';
  }

  // 3. Query param (GET fallback)
  if (!token) {
    try {
      const url = new URL(request.url);
      const qToken = url.searchParams.get('_token');
      if (qToken) {
        token = qToken;
        source = 'query';
      }
    } catch { /* ignore URL parse errors */ }
  }

  if (!token) {
    console.error('[Auth] No token found. Header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'missing', '| bodyToken:', !!bodyToken);
    return { error: NextResponse.json({ error: 'Unauthorized — no token provided' }, { status: 401 }) };
  }

  const { payload, reason } = decodeSupabaseJWT(token);

  if (!payload) {
    console.error('[Auth] JWT decode failed. Source:', source, '| Reason:', reason, '| Token length:', token.length);
    return {
      error: NextResponse.json(
        { error: `Auth failed: ${reason}. Please log out, log back in, and try again.` },
        { status: 401 }
      ),
    };
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata || {},
    },
  };
}
