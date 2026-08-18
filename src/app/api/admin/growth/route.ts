import { NextResponse } from 'next/server';
import { verifyPlatformAdmin, getAdminClient } from '@/lib/platform-admin';

export const dynamic = 'force-dynamic';

/**
 * Growth agent approval queue.
 *
 * GET  — the queue: proposed and generated tasks with their assets, plus the
 *        funnel numbers the planner reasoned over, so a reviewer can judge a
 *        proposal against the same data that produced it.
 * PATCH — approve or reject a task, or approve/reject a generated asset.
 *
 * Platform-admin only. This is the human gate the whole agent design rests on:
 * the planner and generator write drafts, and nothing they produce reaches the
 * public without passing through here.
 */

const ALLOWED_TASK_STATUSES = ['approved', 'rejected'] as const;
const ALLOWED_ASSET_STATUSES = ['approved', 'rejected', 'published'] as const;

export async function GET(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getAdminClient();

    const [tasksResult, assetsResult, metricsResult, experimentsResult] = await Promise.all([
      supabase
        .from('growth_tasks')
        .select('*')
        .in('status', ['proposed', 'approved', 'generated', 'failed'])
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('growth_assets')
        .select('*')
        .in('status', ['draft', 'approved'])
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('growth_metrics_daily')
        .select('metric_date, leads_captured, leads_total, signups, trials_active, paid_active, by_source')
        .order('metric_date', { ascending: false })
        .limit(30),
      supabase
        .from('growth_experiments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      tasks: tasksResult.data ?? [],
      assets: assetsResult.data ?? [],
      metrics: metricsResult.data ?? [],
      experiments: experimentsResult.data ?? [],
    });
  } catch (error) {
    console.error('[Admin Growth] Read failed:', error);
    return NextResponse.json({ error: 'Could not load the queue' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyPlatformAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: { taskId?: string; assetId?: string; status?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { taskId, assetId, status, note } = body;
  if (!status) {
    return NextResponse.json({ error: 'A status is required' }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    if (taskId) {
      // Whitelisted rather than passed through: 'published' and 'generated' are
      // set by the pipeline itself, and letting the UI set them by hand would
      // mark work done that was never actually produced.
      if (!(ALLOWED_TASK_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json({ error: 'Unsupported task status' }, { status: 400 });
      }

      const { error } = await supabase
        .from('growth_tasks')
        .update({
          status,
          reviewed_by: admin.email,
          reviewed_at: new Date().toISOString(),
          review_note: typeof note === 'string' ? note.slice(0, 500) : null,
        })
        .eq('id', taskId);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (assetId) {
      if (!(ALLOWED_ASSET_STATUSES as readonly string[]).includes(status)) {
        return NextResponse.json({ error: 'Unsupported asset status' }, { status: 400 });
      }

      const { error } = await supabase
        .from('growth_assets')
        .update({
          status,
          ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
        })
        .eq('id', assetId);

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'A taskId or assetId is required' }, { status: 400 });
  } catch (error) {
    console.error('[Admin Growth] Update failed:', error);
    return NextResponse.json({ error: 'Could not save the change' }, { status: 500 });
  }
}
