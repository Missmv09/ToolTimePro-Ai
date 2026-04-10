import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pricesNeedAttention, calculatePriceIntelligence, type CategoryStalenessStatus } from '@/lib/supplier-pricing';
import { getMaterialsByTrade, getMaterialById, type TradeType } from '@/lib/materials-database';
import { getEnabledStates, isRulesStale, type StateComplianceRules } from '@/lib/state-compliance';

export const dynamic = 'force-dynamic';

type SB = SupabaseClient;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET — Cron-triggered: Run all autonomous Jenny actions across all companies
export async function GET(request: NextRequest) {
  // Verify cron secret — reject if not configured or doesn't match
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const results = {
    auto_dispatch: { checked: 0, acted: 0 },
    lead_follow_up: { checked: 0, acted: 0 },
    cash_flow_alert: { checked: 0, acted: 0 },
    job_costing: { checked: 0, acted: 0 },
    review_request: { checked: 0, acted: 0 },
    price_staleness: { checked: 0, acted: 0 },
    hr_law_update: { checked: 0, acted: 0 },
    cert_expiration: { checked: 0, acted: 0 },
    insurance_expiry: { checked: 0, acted: 0 },
    w9_compliance: { checked: 0, acted: 0 },
    classification_review: { checked: 0, acted: 0 },
    compliance_escalation: { checked: 0, acted: 0 },
    quote_expiration: { checked: 0, acted: 0 },
    contractor_payment: { checked: 0, acted: 0 },
    contract_end_date: { checked: 0, acted: 0 },
  };

  try {
    // Get all enabled action configs
    const { data: allConfigs } = await supabase
      .from('jenny_action_configs')
      .select('*, company:companies(id, name, phone, email)')
      .eq('enabled', true);

    if (!allConfigs || allConfigs.length === 0) {
      return NextResponse.json({ message: 'No enabled actions', results });
    }

    // Group configs by company
    const byCompany = new Map<string, typeof allConfigs>();
    for (const config of allConfigs) {
      const list = byCompany.get(config.company_id) || [];
      list.push(config);
      byCompany.set(config.company_id, list);
    }

    // Process each company
    for (const [companyId, companyConfigs] of byCompany) {
      for (const actionConfig of companyConfigs) {
        const config = actionConfig.config as Record<string, unknown>;

        switch (actionConfig.action_type) {
          case 'auto_dispatch':
            results.auto_dispatch.checked++;
            results.auto_dispatch.acted += await runAutoDispatch(supabase, companyId, config);
            break;

          case 'lead_follow_up':
            results.lead_follow_up.checked++;
            results.lead_follow_up.acted += await runLeadFollowUp(supabase, companyId, config);
            break;

          case 'cash_flow_alert':
            results.cash_flow_alert.checked++;
            results.cash_flow_alert.acted += await runCashFlowAlerts(supabase, companyId, config);
            break;

          case 'job_costing':
            results.job_costing.checked++;
            results.job_costing.acted += await runJobCosting(supabase, companyId, config);
            break;

          case 'cert_expiration':
            results.cert_expiration.checked++;
            results.cert_expiration.acted += await runCertExpirationCheck(supabase, companyId, config);
            break;

          case 'insurance_expiry':
            results.insurance_expiry.checked++;
            results.insurance_expiry.acted += await runInsuranceExpiryCheck(supabase, companyId, config);
            break;

          case 'w9_compliance':
            results.w9_compliance.checked++;
            results.w9_compliance.acted += await runW9ComplianceCheck(supabase, companyId);
            break;

          case 'classification_review':
            results.classification_review.checked++;
            results.classification_review.acted += await runClassificationReviewCheck(supabase, companyId, config);
            break;

          case 'compliance_escalation':
            results.compliance_escalation.checked++;
            results.compliance_escalation.acted += await runComplianceEscalation(supabase, companyId, config);
            break;

          case 'quote_expiration':
            results.quote_expiration.checked++;
            results.quote_expiration.acted += await runQuoteExpirationCheck(supabase, companyId, config);
            break;

          case 'contractor_payment':
            results.contractor_payment.checked++;
            results.contractor_payment.acted += await runContractorPaymentCheck(supabase, companyId, config);
            break;

          case 'contract_end_date':
            results.contract_end_date.checked++;
            results.contract_end_date.acted += await runContractEndDateCheck(supabase, companyId, config);
            break;

          case 'review_request':
            results.review_request.checked++;
            results.review_request.acted += await runReviewRequest(supabase, companyId, config);
            break;
        }
      }

      // Update last-run timestamp for this company
      await supabase.from('jenny_cron_runs').upsert({
        company_id: companyId,
        ran_at: new Date().toISOString(),
        results,
      }, { onConflict: 'company_id' });
    }

    // ============================================================
    // PRICE STALENESS CHECK (runs monthly, not per-company)
    // ============================================================
    results.price_staleness.checked = 1;
    results.price_staleness.acted = await runPriceStalenessCheck(supabase);

    // ============================================================
    // HR LAW UPDATE CHECK (runs weekly, not per-company)
    // ============================================================
    results.hr_law_update.checked = 1;
    results.hr_law_update.acted = await runHrLawUpdateCheck(supabase);

    return NextResponse.json({ message: 'Jenny actions complete', results, ran_at: new Date().toISOString() });
  } catch (err: unknown) {
    console.error('Jenny actions cron error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ============================================================
// AUTO-DISPATCH: Assign unassigned jobs to available workers
// ============================================================
async function runAutoDispatch(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;

  // Find unassigned scheduled jobs for today or tomorrow
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data: unassignedJobs } = await supabase
    .from('jobs')
    .select('id, title, customer_id, scheduled_date, scheduled_time_start, address')
    .eq('company_id', companyId)
    .eq('status', 'scheduled')
    .in('scheduled_date', [today, tomorrow]);

  if (!unassignedJobs || unassignedJobs.length === 0) return 0;

  // Check which jobs already have assignments
  const jobIds = unassignedJobs.map((j: { id: string }) => j.id);
  const { data: existingAssignments } = await supabase
    .from('job_assignments')
    .select('job_id')
    .in('job_id', jobIds);

  const assignedJobIds = new Set((existingAssignments || []).map((a: { job_id: string }) => a.job_id));
  const needsAssignment = unassignedJobs.filter((j: { id: string }) => !assignedJobIds.has(j.id));

  if (needsAssignment.length === 0) return 0;

  // Get available workers
  const { data: workers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .in('role', ['worker', 'worker_admin']);

  if (!workers || workers.length === 0) return 0;

  // Count today's assignments per worker
  const { data: todayAssignments } = await supabase
    .from('job_assignments')
    .select('user_id, job:jobs!inner(scheduled_date)')
    .in('user_id', workers.map((w: { id: string }) => w.id));

  const assignmentCounts = new Map<string, number>();
  for (const a of (todayAssignments || [])) {
    const count = assignmentCounts.get(a.user_id) || 0;
    assignmentCounts.set(a.user_id, count + 1);
  }

  // Strategy: least_busy (default) — assign to worker with fewest jobs
  const strategy = (config.assign_strategy as string) || 'least_busy';
  const requireApproval = config.require_approval !== false;

  for (const job of needsAssignment) {
    // Sort workers by assignment count (least busy first)
    const sortedWorkers = [...workers].sort((a: { id: string }, b: { id: string }) => {
      return (assignmentCounts.get(a.id) || 0) - (assignmentCounts.get(b.id) || 0);
    });

    const selectedWorker = sortedWorkers[0] as { id: string; full_name: string };
    if (!selectedWorker) continue;

    if (requireApproval) {
      // Log as pending — owner must approve
      await supabase.from('jenny_action_log').insert({
        company_id: companyId,
        action_type: 'auto_dispatch',
        title: `Suggest: Assign ${selectedWorker.full_name} to ${job.title}`,
        description: `Jenny recommends assigning ${selectedWorker.full_name} (least busy) to "${job.title}" on ${job.scheduled_date}. Awaiting your approval.`,
        status: 'pending',
        target_id: job.id,
        target_type: 'job',
        target_name: job.title,
        metadata: { worker_id: selectedWorker.id, worker_name: selectedWorker.full_name, strategy },
      });
    } else {
      // Auto-assign
      const { error } = await supabase.from('job_assignments').insert({
        job_id: job.id,
        user_id: selectedWorker.id,
      });

      if (!error) {
        await supabase.from('jenny_action_log').insert({
          company_id: companyId,
          action_type: 'auto_dispatch',
          title: `Assigned ${selectedWorker.full_name} to ${job.title}`,
          description: `Jenny auto-assigned ${selectedWorker.full_name} to "${job.title}" on ${job.scheduled_date} using ${strategy} strategy.`,
          status: 'executed',
          target_id: job.id,
          target_type: 'job',
          target_name: job.title,
          metadata: { worker_id: selectedWorker.id, worker_name: selectedWorker.full_name, strategy },
          executed_at: new Date().toISOString(),
        });

        // Update assignment count for next iteration
        assignmentCounts.set(selectedWorker.id, (assignmentCounts.get(selectedWorker.id) || 0) + 1);
      }
    }
    acted++;
  }

  return acted;
}

// ============================================================
// LEAD FOLLOW-UP: Re-engage cold leads via SMS
// ============================================================
async function runLeadFollowUp(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const followUpDays = (config.follow_up_days as number[]) || [3, 7, 14];
  const maxAttempts = (config.max_attempts as number) || 3;
  const messages = (config.messages as { day: number; sms_template: string }[]) || [];

  // Get company info for message templates
  const { data: company } = await supabase
    .from('companies')
    .select('name, phone')
    .eq('id', companyId)
    .single();

  if (!company) return 0;

  // Find leads that are "quoted" or "contacted" but not booked/won/lost
  const { data: coldLeads } = await supabase
    .from('leads')
    .select('id, name, phone, email, service_requested, status, created_at, customer_id')
    .eq('company_id', companyId)
    .in('status', ['new', 'contacted', 'quoted']);

  if (!coldLeads || coldLeads.length === 0) return 0;

  // Check existing follow-ups
  const leadIds = coldLeads.map((l: { id: string }) => l.id);
  const { data: existingFollowUps } = await supabase
    .from('lead_follow_ups')
    .select('lead_id, attempt_number')
    .in('lead_id', leadIds);

  const followUpMap = new Map<string, number>(); // lead_id -> max attempt
  for (const fu of (existingFollowUps || [])) {
    const current = followUpMap.get(fu.lead_id) || 0;
    followUpMap.set(fu.lead_id, Math.max(current, fu.attempt_number));
  }

  const now = new Date();

  for (const lead of coldLeads) {
    if (!lead.phone) continue;

    const leadAge = Math.floor((now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const attemptsDone = followUpMap.get(lead.id) || 0;

    if (attemptsDone >= maxAttempts) continue;

    // Find the next follow-up day that applies
    const nextAttempt = attemptsDone + 1;
    const targetDay = followUpDays[attemptsDone]; // 0-indexed: attempt 0 → day[0]

    if (!targetDay || leadAge < targetDay) continue;

    // Check if we already sent for this exact day
    if (attemptsDone > 0 && leadAge === targetDay) {
      // Already covered by previous check
    }

    // Build message from template
    const messageTemplate = messages[attemptsDone]?.sms_template ||
      `Hi ${lead.name}, following up from ${company.name} about your project. Still interested? Call us at ${company.phone || 'our office'}.`;

    const message = messageTemplate
      .replace(/{customer_name}/g, lead.name || 'there')
      .replace(/{company_name}/g, company.name || 'us')
      .replace(/{service}/g, lead.service_requested || 'your project')
      .replace(/{phone}/g, company.phone || '');

    // Record the follow-up
    const { error: fuError } = await supabase.from('lead_follow_ups').insert({
      company_id: companyId,
      lead_id: lead.id,
      attempt_number: nextAttempt,
      channel: 'sms',
      message,
    });

    if (!fuError) {
      // Log the action
      await supabase.from('jenny_action_log').insert({
        company_id: companyId,
        action_type: 'lead_follow_up',
        title: `Follow-up #${nextAttempt} sent to ${lead.name}`,
        description: `Jenny sent a ${targetDay}-day follow-up SMS to ${lead.name} (${lead.phone}) about "${lead.service_requested || 'their project'}".`,
        status: 'executed',
        target_id: lead.id,
        target_type: 'lead',
        target_name: lead.name,
        metadata: { attempt: nextAttempt, day: targetDay, phone: lead.phone },
        executed_at: new Date().toISOString(),
      });

      // Update lead follow_up_date
      await supabase.from('leads').update({
        follow_up_date: new Date(now.getTime() + (followUpDays[nextAttempt] || 30) * 86400000).toISOString().split('T')[0],
      }).eq('id', lead.id);

      acted++;
    }
  }

  return acted;
}

// ============================================================
// CASH FLOW ALERTS: Detect overdue invoices and alert owner
// ============================================================
async function runCashFlowAlerts(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const thresholdDays = (config.overdue_threshold_days as number) || 1;

  // Find overdue invoices
  const now = new Date();
  const thresholdDate = new Date(now.getTime() - thresholdDays * 86400000).toISOString();

  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, amount_paid, due_date, customer_id, customer:customers(name, phone, email)')
    .eq('company_id', companyId)
    .in('status', ['sent', 'viewed', 'partial'])
    .lt('due_date', thresholdDate);

  if (!overdueInvoices || overdueInvoices.length === 0) return 0;

  // Check if we already alerted about these invoices today
  const today = now.toISOString().split('T')[0];
  const { data: todayAlerts } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'cash_flow_alert')
    .gte('created_at', `${today}T00:00:00`);

  const alreadyAlerted = new Set((todayAlerts || []).map((a: { target_id: string }) => a.target_id));

  // Calculate totals
  let totalOverdue = 0;
  const newOverdue = overdueInvoices.filter((inv: { id: string; total: number; amount_paid: number }) => {
    if (alreadyAlerted.has(inv.id)) return false;
    totalOverdue += (inv.total - inv.amount_paid);
    return true;
  });

  if (newOverdue.length === 0) return 0;

  // Create summary alert
  await supabase.from('jenny_action_log').insert({
    company_id: companyId,
    action_type: 'cash_flow_alert',
    title: `$${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })} in overdue invoices`,
    description: `You have ${newOverdue.length} overdue invoice${newOverdue.length > 1 ? 's' : ''} totaling $${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}. ${config.auto_send_reminder ? 'Jenny will send payment reminders.' : 'Would you like Jenny to send payment reminders?'}`,
    status: 'executed',
    target_id: null,
    target_type: 'invoice',
    target_name: `${newOverdue.length} overdue invoices`,
    metadata: {
      total_overdue: totalOverdue,
      invoice_count: newOverdue.length,
      invoices: newOverdue.map((inv: { id: string; invoice_number: string; total: number; amount_paid: number; due_date: string }) => ({
        id: inv.id,
        number: inv.invoice_number,
        balance: inv.total - inv.amount_paid,
        due_date: inv.due_date,
      })),
    },
    executed_at: new Date().toISOString(),
  });

  acted++;

  // Log individual invoice alerts
  for (const inv of newOverdue) {
    const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
    const balance = inv.total - inv.amount_paid;
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'cash_flow_alert',
      title: `Invoice #${inv.invoice_number}: $${balance.toFixed(2)} overdue (${daysOverdue} days)`,
      description: `${customer?.name || 'Customer'} owes $${balance.toFixed(2)} on invoice #${inv.invoice_number}, ${daysOverdue} days past due.`,
      status: 'executed',
      target_id: inv.id,
      target_type: 'invoice',
      target_name: `Invoice #${inv.invoice_number}`,
      metadata: { customer_name: customer?.name, balance, days_overdue: daysOverdue },
      executed_at: new Date().toISOString(),
    });
  }

  return acted;
}

// ============================================================
// JOB COSTING: Calculate profit vs. quoted price on completed jobs
// ============================================================
async function runJobCosting(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const alertThreshold = (config.alert_threshold_percent as number) || 20;

  // Find completed jobs that haven't been cost-analyzed yet
  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('id, title, total_amount, customer_id')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .not('total_amount', 'is', null);

  if (!completedJobs || completedJobs.length === 0) return 0;

  // Check which jobs already have cost records
  const jobIds = completedJobs.map((j: { id: string }) => j.id);
  const { data: existingCosts } = await supabase
    .from('job_costs')
    .select('job_id')
    .in('job_id', jobIds);

  const costedJobIds = new Set((existingCosts || []).map((c: { job_id: string }) => c.job_id));
  const needsCosting = completedJobs.filter((j: { id: string }) => !costedJobIds.has(j.id));

  if (needsCosting.length === 0) return 0;

  for (const job of needsCosting) {
    const quotedAmount = job.total_amount || 0;

    // Calculate labor cost from time entries
    let laborHours = 0;
    let laborCost = 0;

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('clock_in, clock_out, break_minutes, user_id, user:users(hourly_rate)')
      .eq('job_id', job.id)
      .eq('status', 'completed');

    for (const entry of (timeEntries || [])) {
      if (!entry.clock_out) continue;
      const e = entry as unknown as { clock_in: string; clock_out: string; break_minutes: number; user: { hourly_rate: number }[] | { hourly_rate: number } | null };
      const hours = (new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime()) / (1000 * 60 * 60) - (e.break_minutes || 0) / 60;
      const h = Math.max(0, hours);
      laborHours += h;
      const userObj = Array.isArray(e.user) ? e.user[0] : e.user;
      const rate = userObj?.hourly_rate || 0;
      laborCost += h * rate;
    }

    const totalCost = laborCost; // Materials would be added here when material tracking exists
    const profit = quotedAmount - totalCost;
    const profitMargin = quotedAmount > 0 ? (profit / quotedAmount) * 100 : 0;

    // Save cost record
    await supabase.from('job_costs').insert({
      company_id: companyId,
      job_id: job.id,
      quoted_amount: quotedAmount,
      labor_cost: Math.round(laborCost * 100) / 100,
      labor_hours: Math.round(laborHours * 100) / 100,
      material_cost: 0,
      other_cost: 0,
      total_cost: Math.round(totalCost * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      profit_margin: Math.round(profitMargin * 100) / 100,
    });

    // Log action
    const isUnprofitable = profitMargin < alertThreshold;
    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'job_costing',
      title: isUnprofitable
        ? `Low profit on "${job.title}": ${profitMargin.toFixed(0)}% margin`
        : `"${job.title}": ${profitMargin.toFixed(0)}% profit margin`,
      description: isUnprofitable
        ? `"${job.title}" earned $${profit.toFixed(2)} profit on a $${quotedAmount.toFixed(2)} job (${profitMargin.toFixed(1)}% margin). Labor: ${laborHours.toFixed(1)}h at $${laborCost.toFixed(2)}. This is below your ${alertThreshold}% threshold.`
        : `"${job.title}": Quoted $${quotedAmount.toFixed(2)}, labor cost $${laborCost.toFixed(2)} (${laborHours.toFixed(1)}h). Profit: $${profit.toFixed(2)} (${profitMargin.toFixed(1)}%).`,
      status: 'executed',
      target_id: job.id,
      target_type: 'job',
      target_name: job.title,
      metadata: { quoted: quotedAmount, labor_cost: laborCost, labor_hours: laborHours, profit, margin: profitMargin, below_threshold: isUnprofitable },
      executed_at: new Date().toISOString(),
    });

    acted++;
  }

  return acted;
}

// ============================================================
// REVIEW REQUESTS (legacy wrapper — main uses runReviewRequest below)
// ============================================================
async function runReviewRequests(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const delayHours = (config.delay_hours as number) || 2;

  // Read review links from config first, fall back to companies table
  let googleLink = (config.google_review_link as string) || '';
  let yelpLink = (config.yelp_review_link as string) || '';

  const { data: company } = await supabase
    .from('companies')
    .select('name, phone, google_review_link, yelp_review_link')
    .eq('id', companyId)
    .single();

  if (company) {
    if (!googleLink) googleLink = (company as any).google_review_link || '';
    if (!yelpLink) yelpLink = (company as any).yelp_review_link || '';
  }

  if (!googleLink && !yelpLink) return 0; // Need at least one review link

  // Determine platform — alternate if both are set
  let reviewPlatform: 'google' | 'yelp' = 'google';
  let reviewLink = googleLink;

  if (googleLink && yelpLink) {
    const { data: lastReq } = await (supabase as any)
      .from('review_requests')
      .select('review_platform')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1);
    const lastPlatform = lastReq?.[0]?.review_platform;
    if (lastPlatform === 'google') {
      reviewPlatform = 'yelp';
      reviewLink = yelpLink;
    } else {
      reviewPlatform = 'google';
      reviewLink = googleLink;
    }
  } else if (yelpLink && !googleLink) {
    reviewPlatform = 'yelp';
    reviewLink = yelpLink;
  }

  // Find completed jobs from the last 7 days that haven't had review requests sent
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const delayThreshold = new Date();
  delayThreshold.setHours(delayThreshold.getHours() - delayHours);

  const { data: completedJobs } = await supabase
    .from('jobs')
    .select('id, title, customer_id, updated_at, customer:customers(id, name, phone, email, sms_consent)')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('updated_at', sevenDaysAgo.toISOString())
    .lte('updated_at', delayThreshold.toISOString()); // Only jobs completed at least X hours ago

  if (!completedJobs || completedJobs.length === 0) return 0;

  // Check which jobs already have review requests
  const jobIds = completedJobs.map((j: any) => j.id);
  const { data: existingRequests } = await (supabase as any)
    .from('review_requests')
    .select('job_id')
    .in('job_id', jobIds);

  const alreadyRequested = new Set((existingRequests || []).map((r: any) => r.job_id));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.tooltimepro.com';
  const platformLabel = reviewPlatform === 'google' ? 'Google' : 'Yelp';

  for (const job of completedJobs) {
    if (alreadyRequested.has(job.id)) continue;

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
    if (!customer?.phone) continue;

    // Generate tracking token
    const trackingToken = `rv-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}`;
    const trackingUrl = `${siteUrl}/r/${trackingToken}`;

    // Create review request record
    await (supabase as any).from('review_requests').insert({
      company_id: companyId,
      job_id: job.id,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      review_link: reviewLink,
      review_platform: reviewPlatform,
      status: 'sent',
      channel: 'sms',
      sent_at: new Date().toISOString(),
      tracking_token: trackingToken,
    });

    // Log the action
    await (supabase as any).from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'review_request',
      title: `${platformLabel} review request sent to ${customer.name}`,
      description: `Jenny sent a ${platformLabel} review request to ${customer.name} (${customer.phone}) after completing "${job.title}".`,
      status: 'executed',
      target_id: job.id,
      target_type: 'job',
      target_name: job.title,
      metadata: { customer_name: customer.name, phone: customer.phone, tracking_token: trackingToken, review_platform: reviewPlatform },
      executed_at: new Date().toISOString(),
    });

    acted++;
  }

  return acted;
}

