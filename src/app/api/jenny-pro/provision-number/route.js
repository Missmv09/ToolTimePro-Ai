import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
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

function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return Twilio(sid, token);
}

// Absolute base URL for the webhooks Twilio will call. Netlify sets URL.
function baseUrl() {
  const raw =
    process.env.PUBLIC_BASE_URL ||
    process.env.URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.taskiguana.com';
  return raw.replace(/\/$/, '');
}

/**
 * Provision a dedicated Jenny phone number for the caller's company.
 *
 * Buys a US local number, points its voice + SMS webhooks at Jenny's routes,
 * attaches it to the A2P Messaging Service (for SMS deliverability), and saves
 * the number → company mapping. Idempotent: returns the existing number if the
 * company already has one.
 *
 * POST body: { areaCode?: string, _authToken?: string }
 */
export async function POST(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
  if (authResponse) return authResponse;

  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found for this user' }, { status: 400 });
  }
  const companyId = dbUser.company_id;

  // Idempotent — never buy a second number for a company that already has one.
  const { data: existing } = await supabase
    .from('company_phone_numbers')
    .select('phone_number')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (existing?.phone_number) {
    return NextResponse.json({ phoneNumber: existing.phone_number, alreadyProvisioned: true });
  }

  const client = getTwilio();
  if (!client) {
    return NextResponse.json(
      { error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' },
      { status: 500 }
    );
  }

  const base = baseUrl();
  const areaCode = String(body?.areaCode || '').replace(/\D/g, '').slice(0, 3);

  try {
    // 1. Find an available local number (voice + SMS capable).
    const searchOpts = { smsEnabled: true, voiceEnabled: true, limit: 1 };
    if (areaCode.length === 3) searchOpts.areaCode = parseInt(areaCode, 10);

    let available = await client.availablePhoneNumbers('US').local.list(searchOpts);
    if ((!available || available.length === 0) && searchOpts.areaCode) {
      // Nothing in that area code — fall back to any US local number.
      available = await client
        .availablePhoneNumbers('US')
        .local.list({ smsEnabled: true, voiceEnabled: true, limit: 1 });
    }
    if (!available || available.length === 0) {
      return NextResponse.json(
        { error: 'No phone numbers available right now. Try a different area code.' },
        { status: 409 }
      );
    }

    // 2. Purchase it, wiring the webhooks to Jenny's routes.
    const purchased = await client.incomingPhoneNumbers.create({
      phoneNumber: available[0].phoneNumber,
      voiceUrl: `${base}/api/jenny-pro/voice`,
      voiceMethod: 'POST',
      smsUrl: `${base}/api/jenny-pro/sms-webhook`,
      smsMethod: 'POST',
      friendlyName: `Jenny — company ${companyId}`,
    });

    // 3. Attach to the A2P Messaging Service (best-effort — required for SMS
    //    deliverability to US numbers, but never block provisioning on it).
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    let attachedToCampaign = false;
    if (messagingServiceSid) {
      try {
        await client.messaging.v1
          .services(messagingServiceSid)
          .phoneNumbers.create({ phoneNumberSid: purchased.sid });
        attachedToCampaign = true;
      } catch (e) {
        console.error('[provision] Messaging Service attach failed:', e.message);
      }
    }

    // 4. Save the number → company mapping.
    const { error: saveError } = await supabase.from('company_phone_numbers').upsert(
      {
        company_id: companyId,
        phone_number: purchased.phoneNumber,
        label: 'jenny',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_number' }
    );
    if (saveError) {
      console.error('[provision] mapping save error:', saveError);
      return NextResponse.json(
        { error: 'Number purchased but the mapping failed to save. Please contact support.', phoneNumber: purchased.phoneNumber },
        { status: 500 }
      );
    }

    return NextResponse.json({
      phoneNumber: purchased.phoneNumber,
      sid: purchased.sid,
      attachedToCampaign,
    });
  } catch (err) {
    console.error('[provision] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to provision a number' },
      { status: 500 }
    );
  }
}
