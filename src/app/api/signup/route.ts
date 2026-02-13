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
    const { email, fullName, companyName } = await request.json();

    if (!email || !fullName || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, fullName, companyName' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const tempPassword = crypto.randomUUID() + 'Aa1!';

    // Step 1: Create auth user via admin API — this does NOT send a default
    // Supabase confirmation email, so the user only receives our branded email.
    const { data: userData, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          full_name: fullName,
          needs_password: true,
        },
      });

    if (createError || !userData.user) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 500 }
      );
    }

    // Step 2: Create company + user profile atomically via database function.
    const { error: setupError } = await supabaseAdmin.rpc('handle_new_signup', {
      p_user_id: userData.user.id,
      p_email: email,
      p_full_name: fullName,
      p_company_name: companyName,
    });

    if (setupError) {
      console.error('Error setting up account:', setupError);
      // Clean up the auth user since company setup failed
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { error: `Account setup failed: ${setupError.message}` },
        { status: 500 }
      );
    }

    // Step 3: Generate a confirmation link and send the branded email.
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'https://tooltimepro.com';

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${baseUrl}/auth/callback`,
        },
      });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Error generating confirmation link:', linkError);
      return NextResponse.json(
        { error: 'Account created but failed to generate confirmation link' },
        { status: 500 }
      );
    }

    // Step 4: Send the branded confirmation email via Resend.
    await sendSignupConfirmationEmail({
      to: email,
      name: fullName,
      companyName,
      confirmationUrl: linkData.properties.action_link,
    });

    return NextResponse.json({
      success: true,
      userId: userData.user.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Signup API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
