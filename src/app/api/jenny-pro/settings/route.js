import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';

export const dynamic = 'force-dynamic';

let supabaseInstance = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabaseInstance = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseInstance;
}

export async function GET(request) {
  const { user, error: authResponse } = await authenticateRequest(request);
  if (authResponse) return authResponse;

  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from('jenny_pro_settings')
    .select('*')
    .eq('company_id', dbUser.company_id)
    .maybeSingle();

  return NextResponse.json({ settings: settings || null });
}

export async function POST(request) {
  const body = await request.json();
  const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
  if (authResponse) return authResponse;

  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 });
  }

  const {
    business_hours_greeting,
    after_hours_greeting,
    emergency_keywords,
    escalation_phone,
    language,
    operator_language,
    auto_booking,
    business_info,
    reminders_enabled,
    review_followup_enabled,
    lead_alerts_enabled,
    lead_auto_reply_enabled,
  } = body;

  const settingsPayload = {
    company_id: dbUser.company_id,
    business_hours_greeting,
    after_hours_greeting,
    emergency_keywords,
    escalation_phone,
    language,
    operator_language,
    auto_booking,
    business_info,
    reminders_enabled,
    review_followup_enabled,
    lead_alerts_enabled,
    lead_auto_reply_enabled,
    updated_at: new Date().toISOString(),
  };

  let { data, error } = await supabase
    .from('jenny_pro_settings')
    .upsert(settingsPayload, { onConflict: 'company_id' })
    .select()
    .single();

  // A DB behind on migrations 038/041/042 lacks operator_language/business_info/
  // reminders_enabled/review_followup_enabled; strip them and retry so settings
  // still save.
  if (error && (error.code === '42703' || /operator_language|business_info|reminders_enabled|review_followup_enabled|lead_alerts_enabled|lead_auto_reply_enabled/.test(error.message || ''))) {
    const retry = { ...settingsPayload };
    delete retry.operator_language;
    delete retry.business_info;
    delete retry.reminders_enabled;
    delete retry.review_followup_enabled;
    delete retry.lead_alerts_enabled;
    delete retry.lead_auto_reply_enabled;
    ({ data, error } = await supabase
      .from('jenny_pro_settings')
      .upsert(retry, { onConflict: 'company_id' })
      .select()
      .single());
  }

  if (error) {
    console.error('[Jenny Pro Settings] Error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
