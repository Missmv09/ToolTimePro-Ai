import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/twilio';
import { buildProposal, RescheduleJob } from '@/lib/jenny-reschedule';

export const dynamic = 'force-dynamic';

const { aiComplete, parseAIJson } = require('@/lib/ai-client');

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

interface CandidateRow {
  id: string;
  title: string | null;
  scheduled_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  customer: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null;
}

function customerOf(row: CandidateRow) {
  return Array.isArray(row.customer) ? row.customer[0] : row.customer;
}

function toRescheduleJob(row: CandidateRow): RescheduleJob {
  const c = customerOf(row);
  return {
    id: row.id,
    scheduled_date: row.scheduled_date,
    scheduled_time_start: row.scheduled_time_start,
    scheduled_time_end: row.scheduled_time_end,
    customerName: c?.name || null,
    title: row.title,
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getAdmin();
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: caller } = await admin
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();
    const companyId = caller?.company_id;
    if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 403 });

    const body = await request.json();

    // ---- CONFIRM: apply a previously previewed change ----
    if (body.confirm) {
      const { jobId, newDate, newStartTime, newEndTime, notifyCustomer } = body;
      if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

      const { data: job } = await admin
        .from('jobs')
        .select('id, company_id, customer:customers(name, phone)')
        .eq('id', jobId)
        .single();
      if (!job || job.company_id !== companyId) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }

      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (newDate) update.scheduled_date = newDate;
      if (newStartTime) update.scheduled_time_start = newStartTime;
      if (newEndTime) update.scheduled_time_end = newEndTime;

      const { error: updErr } = await admin.from('jobs').update(update).eq('id', jobId);
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

      // Notify the customer of the new time when requested.
      let smsSent = false;
      let smsError: string | null = null;
      const cust = Array.isArray(job.customer) ? job.customer[0] : job.customer;
      if (notifyCustomer && body.customerMessage && cust?.phone) {
        const result = await sendSMS({ to: cust.phone, body: body.customerMessage });
        smsSent = result.success;
        if (!result.success) smsError = result.error || 'Failed to send SMS';
      } else if (notifyCustomer && !cust?.phone) {
        smsError = 'Customer has no phone number on file';
      }

      return NextResponse.json({ success: true, smsSent, smsError });
    }

    // ---- PREVIEW: parse the instruction into a proposal (no writes) ----
    const instruction: string = (body.instruction || '').trim();
    if (!instruction) return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });

    // Candidate jobs: upcoming, schedulable.
    const today = new Date().toISOString().split('T')[0];
    const { data: rows } = await admin
      .from('jobs')
      .select('id, title, scheduled_date, scheduled_time_start, scheduled_time_end, customer:customers(name, phone)')
      .eq('company_id', companyId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('scheduled_date', today)
      .order('scheduled_date')
      .limit(100);

    const candidates = (rows || []) as CandidateRow[];
    if (candidates.length === 0) {
      return NextResponse.json({ error: 'No upcoming jobs to reschedule' }, { status: 404 });
    }

    const { data: company } = await admin.from('companies').select('name').eq('id', companyId).single();
    const companyName = company?.name || 'your service provider';

    const candidateList = candidates
      .map((c) => {
        const cust = customerOf(c);
        return `- id:${c.id} | customer:${cust?.name || 'Unknown'} | title:${c.title || ''} | date:${c.scheduled_date || '?'} | start:${c.scheduled_time_start || '?'}`;
      })
      .join('\n');

    const systemPrompt = `You reschedule field-service jobs. Today is ${today}.
From the operator's instruction, pick exactly ONE job from the candidate list and the new date/time.
Respond ONLY with JSON: {"jobId": string, "newDate": "YYYY-MM-DD"|null, "newStartTime": "HH:MM"|null, "newEndTime": "HH:MM"|null, "confidence": 0-1, "note": string}.
Rules:
- jobId MUST be one of the candidate ids. If no job clearly matches, set jobId to "" and explain in note.
- Use 24-hour HH:MM. "afternoon"=>"13:00", "morning"=>"09:00", "end of day"=>"16:00" unless a specific time is given.
- Only set fields the operator wants changed; leave others null.

Candidate jobs:
${candidateList}`;

    let parsed: { jobId?: string; newDate?: string | null; newStartTime?: string | null; newEndTime?: string | null; note?: string } | null = null;
    try {
      const ai = await aiComplete({
        systemPrompt,
        messages: [{ role: 'user', content: instruction }],
        maxTokens: 250,
        temperature: 0.1,
        tier: 'fast',
      });
      parsed = parseAIJson(ai?.content);
    } catch (err) {
      console.error('[jenny-reschedule] AI error:', err);
      return NextResponse.json({ error: 'Could not understand the request. Try naming the customer and the new time.' }, { status: 422 });
    }

    const match = candidates.find((c) => c.id === parsed?.jobId);
    if (!parsed || !parsed.jobId || !match) {
      return NextResponse.json({
        error: parsed?.note || "I couldn't match that to one of your upcoming jobs. Try naming the customer and the new time.",
      }, { status: 422 });
    }

    const proposal = buildProposal(
      toRescheduleJob(match),
      {
        jobId: match.id,
        newDate: parsed.newDate ?? undefined,
        newStartTime: parsed.newStartTime ?? undefined,
        newEndTime: parsed.newEndTime ?? undefined,
      },
      companyName
    );

    const cust = customerOf(match);
    return NextResponse.json({
      proposal: {
        ...proposal,
        newDate: proposal.after.date,
        newStartTime: proposal.after.start,
        newEndTime: proposal.after.end,
        customerHasPhone: !!cust?.phone,
      },
    });
  } catch (err) {
    console.error('[jenny-reschedule] error:', err);
    return NextResponse.json({ error: 'Failed to process reschedule' }, { status: 500 });
  }
}
