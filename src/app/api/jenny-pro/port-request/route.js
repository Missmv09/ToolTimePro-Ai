import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';
import { notifyOperatorInApp } from '@/lib/jenny-notify';

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

function toE164(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (String(raw).trim().startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

// Non-terminal port statuses (still "in flight").
const ACTIVE_PORT_STATUSES = ['submitted', 'waiting_signature', 'in_review', 'in_progress', 'action_required'];

async function getCompanyId(supabase, userId) {
  const { data } = await supabase.from('users').select('company_id').eq('id', userId).single();
  return data?.company_id || null;
}

/**
 * Start a port-in for the contractor's existing number.
 *
 * Porting is an async carrier process (1–4 weeks). This records the request,
 * notifies the company, and — when Twilio porting is enabled on the account —
 * can submit it to Twilio. The /port-status webhook advances the status and
 * auto-wires the number to the company once the port completes.
 *
 * POST body: { phoneNumber, authorizedRepName, authorizedRepEmail,
 *              currentCarrier, accountNumber, billUrl, _authToken }
 */
export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
  if (authResponse) return authResponse;

  const supabase = getSupabase();
  const companyId = await getCompanyId(supabase, user.id);
  if (!companyId) return NextResponse.json({ error: 'No company found for this user' }, { status: 400 });

  const phoneNumber = toE164(body?.phoneNumber);
  const authorizedRepEmail = (body?.authorizedRepEmail || '').trim();
  if (!body?.phoneNumber || phoneNumber.length < 11) {
    return NextResponse.json({ error: 'A valid phone number is required.' }, { status: 400 });
  }
  if (!authorizedRepEmail || !authorizedRepEmail.includes('@')) {
    return NextResponse.json({ error: 'An authorized representative email is required to sign the port authorization.' }, { status: 400 });
  }

  // Idempotent: if there's already an in-flight port for this company, return it.
  const { data: existing } = await supabase
    .from('number_port_requests')
    .select('*')
    .eq('company_id', companyId)
    .in('status', ACTIVE_PORT_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ portRequest: existing, alreadyInFlight: true });
  }

  const { data: created, error: insertError } = await supabase
    .from('number_port_requests')
    .insert({
      company_id: companyId,
      phone_number: phoneNumber,
      authorized_rep_name: body?.authorizedRepName || null,
      authorized_rep_email: authorizedRepEmail,
      current_carrier: body?.currentCarrier || null,
      account_number: body?.accountNumber || null,
      bill_url: body?.billUrl || null,
      status: 'submitted',
    })
    .select()
    .single();

  if (insertError) {
    console.error('[port-request] insert error:', insertError);
    return NextResponse.json({ error: 'Could not start the port request.' }, { status: 500 });
  }

  // Let the company know it's in motion.
  await notifyOperatorInApp(supabase, {
    companyId,
    type: 'new_lead',
    title: 'Number port started',
    message: `We're porting ${phoneNumber} to Jenny. You'll get an email to sign the authorization; porting typically takes 1–4 weeks.`,
    link: '/dashboard/jenny-pro',
  });

  return NextResponse.json({ portRequest: created });
}

/** Current port status for the caller's company. */
export async function GET(request) {
  const { user, error: authResponse } = await authenticateRequest(request);
  if (authResponse) return authResponse;

  const supabase = getSupabase();
  const companyId = await getCompanyId(supabase, user.id);
  if (!companyId) return NextResponse.json({ error: 'No company found for this user' }, { status: 400 });

  const { data } = await supabase
    .from('number_port_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ portRequest: data || null });
}
