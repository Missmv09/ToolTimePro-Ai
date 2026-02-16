import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signout-all
 * Globally signs out all sessions for the authenticated user.
 * Used after password reset to invalidate every existing session,
 * forcing re-authentication with the new password.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Validate the token and get the user
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Sign out all sessions for this user globally
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(
      user.id,
      'global'
    );

    if (signOutError) {
      console.error('Error signing out all sessions:', signOutError);
      return NextResponse.json({ error: 'Failed to sign out sessions' }, { status: 500 });
    }

    // Also clear the active_session_id so session-guard doesn't hold stale data
    await supabaseAdmin
      .from('users')
      .update({ active_session_id: null })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
