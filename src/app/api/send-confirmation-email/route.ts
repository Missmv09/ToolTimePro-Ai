import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSignupConfirmationEmail } from '@/lib/email';

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
    const { userId, email, name, companyName } = await request.json();

    if (!userId || !email || !name || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a confirmation link using Supabase Admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://tooltimepro.com'}/auth/callback`,
        },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Error generating confirmation link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate confirmation link' },
        { status: 500 }
      );
    }

    // Build a direct URL with token_hash instead of using the Supabase
    // action_link.  The action_link redirects through Supabase's server,
    // which returns a PKCE `code` the browser can't exchange (no
    // code_verifier stored).  With token_hash the callback page calls
    // verifyOtp() directly, which doesn't need PKCE.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://tooltimepro.com';
    const confirmationUrl = `${baseUrl}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink`;

    // Send the branded confirmation email via Resend
    await sendSignupConfirmationEmail({
      to: email,
      name,
      companyName,
      confirmationUrl,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-confirmation-email error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
