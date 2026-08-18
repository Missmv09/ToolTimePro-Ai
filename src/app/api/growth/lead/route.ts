import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  validateLeadInput,
  buildLeadRecord,
  buildLeadUpdate,
} from '@/lib/growth-leads';

export const dynamic = 'force-dynamic';

/**
 * Growth lead capture.
 *
 * Public endpoint backing the email capture on the free tools. Writes to
 * growth_leads, which is platform-private (migration 048) — hence the service
 * role client rather than a user-scoped one.
 *
 * Deliberately quiet: every non-server-error path returns the same 200 body.
 * Telling a caller "that email already exists" turns this into an account
 * enumeration oracle, and the form has nothing useful to do with the
 * distinction anyway.
 */

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  supabaseInstance = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseInstance;
}

const OK = { ok: true } as const;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Honeypot. A real browser leaves this hidden field empty; scripted spam
  // fills every input it finds. Answer 200 so the bot has no signal to adapt.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
    return NextResponse.json(OK);
  }

  const validation = validateLeadInput(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const input = validation.data;

  const supabase = getSupabase();
  if (!supabase) {
    console.error('[Growth Lead] Supabase env vars not configured');
    return NextResponse.json({ error: 'Lead capture is not configured' }, { status: 503 });
  }

  const now = new Date().toISOString();

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('growth_leads')
      .select('id, metadata, marketing_consent')
      .eq('email', input.email)
      .maybeSingle();

    if (lookupError) {
      console.error('[Growth Lead] Lookup failed:', lookupError.message);
      return NextResponse.json({ error: 'Could not save your email' }, { status: 500 });
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('growth_leads')
        .update(buildLeadUpdate(input, existing, now))
        .eq('id', existing.id);

      if (updateError) {
        console.error('[Growth Lead] Update failed:', updateError.message);
        return NextResponse.json({ error: 'Could not save your email' }, { status: 500 });
      }

      return NextResponse.json(OK);
    }

    const { error: insertError } = await supabase
      .from('growth_leads')
      .insert(buildLeadRecord(input, now));

    if (insertError) {
      // 23505 = unique violation. Two submissions raced past the lookup above;
      // the row exists either way, which is the outcome the caller wanted.
      if (insertError.code === '23505') {
        return NextResponse.json(OK);
      }
      console.error('[Growth Lead] Insert failed:', insertError.message);
      return NextResponse.json({ error: 'Could not save your email' }, { status: 500 });
    }

    console.log(`[Growth Lead] Captured from ${input.source}`);
    return NextResponse.json(OK);
  } catch (error) {
    console.error('[Growth Lead] Unexpected error:', error);
    return NextResponse.json({ error: 'Could not save your email' }, { status: 500 });
  }
}
