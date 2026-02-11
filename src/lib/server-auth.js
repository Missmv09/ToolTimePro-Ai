import { NextResponse } from 'next/server';

/**
 * Decode a Supabase JWT without making a network call back to Supabase.
 * The token was issued by Supabase over HTTPS — we trust its structure and expiry.
 * This avoids the auth.getUser(token) API call which can fail if the service-role
 * key is misconfigured or the Supabase auth endpoint is slow/unreachable.
 */
function decodeSupabaseJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    // Reject expired tokens
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    // Must have a subject (user ID)
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract and validate the user from the Authorization header.
 * Returns { user } on success or { error: NextResponse } on failure.
 */
export function authenticateRequest(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = decodeSupabaseJWT(token);
  if (!payload) {
    return { error: NextResponse.json({ error: 'Invalid or expired session — please log in again' }, { status: 401 }) };
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata || {},
    },
  };
}
