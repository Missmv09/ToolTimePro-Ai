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
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'https://tooltimepro.com'}/auth/callback?flow=signup`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating confirmation link:', linkError);
      return NextResponse.json(
        { error: 'Failed to generate confirmation link' },
        { status: 500 }
      );
    }

    // Send the branded confirmation email via Resend
    await sendSignupConfirmationEmail({
      to: email,
      name,
      companyName,
      confirmationUrl: linkData.properties.action_link,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-confirmation-email error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
