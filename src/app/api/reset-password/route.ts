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
    const { email: rawEmail } = await request.json();

    if (!rawEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const supabaseAdmin = getSupabaseAdmin();

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'https://tooltimepro.com';

    // Generate a recovery link via admin API — works regardless of
    // email_confirmed_at status.  This also validates that the email
    // exists in Supabase auth; if not, it returns an error and we
    // silently return success to prevent email enumeration.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${baseUrl}/auth/reset-password`,
        },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      const errMsg = linkError?.message || 'No hashed_token returned';
      console.error(`[reset-password] Failed to generate recovery link for ${email}:`, errMsg);

      // "User not found" means the email doesn't exist — return success
      // to prevent email enumeration.  Any other error (Supabase down,
      // network issue, paused project) is an infrastructure problem the
      // user should know about so they can retry later.
      const isUserNotFound =
        /user not found|unable to validate|no user/i.test(errMsg);

      if (isUserNotFound) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: 'Our server is temporarily unavailable. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    // Look up the user's display name for a personalised email.
    // Use the user id returned by generateLink so we don't need to
    // paginate through listUsers().
    const userId = linkData.user?.id;
    let name = 'there';

    if (userId) {
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      name =
        dbUser?.full_name ||
        linkData.user?.user_metadata?.full_name ||
        'there';
    }

    // Build a direct URL with token_hash instead of using the Supabase
    // action_link.  The action_link redirects through Supabase's server,
    // which returns a PKCE `code` the browser can't exchange (no
    // code_verifier stored).  With token_hash the reset page calls
    // verifyOtp() directly, which doesn't need PKCE.
    const resetUrl = `${baseUrl}/auth/reset-password?token_hash=${linkData.properties.hashed_token}&type=recovery`;

    // Send the branded password reset email via Resend
    try {
      await sendPasswordResetEmail({
        to: email,
        name,
        resetUrl,
      });
    } catch (emailErr) {
      const emailMessage = emailErr instanceof Error ? emailErr.message : 'Unknown email error';
      console.error(`[reset-password] Failed to send reset email to ${email}:`, emailMessage);
      return NextResponse.json(
        { error: 'We could not send the reset email right now. Please try again in a few minutes.' },
        { status: 503 }
      );
    }

    console.log(`[reset-password] Reset email sent successfully to ${email}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[reset-password] Unexpected error:', message);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
