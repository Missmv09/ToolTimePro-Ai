import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ needsPassword: false });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ needsPassword: false });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // getUser with the token reads directly from the auth database,
    // not the JWT — this is the most reliable way to check user_metadata.
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ needsPassword: false });
    }

    return NextResponse.json({
      needsPassword: user.user_metadata?.needs_password === true,
    });
  } catch {
    return NextResponse.json({ needsPassword: false });
  }
}
