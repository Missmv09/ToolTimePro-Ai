import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendImmediateWelcomeEmail } from '@/lib/email';

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
    // Validate the caller is authenticated via Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch the user's profile and company name
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('full_name, company_id')
      .eq('id', user.id)
      .single();

    if (!dbUser?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name, welcome_email_sent_at')
      .eq('id', dbUser.company_id)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Don't send duplicate welcome emails
    if (company.welcome_email_sent_at) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const name = dbUser.full_name || user.user_metadata?.full_name || 'there';
    const companyName = company.name || 'your company';

    await sendImmediateWelcomeEmail({
      to: user.email!,
      name,
      companyName,
    });

    // Mark welcome email as sent so the cron job skips Day 1
    await supabaseAdmin
      .from('companies')
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq('id', dbUser.company_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('send-welcome-email error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