// ============================================================
// PRICE STALENESS: Per-category volatility check + crowd-sourced drift
// ============================================================
async function runPriceStalenessCheck(supabase: SB): Promise<number> {
  // Only run once per month — check if we already alerted this month
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01T00:00:00`;

  const { data: existingAlert } = await supabase
    .from('jenny_action_log')
    .select('id')
    .eq('action_type', 'price_staleness')
    .gte('created_at', monthStart)
    .limit(1);

  if (existingAlert && existingAlert.length > 0) return 0; // Already ran this month

  let acted = 0;

  // --- PHASE 2: Per-category volatility check ---
  const priceStatus = pricesNeedAttention();

  if (priceStatus.needsUpdate) {
    const ALL_TRADES: TradeType[] = [
      'painting', 'plumbing', 'electrical', 'landscaping', 'handyman', 'flooring',
      'lawn_care', 'pool_service', 'hvac', 'roofing', 'fencing', 'concrete',
      'carpentry', 'irrigation', 'pressure_washing', 'insulation', 'siding',
      'drywall', 'tree_service', 'solar', 'garage_door',
    ];

    let totalMaterials = 0;
    for (const trade of ALL_TRADES) {
      totalMaterials += getMaterialsByTrade(trade).length;
    }

    const staleCount = priceStatus.staleCategories.length;
    const warningCount = priceStatus.warningCategories.length;

    // Build category-specific details
    const formatCategory = (c: CategoryStalenessStatus) =>
      `${c.category} (${c.volatilityTier} volatility): ${c.isStale ? `STALE — ${c.daysSinceUpdate} days old` : `${c.daysUntilStale} days until stale`}`;

    const staleList = priceStatus.staleCategories.map(formatCategory);
    const warningList = priceStatus.warningCategories.map(formatCategory);

    const hasStale = staleCount > 0;
    const title = hasStale
      ? `${staleCount} material ${staleCount === 1 ? 'category' : 'categories'} have stale prices`
      : `${warningCount} material ${warningCount === 1 ? 'category' : 'categories'} approaching staleness`;

    const description = [
      hasStale
        ? `${staleCount} high-volatility material ${staleCount === 1 ? 'category has' : 'categories have'} exceeded ${staleCount === 1 ? 'its' : 'their'} refresh threshold. Quotes using these materials may be inaccurate.`
        : `${warningCount} material ${warningCount === 1 ? 'category is' : 'categories are'} approaching ${warningCount === 1 ? 'its' : 'their'} refresh threshold.`,
      '',
      staleList.length > 0 ? `STALE:\n${staleList.map(s => `  - ${s}`).join('\n')}` : '',
      warningList.length > 0 ? `WARNING:\n${warningList.map(s => `  - ${s}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');

    await supabase.from('jenny_action_log').insert({
      company_id: null,
      action_type: 'price_staleness',
      title,
      description,
      status: 'executed',
      target_id: null,
      target_type: 'material_pricing',
      target_name: `${totalMaterials} materials across ${ALL_TRADES.length} trades`,
      metadata: {
        days_since_update: priceStatus.daysSinceUpdate,
        total_materials: totalMaterials,
        total_trades: ALL_TRADES.length,
        price_base_date: '2026-01-01',
        stale_categories: priceStatus.staleCategories.map(c => ({ category: c.category, tier: c.volatilityTier, days: c.daysSinceUpdate })),
        warning_categories: priceStatus.warningCategories.map(c => ({ category: c.category, tier: c.volatilityTier, daysLeft: c.daysUntilStale })),
        is_stale: hasStale,
      },
      executed_at: now.toISOString(),
    });

    // Create per-category staleness alert records
    for (const cat of [...priceStatus.staleCategories, ...priceStatus.warningCategories]) {
      await supabase.from('price_staleness_alerts').insert({
        company_id: null,
        trade: cat.category,
        material_count: totalMaterials,
        stale_count: cat.isStale ? 1 : 0,
        avg_price_age_days: cat.daysSinceUpdate,
        status: 'pending',
      });
    }

    acted++;
  }

  // --- PHASE 3: Crowd-sourced price drift check ---
  // Check if contractors have logged actual prices that differ significantly from estimates
  const { data: recentPriceLogs } = await supabase
    .from('material_price_logs')
    .select('material_id, estimated_price, actual_price, created_at')
    .not('actual_price', 'is', null)
    .gte('created_at', new Date(now.getTime() - 90 * 86400000).toISOString()); // Last 90 days

  if (recentPriceLogs && recentPriceLogs.length >= 5) {
    // Build material name lookup
    const materialNames: Record<string, string> = {};
    const uniqueIds = [...new Set(recentPriceLogs.map(l => l.material_id))];
    for (const id of uniqueIds) {
      const mat = getMaterialById(id);
      if (mat) materialNames[id] = mat.name;
    }

    const intel = calculatePriceIntelligence(recentPriceLogs, materialNames);

    if (intel.significantDrifts.length > 0) {
      const underpricedCount = intel.topUnderpriced.length;
      const overpricedCount = intel.topOverpriced.length;

      const driftTitle = underpricedCount > 0
        ? `${underpricedCount} material${underpricedCount === 1 ? '' : 's'} priced below market — contractors are paying more`
        : `${overpricedCount} material${overpricedCount === 1 ? '' : 's'} priced above market — your quotes may be too high`;

      const driftLines: string[] = [];
      if (intel.topUnderpriced.length > 0) {
        driftLines.push('UNDERPRICED (your quotes may be too low):');
        for (const item of intel.topUnderpriced.slice(0, 5)) {
          driftLines.push(`  - ${item.materialName}: estimated $${item.estimatedPrice}, actual avg $${item.avgActualPrice} (+${item.priceDriftPercent}%, ${item.sampleSize} reports)`);
        }
      }
      if (intel.topOverpriced.length > 0) {
        driftLines.push('OVERPRICED (your quotes may be too high):');
        for (const item of intel.topOverpriced.slice(0, 5)) {
          driftLines.push(`  - ${item.materialName}: estimated $${item.estimatedPrice}, actual avg $${item.avgActualPrice} (${item.priceDriftPercent}%, ${item.sampleSize} reports)`);
        }
      }

      await supabase.from('jenny_action_log').insert({
        company_id: null,
        action_type: 'price_staleness',
        title: driftTitle,
        description: `Based on ${recentPriceLogs.length} price reports from contractors in the last 90 days, ${intel.significantDrifts.length} materials have prices that differ >10% from estimates.\n\n${driftLines.join('\n')}`,
        status: 'executed',
        target_id: null,
        target_type: 'price_intelligence',
        target_name: `${intel.significantDrifts.length} materials with price drift`,
        metadata: {
          total_reports: recentPriceLogs.length,
          materials_with_data: intel.materialsWithData,
          avg_drift_percent: intel.avgDriftPercent,
          underpriced_count: underpricedCount,
          overpriced_count: overpricedCount,
          top_drifts: intel.significantDrifts.slice(0, 10).map(d => ({
            material: d.materialName,
            estimated: d.estimatedPrice,
            actual: d.avgActualPrice,
            drift: d.priceDriftPercent,
            samples: d.sampleSize,
          })),
        },
        executed_at: now.toISOString(),
      });

      acted++;
    }
  }

  return acted;
}

// ============================================================
// CERT EXPIRATION: Check for expiring worker certifications
// ============================================================
async function runCertExpirationCheck(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const warnDays = (config.warn_days_before as number[]) || [60, 30, 14];
  const maxWarnDays = Math.max(...warnDays);

  const now = new Date();
  const cutoffDate = new Date(now.getTime() + maxWarnDays * 86400000).toISOString().split('T')[0];

  // Find active certifications expiring within the warning window
  const { data: expiringCerts } = await supabase
    .from('worker_certifications')
    .select('id, worker_id, cert_type, cert_name, expiration_date, worker:users(full_name)')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .not('expiration_date', 'is', null)
    .lte('expiration_date', cutoffDate);

  if (!expiringCerts || expiringCerts.length === 0) return 0;

  // Check which certs we already alerted about today
  const today = now.toISOString().split('T')[0];
  const { data: todayAlerts } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'cert_expiration')
    .gte('created_at', `${today}T00:00:00`);

  const alreadyAlerted = new Set((todayAlerts || []).map((a: { target_id: string }) => a.target_id));

  for (const cert of expiringCerts) {
    if (alreadyAlerted.has(cert.id)) continue;

    const expirationDate = new Date(cert.expiration_date);
    const daysUntilExpiry = Math.floor((expirationDate.getTime() - now.getTime()) / 86400000);
    const isExpired = daysUntilExpiry < 0;
    const worker = Array.isArray(cert.worker) ? cert.worker[0] : cert.worker;
    const workerName = (worker as { full_name: string } | null)?.full_name || 'Unknown Worker';

    const title = isExpired
      ? `${workerName}'s ${cert.cert_name} has EXPIRED`
      : `${workerName}'s ${cert.cert_name} expires in ${daysUntilExpiry} days`;

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'cert_expiration',
      title,
      description: `${workerName}'s ${cert.cert_name} (${cert.cert_type}) ${isExpired ? 'expired on' : 'expires on'} ${cert.expiration_date}. ${isExpired ? 'This worker should not be assigned to jobs requiring this certification until renewed.' : 'Renew before expiration to avoid work stoppages.'}`,
      status: 'executed',
      target_id: cert.id,
      target_type: 'certification',
      target_name: `${cert.cert_name} — ${workerName}`,
      metadata: { worker_id: cert.worker_id, cert_type: cert.cert_type, expiration_date: cert.expiration_date, days_until_expiry: daysUntilExpiry, is_expired: isExpired },
      executed_at: now.toISOString(),
    });

    acted++;
  }

  return acted;
}

