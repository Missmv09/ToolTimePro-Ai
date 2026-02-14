import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

/**
 * POST /api/auth/session-guard
 * Register a new active session after login.
 * Body: { sessionId: string }
 *
 * Stores the sessionId in the users table. Any other browser holding
 * a different sessionId for this user will be signed out on its next
 * validation check.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    // Store the new active session ID for this user
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ active_session_id: sessionId })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error registering session:', updateError);
      return NextResponse.json({ error: 'Failed to register session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/auth/session-guard?sid=<sessionId>
 * Validate that the caller's session is still the active one.
 *
 * Returns { valid: true } if the session matches, or { valid: false }
 * if another login has taken over.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sid = url.searchParams.get('sid');
    if (!sid) {
      return NextResponse.json({ error: 'Missing sid param' }, { status: 400 });
    }

    const { data: userRow, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('active_session_id')
      .eq('id', user.id)
      .single();

    if (fetchError || !userRow) {
      // Can't verify — treat as valid to avoid accidental lockout
      return NextResponse.json({ valid: true });
    }

    // If active_session_id is null, single-session isn't set up yet — allow
    if (!userRow.active_session_id) {
      return NextResponse.json({ valid: true });
    }

    const valid = userRow.active_session_id === sid;
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: true }); // fail-open to avoid lockout
  }
}
