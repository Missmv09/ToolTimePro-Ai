import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PLANNER_SYSTEM_PROMPT,
  buildPlannerPrompt,
  parsePlannerResponse,
  type ExperimentRow,
  type MetricsRow,
} from '@/lib/growth-planner';
import { aiComplete, parseAIJson } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

/**
 * Growth agent planner.
 *
 * Cron-triggered weekly. Reads the funnel, the content inventory, and past
 * experiment outcomes, then writes a ranked set of proposed tasks.
 *
 * It proposes; it does not act. Every task lands in growth_tasks with status
 * 'proposed' and reaches the public only after a human approves it in
 * /admin/growth. That gate is the whole safety model — the agent writes to one
 * table and nothing else.
 */

const TASK_COUNT = 5;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  try {
    // Don't stack plans. If last week's proposals are still sitting unreviewed,
    // adding five more turns the approval queue into a backlog nobody reads —
    // which is exactly how these systems get switched off.
    const { count: pending } = await supabase
      .from('growth_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'proposed');

    if ((pending ?? 0) >= TASK_COUNT * 2) {
      return NextResponse.json({
        message: 'Skipped — unreviewed proposals already pending',
        pending,
      });
    }

    const [metricsResult, experimentsResult, contentResult] = await Promise.all([
      supabase
        .from('growth_metrics_daily')
        .select('metric_date, leads_captured, leads_total, signups, trials_active, paid_active, by_source')
        .order('metric_date', { ascending: false })
        .limit(56),
      supabase
        .from('growth_experiments')
        .select('hypothesis, channel, status, metric, baseline_value, actual_value, learning')
        .order('concluded_at', { ascending: false, nullsFirst: false })
        .limit(25),
      supabase
        .from('platform_blog_posts')
        .select('title')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(50),
    ]);

    const context = {
      metrics: (metricsResult.data ?? []) as MetricsRow[],
      experiments: (experimentsResult.data ?? []) as ExperimentRow[],
      existingContent: (contentResult.data ?? []).map((row) => String(row.title)),
      // Sourced from the competitor catalog rather than the database — these
      // pages are code, not rows, so the file is the authority on what exists.
      existingComparisons: await loadComparisonSlugs(),
      taskCount: TASK_COUNT,
    };

    const aiResult = await aiComplete({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPlannerPrompt(context) }],
      maxTokens: 4000,
      tier: 'reasoning',
    });

    const tasks = parsePlannerResponse(parseAIJson(aiResult.content), TASK_COUNT);

    if (tasks.length === 0) {
      console.error('[Growth Planner] No valid tasks in model output');
      return NextResponse.json({ error: 'Planner produced no usable tasks' }, { status: 502 });
    }

    // One id per run, so a bad week's plan can be discarded as a batch.
    const planRunId = crypto.randomUUID();

    const { error: insertError } = await supabase.from('growth_tasks').insert(
      tasks.map((task) => ({
        title: task.title,
        rationale: task.rationale,
        channel: task.channel,
        task_type: task.taskType,
        priority: task.priority,
        expected_impact: task.expectedImpact,
        status: 'proposed',
        plan_run_id: planRunId,
        metadata: { model: aiResult.model, provider: aiResult.provider },
      }))
    );

    if (insertError) {
      console.error('[Growth Planner] Insert failed:', insertError.message);
      return NextResponse.json({ error: 'Could not save plan' }, { status: 500 });
    }

    console.log(`[Growth Planner] Proposed ${tasks.length} tasks (run ${planRunId})`);
    return NextResponse.json({
      message: 'Plan complete',
      plan_run_id: planRunId,
      tasks_proposed: tasks.length,
      model: aiResult.model,
    });
  } catch (error) {
    console.error('[Growth Planner] Error:', error);
    return NextResponse.json({ error: 'Planner failed' }, { status: 500 });
  }
}

async function loadComparisonSlugs(): Promise<string[]> {
  try {
    const { COMPETITORS } = await import('@/lib/competitor-data');
    return Object.keys(COMPETITORS);
  } catch {
    return [];
  }
}
