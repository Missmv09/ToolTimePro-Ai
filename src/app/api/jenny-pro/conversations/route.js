import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/server-auth';
import {
  sendOwnerReply,
  resolveConversation,
  handBackToJenny,
  takeOverConversation,
} from '@/lib/jenny-inbox';

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

const ACTIONS = new Set(['reply', 'resolve', 'handback', 'takeover']);

/**
 * Owner inbox actions on a Jenny SMS thread.
 *
 * POST { action: 'reply', conversationId, body }     — text the customer as a human
 * POST { action: 'resolve', conversationId }         — close the thread
 * POST { action: 'handback', conversationId }        — let Jenny answer again
 * POST { action: 'takeover', conversationId }        — Jenny goes quiet, owner drives
 *
 * Reading the thread happens client-side through RLS (jenny_sms_messages has a
 * SELECT policy scoped to the company); writes go through here so the tenant
 * check and the Twilio send stay server-side.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { user, error: authResponse } = await authenticateRequest(request, body?._authToken);
  if (authResponse) return authResponse;

  const action = body?.action;
  if (!ACTIONS.has(action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 });
  }
  if (dbUser.role && !['owner', 'admin', 'manager', 'office'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const common = { supabase, companyId: dbUser.company_id, conversationId: body.conversationId };

  try {
    let result;
    switch (action) {
      case 'reply':
        result = await sendOwnerReply({ ...common, userId: user.id, body: body.body });
        break;
      case 'resolve':
        result = await resolveConversation(common);
        break;
      case 'handback':
        result = await handBackToJenny(common);
        break;
      case 'takeover':
        result = await takeOverConversation(common);
        break;
      default:
        result = { ok: false, error: 'Unknown action' };
    }

    if (!result.ok) {
      const status = result.error === 'Conversation not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[jenny-pro/conversations] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
