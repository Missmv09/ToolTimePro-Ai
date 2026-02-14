import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token && !userId) {
      return NextResponse.json({ needsPassword: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('check-needs-password: missing env vars');
      return NextResponse.json({ needsPassword: false });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Strategy 1 (preferred): Use getUserById with the admin API.
    // This reads directly from the auth database, bypasses JWT entirely,
    // and is immune to token-invalidation or stale-JWT issues.
    if (userId) {
      const { data: { user }, error } =
        await supabaseAdmin.auth.admin.getUserById(userId);

      if (!error && user) {
        const needsPassword =
          user.app_metadata?.needs_password === true ||
          user.user_metadata?.needs_password === true;
        console.log(`check-needs-password (byId ${userId}): app=${user.app_metadata?.needs_password}, user=${user.user_metadata?.needs_password} → ${needsPassword}`);
        return NextResponse.json({ needsPassword });
      }
      console.error('check-needs-password: getUserById failed:', error?.message);
    }

    // Strategy 2 (fallback): Validate the JWT token.
    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
        const needsPassword =
          user.app_metadata?.needs_password === true ||
          user.user_metadata?.needs_password === true;
        console.log(`check-needs-password (byToken): app=${user.app_metadata?.needs_password}, user=${user.user_metadata?.needs_password} → ${needsPassword}`);
        return NextResponse.json({ needsPassword });
      }
      console.error('check-needs-password: getUser(token) failed:', error?.message);
    }

    // Both strategies failed — log it so we can debug
    console.error('check-needs-password: all strategies failed, returning false');
    return NextResponse.json({ needsPassword: false });
  } catch (err) {
    console.error('check-needs-password: unexpected error:', err);
    return NextResponse.json({ needsPassword: false });
  }
}