// ============================================================
// INSURANCE EXPIRY: Check for 1099 contractors with expiring insurance
// ============================================================
async function runInsuranceExpiryCheck(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const warnDays = (config.warn_days_before as number) || 14;

  const now = new Date();
  const cutoffDate = new Date(now.getTime() + warnDays * 86400000).toISOString();

  // Find 1099 contractors with insurance expiring soon or already expired
  const { data: contractors } = await supabase
    .from('worker_profiles')
    .select('id, user_id, business_name, insurance_expiry, insurance_verified, user:users(full_name)')
    .eq('company_id', companyId)
    .eq('classification', '1099_contractor')
    .not('insurance_expiry', 'is', null)
    .lte('insurance_expiry', cutoffDate);

  if (!contractors || contractors.length === 0) return 0;

  // Check for existing alerts this week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: existingAlerts } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'insurance_expiry')
    .gte('created_at', weekStart.toISOString());

  const alreadyAlerted = new Set((existingAlerts || []).map((a: { target_id: string }) => a.target_id));

  for (const contractor of contractors) {
    if (alreadyAlerted.has(contractor.id)) continue;

    const expiryDate = new Date(contractor.insurance_expiry);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / 86400000);
    const isExpired = daysUntilExpiry < 0;
    const user = Array.isArray(contractor.user) ? contractor.user[0] : contractor.user;
    const name = (user as { full_name: string } | null)?.full_name || contractor.business_name || 'Unknown Contractor';

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'insurance_expiry',
      title: isExpired
        ? `${name}: Insurance EXPIRED ${Math.abs(daysUntilExpiry)} days ago`
        : `${name}: Insurance expires in ${daysUntilExpiry} days`,
      description: isExpired
        ? `${name}'s insurance coverage expired on ${contractor.insurance_expiry.split('T')[0]}. Do not assign additional work until updated proof of insurance is provided — this exposes your business to liability.`
        : `${name}'s insurance coverage expires on ${contractor.insurance_expiry.split('T')[0]}. Request updated proof of insurance before expiration.`,
      status: 'executed',
      target_id: contractor.id,
      target_type: 'worker_profile',
      target_name: name,
      metadata: { user_id: contractor.user_id, insurance_expiry: contractor.insurance_expiry, days_until_expiry: daysUntilExpiry, is_expired: isExpired },
      executed_at: now.toISOString(),
    });

    acted++;
  }

  return acted;
}

