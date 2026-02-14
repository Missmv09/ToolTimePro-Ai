import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Look up the user by email via the admin API
    const { data: userList, error: listError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      // Don't reveal whether the email exists — always return success
      return NextResponse.json({ success: true });
    }

    const user = userList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // Don't reveal that the email doesn't exist
      return NextResponse.json({ success: true });
    }

    // Fetch the user's display name from the users table
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const name = dbUser?.full_name || user.user_metadata?.full_name || 'there';

    // Generate a recovery link via admin API — works regardless of
    // email_confirmed_at status, which is the key fix.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'https://tooltimepro.com';

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${baseUrl}/auth/reset-password`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating recovery link:', linkError);
      // Still return success to avoid leaking user existence
      return NextResponse.json({ success: true });
    }

    // Send the branded password reset email via Resend
    await sendPasswordResetEmail({
      to: email,
      name,
      resetUrl: linkData.properties.action_link,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Password reset API error:', message);
    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true });
  }
}
