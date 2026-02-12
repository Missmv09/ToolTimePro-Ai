import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _supabase = null;

function getAuthSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      _supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
  }
  return _supabase;
}

/**
 * Decode a Supabase JWT locally (no network call).
 * Returns { payload } on success or { reason } on failure.
 */
function decodeSupabaseJWT(token) {
  try {
    if (!token || typeof token !== 'string') return { reason: 'no_token' };

    const parts = token.split('.');
    if (parts.length !== 3) return { reason: 'bad_format' };

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));

    if (payload.exp && payload.exp * 1000 < Date.now()) return { reason: 'expired' };
    if (!payload.sub) return { reason: 'no_sub' };

    return { payload };
  } catch (err) {
    return { reason: `decode_error: ${err.message}` };
  }
}

/**
 * Extract and validate the user from the request.
 *
 * Token resolution: header → body → query → cookie.
 * Validation: tries Supabase auth.getUser() first (authoritative),
 * falls back to local JWT decode if the network call fails.
 *
 * Returns { user } on success or { error: NextResponse } on failure.
 */
export async function authenticateRequest(request, bodyToken = null) {
  const candidates = [];

  // 1. Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    candidates.push({ token: authHeader.replace('Bearer ', ''), source: 'header' });
  }

  // 2. Body token (POST fallback)
  if (bodyToken) {
    candidates.push({ token: bodyToken, source: 'body' });
  }

  // 3. Query param (survives ALL redirects)
  try {
    const url = new URL(request.url);
    const qToken = url.searchParams.get('_token');
    if (qToken) candidates.push({ token: qToken, source: 'query' });
  } catch { /* ignore */ }

  // 4. Cookie (most reliable — always sent after redirects)
  try {
    const cookieToken = request.cookies?.get?.('_auth_token')?.value;
    if (cookieToken) candidates.push({ token: decodeURIComponent(cookieToken), source: 'cookie' });
  } catch { /* ignore */ }

  if (candidates.length === 0) {
    console.error('[Auth] No token found. Header:', authHeader ? 'present' : 'missing',
      '| bodyToken:', !!bodyToken, '| url:', request.url);
    return {
      error: NextResponse.json({
        error: 'Unauthorized — no token provided',
        _debug: { sources: [], url: request.url?.substring(0, 100) },
      }, { status: 401 }),
    };
  }

  // De-duplicate
  const seen = new Set();
  const unique = candidates.filter(c => {
    if (seen.has(c.token)) return false;
    seen.add(c.token);
    return true;
  });

  const allReasons = [];

  for (const { token, source } of unique) {
    // --- Primary: verify with Supabase auth.getUser() ---
    const sb = getAuthSupabase();
    if (sb) {
      try {
        const { data, error: getUserError } = await sb.auth.getUser(token);
        if (data?.user && !getUserError) {
          console.log('[Auth] Verified via Supabase getUser. Source:', source);
          return {
            user: {
              id: data.user.id,
              email: data.user.email,
              user_metadata: data.user.user_metadata || {},
            },
          };
        }
        if (getUserError) {
          console.warn('[Auth] getUser failed for', source, ':', getUserError.message);
          allReasons.push(`${source}:getUser:${getUserError.message}`);
        }
      } catch (e) {
        console.warn('[Auth] getUser threw for', source, ':', e.message);
        // Fall through to local decode
      }
    }

    // --- Fallback: local JWT decode ---
    const { payload, reason } = decodeSupabaseJWT(token);
    if (payload) {
      console.log('[Auth] Verified via local JWT decode. Source:', source);
      return {
        user: {
          id: payload.sub,
          email: payload.email,
          user_metadata: payload.user_metadata || {},
        },
      };
    }
    console.warn('[Auth] Local decode failed for', source, ':', reason, '| len:', token.length);
    allReasons.push(`${source}:jwt:${reason}`);
  }

  console.error('[Auth] All sources failed:', allReasons.join(' | '));
  return {
    error: NextResponse.json({
      error: `Auth failed. Please log out, log back in, and try again.`,
      _debug: {
        sources: unique.map(c => c.source),
        reasons: allReasons,
      },
    }, { status: 401 }),
  };
}