// ============================================================
// W-9 COMPLIANCE: Find 1099 contractors missing W-9 forms
// ============================================================
async function runW9ComplianceCheck(
  supabase: SB,
  companyId: string
): Promise<number> {
  const now = new Date();

  // Only run once per week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: existingAlert } = await supabase
    .from('jenny_action_log')
    .select('id')
    .eq('company_id', companyId)
    .eq('action_type', 'w9_compliance')
    .gte('created_at', weekStart.toISOString())
    .limit(1);

  if (existingAlert && existingAlert.length > 0) return 0;

  // Find 1099 contractors without W-9
  const { data: missingW9 } = await supabase
    .from('worker_profiles')
    .select('id, user_id, business_name, classified_at, user:users(full_name)')
    .eq('company_id', companyId)
    .eq('classification', '1099_contractor')
    .eq('w9_received', false);

  if (!missingW9 || missingW9.length === 0) return 0;

  const names = missingW9.map((c: { user: unknown; business_name: string | null }) => {
    const user = Array.isArray(c.user) ? c.user[0] : c.user;
    return (user as { full_name: string } | null)?.full_name || c.business_name || 'Unknown';
  });

  await supabase.from('jenny_action_log').insert({
    company_id: companyId,
    action_type: 'w9_compliance',
    title: `${missingW9.length} contractor${missingW9.length > 1 ? 's' : ''} missing W-9 forms`,
    description: `The following 1099 contractors do not have a W-9 on file: ${names.join(', ')}. A W-9 is required before issuing any payments and for 1099-NEC tax reporting at year end.`,
    status: 'executed',
    target_id: null,
    target_type: 'worker_profile',
    target_name: `${missingW9.length} contractors`,
    metadata: {
      contractors: missingW9.map((c: { id: string; user_id: string; business_name: string | null }) => ({
        profile_id: c.id,
        user_id: c.user_id,
        business_name: c.business_name,
      })),
      count: missingW9.length,
    },
    executed_at: now.toISOString(),
  });

  return 1;
}

