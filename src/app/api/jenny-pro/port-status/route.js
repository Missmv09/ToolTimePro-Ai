import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Twilio from 'twilio';
import { wireNumberToCompany } from '@/lib/jenny-twilio-wire';
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

function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return Twilio(sid, token);
}

function baseUrl() {
  const raw =
    process.env.PUBLIC_BASE_URL || process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.taskiguana.com';
  return raw.replace(/\/$/, '');
}

// Map Twilio's port-in statuses onto ours (defensive — beta payload may vary).
function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (s.includes('complete')) return 'completed';
  if (s.includes('signature')) return 'waiting_signature';
  if (s.includes('review')) return 'in_review';
  if (s.includes('progress')) return 'in_progress';
  if (s.includes('action')) return 'action_required';
  if (s.includes('cancel')) return 'canceled';
  if (s.includes('expire') || s.includes('fail') || s.includes('reject')) return 'failed';
  return s || 'in_progress';
}

// Accept JSON or form-encoded; pull fields under any of the likely keys.
async function readPayload(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await request.json(); } catch { return {}; }
  }
  try {
    const form = await request.formData();
    return Object.fromEntries(form.entries());
  } catch {
    return {};
  }
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k];
  }
  return null;
}

/**
 * Twilio port-in status webhook.
 *
 * Advances the matching port request's status and, when the port COMPLETES,
 * auto-wires the now-owned number to the company (webhooks + A2P + mapping) so
 * Jenny answers on the contractor's real number with zero extra steps.
 *
 * Configure as the status-callback URL on your Twilio port-in requests.
 */
export async function POST(request) {
  try {
    const payload = await readPayload(request);
    const portSid = pick(payload, ['PortInSid', 'port_in_sid', 'Sid', 'sid']);
    const rawStatus = pick(payload, ['Status', 'status', 'PortInStatus']);
    const phoneRaw = pick(payload, ['PhoneNumber', 'phone_number', 'phoneNumber']);
    const status = normalizeStatus(rawStatus);

    const supabase = getSupabase();

    // Find the port request by Twilio SID, else by phone number.
    let query = supabase.from('number_port_requests').select('*');
    if (portSid) query = query.eq('twilio_port_in_sid', portSid);
    else if (phoneRaw) query = query.ilike('phone_number', `%${String(phoneRaw).replace(/\D/g, '').slice(-10)}`);
    else return NextResponse.json({ ok: true, skipped: 'no identifier' });

    const { data: req } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!req) return NextResponse.json({ ok: true, skipped: 'no matching request' });

    await supabase
      .from('number_port_requests')
      .update({ status, twilio_port_in_sid: portSid || req.twilio_port_in_sid, updated_at: new Date().toISOString() })
      .eq('id', req.id);

    if (status !== 'completed') {
      return NextResponse.json({ ok: true, status });
    }

    // ── Port completed → wire the number to the company ────────────────────
    const client = getTwilio();
    if (client) {
      try {
        // The ported number now lives in the account; find its IncomingPhoneNumber SID.
        const last10 = req.phone_number.replace(/\D/g, '').slice(-10);
        const matches = await client.incomingPhoneNumbers.list({ phoneNumber: req.phone_number, limit: 1 });
        const incoming = matches?.[0] || (await client.incomingPhoneNumbers.list({ limit: 50 }))
          .find((n) => n.phoneNumber?.replace(/\D/g, '').endsWith(last10));

        if (incoming?.sid) {
          await wireNumberToCompany({
            client,
            supabase,
            companyId: req.company_id,
            phoneNumberSid: incoming.sid,
            phoneNumber: req.phone_number,
            baseUrl: baseUrl(),
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
          });
        } else {
          console.error('[port-status] completed but number not found in account:', req.phone_number);
        }
      } catch (e) {
        console.error('[port-status] wiring failed:', e.message);
      }
    }

    await notifyOperatorInApp(supabase, {
      companyId: req.company_id,
      type: 'booking_received',
      title: 'Your number is live on Jenny 🎉',
      message: `${req.phone_number} finished porting. Jenny now answers texts and calls on your number.`,
      link: '/dashboard/jenny-pro',
    });

    return NextResponse.json({ ok: true, status: 'completed' });
  } catch (error) {
    console.error('[port-status] error:', error);
    return NextResponse.json({ ok: true });
  }
}
