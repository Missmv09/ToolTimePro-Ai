import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { pricesNeedAttention } from '@/lib/supplier-pricing';
import { getMaterialsByTrade, type TradeType } from '@/lib/materials-database';

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
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
    price_staleness: { checked: 0, acted: 0 },
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
// PRICE STALENESS: Monthly check if material prices need refreshing
// ============================================================
async function runPriceStalenessCheck(supabase: SB): Promise<number> {
  const priceStatus = pricesNeedAttention();

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

  // Only alert if prices need attention (within 30 days of stale or already stale)
  if (!priceStatus.needsUpdate) return 0;

  // Count materials per trade for the report
  const ALL_TRADES: TradeType[] = [
    'painting', 'plumbing', 'electrical', 'landscaping', 'handyman', 'flooring',
    'lawn_care', 'pool_service', 'hvac', 'roofing', 'fencing', 'concrete',
    'carpentry', 'irrigation', 'pressure_washing', 'insulation', 'siding',
    'drywall', 'tree_service', 'solar', 'garage_door',
  ];

  let totalMaterials = 0;
  for (const trade of ALL_TRADES) {
    const materials = getMaterialsByTrade(trade);
    totalMaterials += materials.length;
  }

  const isStale = priceStatus.daysUntilStale === 0;
  const title = isStale
    ? `Material prices are outdated (${priceStatus.daysSinceUpdate} days old)`
    : `Material prices expiring in ${priceStatus.daysUntilStale} days`;

  const description = isStale
    ? `The material pricing database has not been updated in ${priceStatus.daysSinceUpdate} days. ${totalMaterials} materials across ${ALL_TRADES.length} trades are using estimated prices from January 2026. Prices should be reviewed and refreshed to ensure accurate customer quotes.`
    : `Material prices were last set in January 2026 (${priceStatus.daysSinceUpdate} days ago). They will be flagged as stale in ${priceStatus.daysUntilStale} days. Consider scheduling a price review to keep customer quotes accurate.`;

  // Log as a platform-wide alert (no company_id — visible to all)
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
      days_until_stale: priceStatus.daysUntilStale,
      total_materials: totalMaterials,
      total_trades: ALL_TRADES.length,
      price_base_date: '2026-01-01',
      is_stale: isStale,
    },
    executed_at: now.toISOString(),
  });

  // Also create a staleness alert record for the dashboard
  await supabase.from('price_staleness_alerts').insert({
    company_id: null, // platform-wide
    trade: '_all',
    material_count: totalMaterials,
    stale_count: isStale ? totalMaterials : 0,
    avg_price_age_days: priceStatus.daysSinceUpdate,
    status: 'pending',
  });

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
        }
      }

      // Also run price staleness check on manual trigger
      const priceResult = await runPriceStalenessCheck(supabase);
      results.price_staleness = priceResult;

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