// ============================================================
// CLASSIFICATION REVIEW: Check for overdue worker classification reviews
// ============================================================
async function runClassificationReviewCheck(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  const now = new Date();

  // Only run once per week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: existingAlert } = await supabase
    .from('jenny_action_log')
    .select('id')
    .eq('company_id', companyId)
    .eq('action_type', 'classification_review')
    .gte('created_at', weekStart.toISOString())
    .limit(1);

  if (existingAlert && existingAlert.length > 0) return 0;

  // Find workers with overdue next_review_date
  const { data: overdueReviews } = await supabase
    .from('worker_profiles')
    .select('id, user_id, classification, last_review_date, next_review_date, classification_method, user:users(full_name)')
    .eq('company_id', companyId)
    .not('next_review_date', 'is', null)
    .lte('next_review_date', now.toISOString());

  if (!overdueReviews || overdueReviews.length === 0) return 0;

  for (const worker of overdueReviews) {
    const user = Array.isArray(worker.user) ? worker.user[0] : worker.user;
    const name = (user as { full_name: string } | null)?.full_name || 'Unknown Worker';
    const reviewDate = new Date(worker.next_review_date);
    const daysOverdue = Math.floor((now.getTime() - reviewDate.getTime()) / 86400000);

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'classification_review',
      title: `${name}: Classification review ${daysOverdue} days overdue`,
      description: `${name}'s worker classification (${worker.classification}) was due for review on ${worker.next_review_date.split('T')[0]}. Last reviewed: ${worker.last_review_date ? worker.last_review_date.split('T')[0] : 'Never'}. Re-run the ${worker.classification === '1099_contractor' ? 'ABC test' : 'classification assessment'} to confirm status and maintain your audit trail.`,
      status: 'executed',
      target_id: worker.id,
      target_type: 'worker_profile',
      target_name: name,
      metadata: { user_id: worker.user_id, classification: worker.classification, last_review_date: worker.last_review_date, next_review_date: worker.next_review_date, days_overdue: daysOverdue },
      executed_at: now.toISOString(),
    });
  }

  return overdueReviews.length > 0 ? 1 : 0;
}

