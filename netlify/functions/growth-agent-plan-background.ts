// Netlify Background Function: Growth Agent — Planner
//
// Background rather than a normal function because of a hard platform limit:
// Netlify allows 10s for synchronous functions and 30s for scheduled ones,
// while a single Opus planning call routinely runs longer than both. Running
// this as a regular route produced a 502 mid-call. Background functions get
// 15 minutes, which is the only tier that fits.
//
// Consequences of that choice, both fine here:
//   - the caller always gets 202 immediately and never sees the result, so
//     outcomes go to growth_tasks and the function log instead
//   - it cannot be scheduled directly, so growth-agent-plan-cron triggers it
//
// Imports are relative, not '@/...' — the path alias is a tsconfig feature and
// Netlify's esbuild bundler does not reliably resolve it for functions.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PLANNER_SYSTEM_PROMPT,
  buildPlannerPrompt,
  parsePlannerResponse,
  type ExperimentRow,
  type MetricsRow,
} from '../../src/lib/growth-planner';
import { COMPETITORS } from '../../src/lib/competitor-data';
import { authorizeCronRequest } from '../../src/lib/cron-auth';

const { aiComplete, parseAIJson } = require('../../src/lib/ai-client');

const TASK_COUNT = 5;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(request: Request) {
  // Auth lives in src/lib/cron-auth so the planner, the generator and their
  // cron triggers cannot drift apart, and so a rejection says which of the
  // three distinct failures happened instead of just "no".
  const auth = authorizeCronRequest(request);
  if (!auth.ok) {
    console.error(`[Growth Planner] Unauthorized. ${auth.reason}`);
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[Growth Planner] Supabase env vars not configured');
    return new Response('Server config error', { status: 500 });
  }

  try {
    // Don't stack plans. If last week's proposals are still unreviewed, adding
    // five more turns the approval queue into a backlog nobody reads — which
    // is how these systems end up switched off.
    const { count: pending } = await supabase
      .from('growth_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'proposed');

    if ((pending ?? 0) >= TASK_COUNT * 2) {
      console.log(`[Growth Planner] Skipped — ${pending} unreviewed proposals pending`);
      return new Response('Skipped', { status: 200 });
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
      // Comparison pages are code, not rows, so the catalog file is the
      // authority on which ones exist.
      existingComparisons: Object.keys(COMPETITORS),
      taskCount: TASK_COUNT,
    };

    console.log(
      `[Growth Planner] Planning from ${context.metrics.length} days of metrics, ` +
        `${context.experiments.length} experiments`
    );

    const aiResult = await aiComplete({
      systemPrompt: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPlannerPrompt(context) }],
      maxTokens: 4000,
      tier: 'reasoning',
    });

    const tasks = parsePlannerResponse(parseAIJson(aiResult.content), TASK_COUNT);

    if (tasks.length === 0) {
      console.error('[Growth Planner] No valid tasks in model output');
      return new Response('No usable tasks', { status: 200 });
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
      return new Response('Could not save plan', { status: 500 });
    }

    console.log(
      `[Growth Planner] Proposed ${tasks.length} tasks (run ${planRunId}, model ${aiResult.model})`
    );
    return new Response('Plan complete', { status: 200 });
  } catch (error) {
    console.error('[Growth Planner] Error:', error);
    return new Response('Planner failed', { status: 500 });
  }
}
