import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/settings/admins
 * Returns all platform admins from the database.
 */
export async function GET(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('platform_admins')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      // Table may not exist yet
      return NextResponse.json({ admins: [] });
    }

    return NextResponse.json({ admins: data || [] });
  } catch {
    return NextResponse.json({ admins: [] });
  }
}

/**
 * POST /api/admin/settings/admins
 * Adds a new platform admin.
 * Body: { email: string }
 */
export async function POST(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This email is already a platform admin' }, { status: 400 });
    }

    // Look up the user_id if they have a Supabase auth account
    let userId = null;
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
      const match = authUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (match) userId = match.id;
    }

    const { error } = await supabase.from('platform_admins').insert({
      email: email.toLowerCase(),
      user_id: userId,
      granted_by: admin.userId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `Added ${email} as platform admin` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/settings/admins?id=xxx
 * Removes a platform admin.
 */
export async function DELETE(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('platform_admins').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Admin removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