// ============================================================
// COMPLIANCE ESCALATION: Escalate unacknowledged violations
// ============================================================
async function runComplianceEscalation(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  const now = new Date();
  const escalateAfterDays = (config.escalate_after_days as number) || 3;
  const escalateSeverity = (config.escalate_severity as string[]) || ['violation'];

  // Only run once per day
  const today = now.toISOString().split('T')[0];
  const { data: existingAlert } = await supabase
    .from('jenny_action_log')
    .select('id')
    .eq('company_id', companyId)
    .eq('action_type', 'compliance_escalation')
    .gte('created_at', `${today}T00:00:00`)
    .limit(1);

  if (existingAlert && existingAlert.length > 0) return 0;

  // Find unacknowledged compliance alerts older than threshold
  const cutoffDate = new Date(now.getTime() - escalateAfterDays * 86400000).toISOString();

  const { data: unacknowledged } = await supabase
    .from('compliance_alerts')
    .select('id, user_id, alert_type, severity, title, description, hours_worked, created_at, user:users(full_name)')
    .eq('company_id', companyId)
    .eq('acknowledged', false)
    .in('severity', escalateSeverity)
    .lte('created_at', cutoffDate);

  if (!unacknowledged || unacknowledged.length === 0) return 0;

  // Group by severity for the summary
  const bySeverity: Record<string, number> = {};
  for (const alert of unacknowledged) {
    bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
  }

  const severitySummary = Object.entries(bySeverity)
    .map(([sev, count]) => `${count} ${sev}${count > 1 ? 's' : ''}`)
    .join(', ');

  await supabase.from('jenny_action_log').insert({
    company_id: companyId,
    action_type: 'compliance_escalation',
    title: `${unacknowledged.length} compliance alert${unacknowledged.length > 1 ? 's' : ''} need attention`,
    description: `There are ${unacknowledged.length} unacknowledged compliance alerts older than ${escalateAfterDays} days (${severitySummary}). These include missed meal breaks, overtime warnings, and other labor law violations that require review. Unresolved violations increase audit risk.`,
    status: 'executed',
    target_id: null,
    target_type: 'compliance_alert',
    target_name: `${unacknowledged.length} unacknowledged alerts`,
    metadata: {
      total: unacknowledged.length,
      by_severity: bySeverity,
      escalate_after_days: escalateAfterDays,
      oldest_alert: unacknowledged[unacknowledged.length - 1]?.created_at,
      alert_types: [...new Set(unacknowledged.map((a: { alert_type: string }) => a.alert_type))],
    },
    executed_at: now.toISOString(),
  });

  return 1;
}

// ============================================================
// QUOTE EXPIRATION: Alert when quotes are about to expire
// ============================================================
async function runQuoteExpirationCheck(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const warnDays = (config.warn_days_before as number[]) || [7, 3, 1];
  const maxWarnDays = Math.max(...warnDays);
  const autoExpire = config.auto_expire !== false;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const cutoffDate = new Date(now.getTime() + maxWarnDays * 86400000).toISOString().split('T')[0];

  // Find quotes expiring within window that are still active
  const { data: expiringQuotes } = await supabase
    .from('quotes')
    .select('id, customer_id, total, status, valid_until, customer:customers(name, phone, email)')
    .eq('company_id', companyId)
    .in('status', ['sent', 'viewed', 'draft'])
    .not('valid_until', 'is', null)
    .lte('valid_until', cutoffDate);

  if (!expiringQuotes || expiringQuotes.length === 0) return 0;

  // Check for existing alerts today
  const { data: todayAlerts } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'quote_expiration')
    .gte('created_at', `${today}T00:00:00`);

  const alreadyAlerted = new Set((todayAlerts || []).map((a: { target_id: string }) => a.target_id));

  for (const quote of expiringQuotes) {
    if (alreadyAlerted.has(quote.id)) continue;

    const validUntil = new Date(quote.valid_until);
    const daysUntilExpiry = Math.floor((validUntil.getTime() - now.getTime()) / 86400000);
    const isExpired = daysUntilExpiry < 0;
    const customer = Array.isArray(quote.customer) ? quote.customer[0] : quote.customer;
    const customerName = (customer as { name: string } | null)?.name || 'Unknown Customer';

    // Auto-expire quotes past their valid_until date
    if (isExpired && autoExpire && quote.status !== 'draft') {
      await supabase.from('quotes').update({ status: 'expired' }).eq('id', quote.id);
    }

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'quote_expiration',
      title: isExpired
        ? `Quote for ${customerName} expired ${Math.abs(daysUntilExpiry)} days ago ($${quote.total})`
        : `Quote for ${customerName} expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} ($${quote.total})`,
      description: isExpired
        ? `A $${quote.total} quote for ${customerName} expired on ${quote.valid_until}.${autoExpire ? ' Jenny has marked it as expired.' : ''} Consider sending a refreshed quote to re-engage the customer.`
        : `A $${quote.total} quote for ${customerName} expires on ${quote.valid_until}. Follow up to close the deal before it expires.`,
      status: 'executed',
      target_id: quote.id,
      target_type: 'quote',
      target_name: `Quote for ${customerName}`,
      metadata: { customer_name: customerName, total: quote.total, valid_until: quote.valid_until, days_until_expiry: daysUntilExpiry, auto_expired: isExpired && autoExpire },
      executed_at: now.toISOString(),
    });

    acted++;
  }

  return acted;
}

// ============================================================
// CONTRACTOR PAYMENT: Alert on submitted invoices awaiting approval
// ============================================================
async function runContractorPaymentCheck(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const remindAfterDays = (config.remind_after_days as number) || 3;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const cutoffDate = new Date(now.getTime() - remindAfterDays * 86400000).toISOString();

  // Find submitted invoices awaiting approval that are older than the remind threshold
  const { data: pendingInvoices } = await supabase
    .from('contractor_invoices')
    .select('id, contractor_id, contractor_name, invoice_number, total, submitted_date, period_start, period_end, status')
    .eq('company_id', companyId)
    .in('status', ['submitted', 'approved'])
    .lte('submitted_date', cutoffDate);

  if (!pendingInvoices || pendingInvoices.length === 0) return 0;

  // Check for existing alerts today
  const { data: todayAlerts } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'contractor_payment')
    .gte('created_at', `${today}T00:00:00`);

  const alreadyAlerted = new Set((todayAlerts || []).map((a: { target_id: string }) => a.target_id));

  const submitted = pendingInvoices.filter((inv: { status: string }) => inv.status === 'submitted');
  const approved = pendingInvoices.filter((inv: { status: string }) => inv.status === 'approved');

  // Summary alert for submitted invoices
  if (submitted.length > 0) {
    const totalAmount = submitted.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);
    const newInvoices = submitted.filter((inv: { id: string }) => !alreadyAlerted.has(inv.id));

    if (newInvoices.length > 0) {
      await supabase.from('jenny_action_log').insert({
        company_id: companyId,
        action_type: 'contractor_payment',
        title: `${submitted.length} contractor invoice${submitted.length > 1 ? 's' : ''} awaiting approval ($${totalAmount.toFixed(2)})`,
        description: `${submitted.length} contractor invoices totaling $${totalAmount.toFixed(2)} have been submitted and are awaiting your approval. Oldest submitted ${remindAfterDays}+ days ago. Review and approve to keep contractors paid on time.`,
        status: 'executed',
        target_id: null,
        target_type: 'contractor_invoice',
        target_name: `${submitted.length} submitted invoices`,
        metadata: {
          submitted_count: submitted.length,
          total_amount: totalAmount,
          invoices: submitted.map((inv: { id: string; contractor_name: string; invoice_number: string; total: number }) => ({
            id: inv.id, contractor: inv.contractor_name, number: inv.invoice_number, total: inv.total,
          })),
        },
        executed_at: now.toISOString(),
      });
      acted++;
    }
  }

  // Summary alert for approved but unpaid invoices
  if (approved.length > 0) {
    const totalApproved = approved.reduce((sum: number, inv: { total: number }) => sum + inv.total, 0);
    const newApproved = approved.filter((inv: { id: string }) => !alreadyAlerted.has(inv.id));

    if (newApproved.length > 0) {
      await supabase.from('jenny_action_log').insert({
        company_id: companyId,
        action_type: 'contractor_payment',
        title: `${approved.length} approved invoice${approved.length > 1 ? 's' : ''} awaiting payment ($${totalApproved.toFixed(2)})`,
        description: `${approved.length} contractor invoices totaling $${totalApproved.toFixed(2)} have been approved but not yet paid. Process payments to maintain good contractor relationships.`,
        status: 'executed',
        target_id: null,
        target_type: 'contractor_invoice',
        target_name: `${approved.length} approved invoices`,
        metadata: {
          approved_count: approved.length,
          total_amount: totalApproved,
          invoices: approved.map((inv: { id: string; contractor_name: string; invoice_number: string; total: number }) => ({
            id: inv.id, contractor: inv.contractor_name, number: inv.invoice_number, total: inv.total,
          })),
        },
        executed_at: now.toISOString(),
      });
      acted++;
    }
  }

  return acted;
}

// ============================================================
// CONTRACT END DATE: Alert when contractor agreements are ending
// ============================================================
async function runContractEndDateCheck(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const warnDays = (config.warn_days_before as number[]) || [30, 14, 7];
  const maxWarnDays = Math.max(...warnDays);

  const now = new Date();
  const cutoffDate = new Date(now.getTime() + maxWarnDays * 86400000).toISOString();

  // Find contractors with contracts ending within the warning window
  const { data: endingContracts } = await supabase
    .from('worker_profiles')
    .select('id, user_id, business_name, contract_start_date, contract_end_date, classification, user:users(full_name)')
    .eq('company_id', companyId)
    .eq('classification', '1099_contractor')
    .not('contract_end_date', 'is', null)
    .lte('contract_end_date', cutoffDate);

  if (!endingContracts || endingContracts.length === 0) return 0;

  // Check for existing alerts this week
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: existingAlerts } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'contract_end_date')
    .gte('created_at', weekStart.toISOString());

  const alreadyAlerted = new Set((existingAlerts || []).map((a: { target_id: string }) => a.target_id));

  for (const contractor of endingContracts) {
    if (alreadyAlerted.has(contractor.id)) continue;

    const endDate = new Date(contractor.contract_end_date);
    const daysUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / 86400000);
    const isExpired = daysUntilEnd < 0;
    const user = Array.isArray(contractor.user) ? contractor.user[0] : contractor.user;
    const name = (user as { full_name: string } | null)?.full_name || contractor.business_name || 'Unknown Contractor';

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'contract_end_date',
      title: isExpired
        ? `${name}: Contract ended ${Math.abs(daysUntilEnd)} days ago`
        : `${name}: Contract ends in ${daysUntilEnd} days`,
      description: isExpired
        ? `${name}'s contractor agreement ended on ${contractor.contract_end_date.split('T')[0]}. No new work should be assigned without a renewed contract. Consider offboarding or contract renewal.`
        : `${name}'s contractor agreement ends on ${contractor.contract_end_date.split('T')[0]}. Plan for contract renewal or begin offboarding preparations.`,
      status: 'executed',
      target_id: contractor.id,
      target_type: 'worker_profile',
      target_name: name,
      metadata: { user_id: contractor.user_id, contract_end_date: contractor.contract_end_date, days_until_end: daysUntilEnd, is_expired: isExpired },
      executed_at: now.toISOString(),
    });

    acted++;
  }

  return acted;
}

// ============================================================
// REVIEW REQUEST: Auto-request Google/Yelp reviews after job completion
// ============================================================
async function runReviewRequest(
  supabase: SB,
  companyId: string,
  config: Record<string, unknown>
): Promise<number> {
  let acted = 0;
  const now = new Date();

  // Read review links from Jenny config first, fall back to companies table
  let googleLink = (config.google_review_link as string) || '';
  let yelpLink = (config.yelp_review_link as string) || '';

  if (!googleLink || !yelpLink) {
    const { data: company } = await supabase
      .from('companies')
      .select('google_review_link, yelp_review_link')
      .eq('id', companyId)
      .single();
    if (company) {
      if (!googleLink) googleLink = (company as any).google_review_link || '';
      if (!yelpLink) yelpLink = (company as any).yelp_review_link || '';
    }
  }

  // Need at least one review link to send requests
  if (!googleLink && !yelpLink) return 0;

  // Determine which platform to use next (alternate if both are set)
  let reviewPlatform: 'google' | 'yelp' = 'google';
  let reviewLink = googleLink;

  if (googleLink && yelpLink) {
    // Check the last review request to alternate platforms
    const { data: lastRequest } = await supabase
      .from('jenny_action_log')
      .select('metadata')
      .eq('company_id', companyId)
      .eq('action_type', 'review_request')
      .order('created_at', { ascending: false })
      .limit(1);

    const lastPlatform = (lastRequest?.[0]?.metadata as Record<string, unknown>)?.review_platform as string;
    if (lastPlatform === 'google') {
      reviewPlatform = 'yelp';
      reviewLink = yelpLink;
    } else {
      reviewPlatform = 'google';
      reviewLink = googleLink;
    }
  } else if (yelpLink && !googleLink) {
    reviewPlatform = 'yelp';
    reviewLink = yelpLink;
  }

  // Find jobs completed in the last 24-48 hours (sweet spot for review requests)
  const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString();

  const { data: recentlyCompleted } = await supabase
    .from('jobs')
    .select('id, title, customer_id, completed_at, customer:customers(name, phone, email)')
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('completed_at', twoDaysAgo)
    .lte('completed_at', oneDayAgo);

  if (!recentlyCompleted || recentlyCompleted.length === 0) return 0;

  // Check for existing review requests
  const jobIds = recentlyCompleted.map((j: { id: string }) => j.id);
  const { data: existingRequests } = await supabase
    .from('jenny_action_log')
    .select('target_id')
    .eq('company_id', companyId)
    .eq('action_type', 'review_request')
    .in('target_id', jobIds);

  const alreadyRequested = new Set((existingRequests || []).map((r: { target_id: string }) => r.target_id));

  const platformLabel = reviewPlatform === 'google' ? 'Google' : 'Yelp';

  for (const job of recentlyCompleted) {
    if (alreadyRequested.has(job.id)) continue;

    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
    const customerName = (customer as { name: string } | null)?.name || 'Customer';
    const customerPhone = (customer as { phone: string } | null)?.phone;

    if (!customerPhone) continue; // Need phone for SMS review request

    await supabase.from('jenny_action_log').insert({
      company_id: companyId,
      action_type: 'review_request',
      title: `Request ${platformLabel} review from ${customerName} for "${job.title}"`,
      description: `"${job.title}" was completed for ${customerName}. Send a ${platformLabel} review request SMS to ${customerPhone}.`,
      status: 'pending', // Pending owner approval before sending
      target_id: job.id,
      target_type: 'job',
      target_name: job.title,
      metadata: {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_id: job.customer_id,
        completed_at: job.completed_at,
        review_platform: reviewPlatform,
        review_link: reviewLink,
      },
    });

    acted++;
  }

  return acted;
}

// ============================================================
// HR LAW UPDATE CHECK: Weekly check if state compliance rules are stale
// ============================================================
async function runHrLawUpdateCheck(supabase: SB): Promise<number> {
  // Only run once per week — check if we already alerted this week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const { data: existingAlert } = await supabase
    .from('jenny_action_log')
    .select('id')
    .eq('action_type', 'hr_law_update')
    .gte('created_at', weekStart.toISOString())
    .limit(1);

  if (existingAlert && existingAlert.length > 0) return 0; // Already ran this week

  const enabledStates = getEnabledStates();
  const staleStates: StateComplianceRules[] = [];

  for (const state of enabledStates) {
    if (isRulesStale(state.stateCode)) {
      staleStates.push(state);
    }
  }

  // If no states are stale, log a clean check and exit
  if (staleStates.length === 0) {
    await supabase.from('jenny_action_log').insert({
      company_id: null,
      action_type: 'hr_law_update',
      title: `All ${enabledStates.length} state compliance rules are current`,
      description: `Weekly HR law check completed. All ${enabledStates.length} enabled states have up-to-date employment law rules. Next check in 1 week.`,
      status: 'executed',
      target_id: null,
      target_type: 'compliance',
      target_name: `${enabledStates.length} states checked`,
      metadata: {
        total_states: enabledStates.length,
        stale_count: 0,
        states_checked: enabledStates.map(s => s.stateCode),
      },
      executed_at: now.toISOString(),
    });

    return 0;
  }

  // Build details for stale states
  const staleDetails = staleStates.map(state => {
    const lastUpdated = new Date(state.lastUpdated);
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    return {
      stateCode: state.stateCode,
      stateName: state.stateName,
      lastUpdated: state.lastUpdated,
      daysSinceUpdate,
      sourceUrl: state.sourceUrl,
      minimumWage: state.wage.minimumWage,
      classificationTest: state.classification.testName,
    };
  });

  const staleNames = staleStates.map(s => s.stateName).join(', ');
  const title = staleStates.length === 1
    ? `${staleStates[0].stateName} employment law rules are outdated`
    : `${staleStates.length} states have outdated employment law rules`;

  const description = `Weekly HR law check found ${staleStates.length} state${staleStates.length > 1 ? 's' : ''} with compliance rules older than 6 months: ${staleNames}. ` +
    `These rules cover worker classification tests, minimum wage rates, break requirements, and final pay deadlines. ` +
    `Outdated rules may lead to misclassification penalties or wage violations. Please review and update state compliance data.`;

  // Log the alert
  await supabase.from('jenny_action_log').insert({
    company_id: null, // platform-wide alert
    action_type: 'hr_law_update',
    title,
    description,
    status: 'executed',
    target_id: null,
    target_type: 'compliance',
    target_name: `${staleStates.length} stale states: ${staleNames}`,
    metadata: {
      total_states: enabledStates.length,
      stale_count: staleStates.length,
      stale_states: staleDetails,
      states_checked: enabledStates.map(s => s.stateCode),
      areas_affected: ['classification_tests', 'minimum_wage', 'overtime_rules', 'break_requirements', 'contractor_rules', 'final_pay'],
    },
    executed_at: now.toISOString(),
  });

  // Also log individual state alerts for granularity
  for (const detail of staleDetails) {
    await supabase.from('jenny_action_log').insert({
      company_id: null,
      action_type: 'hr_law_update',
      title: `${detail.stateName} (${detail.stateCode}): Rules are ${detail.daysSinceUpdate} days old`,
      description: `${detail.stateName} employment rules were last updated on ${detail.lastUpdated} (${detail.daysSinceUpdate} days ago). ` +
        `Current minimum wage: $${detail.minimumWage.toFixed(2)}. Classification test: ${detail.classificationTest}. ` +
        `Review the latest rules at ${detail.sourceUrl}`,
      status: 'executed',
      target_id: null,
      target_type: 'compliance',
      target_name: `${detail.stateName} compliance rules`,
      metadata: detail,
      executed_at: now.toISOString(),
    });
  }

  return 1;
}

// POST — Manual trigger for a specific company (from dashboard)
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  const authHeader = request.headers.get('x-user-id');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', authHeader)
    .single();

  if (!dbUser?.company_id || !['owner', 'admin'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'run_all') {
      // Run all enabled actions for this company
      const { data: configs } = await supabase
        .from('jenny_action_configs')
        .select('*')
        .eq('company_id', dbUser.company_id)
        .eq('enabled', true);

      const results: Record<string, number> = {};

      for (const config of (configs || [])) {
        const c = config.config as Record<string, unknown>;
        switch (config.action_type) {
          case 'auto_dispatch':
            results.auto_dispatch = await runAutoDispatch(supabase, dbUser.company_id, c);
            break;
          case 'lead_follow_up':
            results.lead_follow_up = await runLeadFollowUp(supabase, dbUser.company_id, c);
            break;
          case 'cash_flow_alert':
            results.cash_flow_alert = await runCashFlowAlerts(supabase, dbUser.company_id, c);
            break;
          case 'job_costing':
            results.job_costing = await runJobCosting(supabase, dbUser.company_id, c);
            break;
          case 'cert_expiration':
            results.cert_expiration = await runCertExpirationCheck(supabase, dbUser.company_id, c);
            break;
          case 'insurance_expiry':
            results.insurance_expiry = await runInsuranceExpiryCheck(supabase, dbUser.company_id, c);
            break;
          case 'w9_compliance':
            results.w9_compliance = await runW9ComplianceCheck(supabase, dbUser.company_id);
            break;
          case 'classification_review':
            results.classification_review = await runClassificationReviewCheck(supabase, dbUser.company_id, c);
            break;
          case 'compliance_escalation':
            results.compliance_escalation = await runComplianceEscalation(supabase, dbUser.company_id, c);
            break;
          case 'quote_expiration':
            results.quote_expiration = await runQuoteExpirationCheck(supabase, dbUser.company_id, c);
            break;
          case 'contractor_payment':
            results.contractor_payment = await runContractorPaymentCheck(supabase, dbUser.company_id, c);
            break;
          case 'contract_end_date':
            results.contract_end_date = await runContractEndDateCheck(supabase, dbUser.company_id, c);
            break;
          case 'review_request':
            results.review_request = await runReviewRequest(supabase, dbUser.company_id, c);
            break;
        }
      }

      // Also run price staleness check on manual trigger
      const priceResult = await runPriceStalenessCheck(supabase);
      results.price_staleness = priceResult;

      // Also run HR law update check on manual trigger
      const hrResult = await runHrLawUpdateCheck(supabase);
      results.hr_law_update = hrResult;

      return NextResponse.json({ success: true, results });
    }

    if (action === 'approve_dispatch') {
      const { actionLogId } = body;
      // Approve a pending dispatch suggestion
      const { data: logEntry } = await supabase
        .from('jenny_action_log')
        .select('*')
        .eq('id', actionLogId)
        .eq('company_id', dbUser.company_id)
        .eq('status', 'pending')
        .single();

      if (!logEntry) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

      const metadata = logEntry.metadata as Record<string, unknown>;
      const workerId = metadata?.worker_id as string;
      const jobId = logEntry.target_id;

      if (workerId && jobId) {
        await supabase.from('job_assignments').insert({
          job_id: jobId,
          user_id: workerId,
        });

        await supabase.from('jenny_action_log').update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          result: 'Approved by owner',
        }).eq('id', actionLogId);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'dismiss') {
      const { actionLogId } = body;
      await supabase.from('jenny_action_log').update({
        status: 'skipped',
        result: 'Dismissed by owner',
      }).eq('id', actionLogId).eq('company_id', dbUser.company_id);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Jenny actions error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
