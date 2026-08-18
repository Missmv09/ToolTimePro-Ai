import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  buildGenerationPrompt,
  getAssetSpec,
  parseGeneratedAsset,
} from '@/lib/growth-generator';
import { isTaskType } from '@/lib/growth-planner';
import { aiComplete, parseAIJson } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

/**
 * Growth agent generator.
 *
 * Turns approved tasks into draft assets. Deliberately only picks up tasks with
 * status 'approved' — a proposed task is one nobody has looked at yet, and
 * generating for it would spend tokens on work that may be rejected, then put a
 * finished-looking draft in front of the reviewer and bias the decision.
 *
 * Cron-triggered, and also callable from the admin UI to generate one task on
 * demand via ?taskId=.
 */

const BATCH_LIMIT = 3;

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

  const taskId = request.nextUrl.searchParams.get('taskId');

  try {
    let query = supabase
      .from('growth_tasks')
      .select('id, title, rationale, channel, task_type, expected_impact')
      .eq('status', 'approved')
      .order('priority', { ascending: true })
      .limit(BATCH_LIMIT);

    if (taskId) query = query.eq('id', taskId);

    const { data: tasks, error } = await query;

    if (error) {
      console.error('[Growth Generator] Task read failed:', error.message);
      return NextResponse.json({ error: 'Could not read tasks' }, { status: 500 });
    }

    if (!tasks?.length) {
      return NextResponse.json({ message: 'No approved tasks awaiting generation', generated: 0 });
    }

    let generated = 0;
    let failed = 0;

    // Sequential rather than parallel: this runs on a schedule with nobody
    // waiting, and three concurrent Opus-tier calls is a rate-limit spike for
    // no benefit.
    for (const task of tasks) {
      const ok = await generateForTask(supabase, task);
      if (ok) generated += 1;
      else failed += 1;
    }

    return NextResponse.json({ message: 'Generation complete', generated, failed });
  } catch (error) {
    console.error('[Growth Generator] Error:', error);
    return NextResponse.json({ error: 'Generator failed' }, { status: 500 });
  }
}

interface TaskRow {
  id: string;
  title: string;
  rationale: string;
  channel: string;
  task_type: string;
  expected_impact: string | null;
}

async function generateForTask(supabase: SupabaseClient, task: TaskRow): Promise<boolean> {
  if (!isTaskType(task.task_type)) {
    await markFailed(supabase, task.id, `Unknown task type: ${task.task_type}`);
    return false;
  }

  const spec = getAssetSpec(task.task_type);
  if (!spec) {
    await markFailed(supabase, task.id, `No generator for task type: ${task.task_type}`);
    return false;
  }

  try {
    const aiResult = await aiComplete({
      systemPrompt: spec.systemPrompt,
      messages: [
        {
          role: 'user',
          content: buildGenerationPrompt({
            title: task.title,
            rationale: task.rationale,
            channel: task.channel,
            taskType: task.task_type,
            expectedImpact: task.expected_impact,
          }),
        },
      ],
      maxTokens: spec.maxTokens,
      temperature: 0.7,
      tier: 'high',
    });

    const asset = parseGeneratedAsset(parseAIJson(aiResult.content), spec);
    if (!asset) {
      await markFailed(supabase, task.id, 'Model returned no usable content');
      return false;
    }

    const { error: assetError } = await supabase.from('growth_assets').insert({
      task_id: task.id,
      asset_type: spec.assetType,
      title: asset.title,
      body: asset.body,
      meta_title: asset.metaTitle,
      meta_description: asset.metaDescription,
      slug: asset.slug,
      generated_by: aiResult.model,
      status: 'draft',
    });

    if (assetError) {
      console.error('[Growth Generator] Asset insert failed:', assetError.message);
      await markFailed(supabase, task.id, 'Could not save the generated asset');
      return false;
    }

    await supabase.from('growth_tasks').update({ status: 'generated' }).eq('id', task.id);
    return true;
  } catch (error) {
    console.error('[Growth Generator] Generation failed:', error);
    await markFailed(supabase, task.id, error instanceof Error ? error.message : 'Generation failed');
    return false;
  }
}

/**
 * Record why a task could not be generated.
 *
 * Kept visible rather than silently retried: a task that keeps failing usually
 * means the prompt or the task type is wrong, and hiding that behind a retry
 * loop burns tokens without anyone noticing.
 */
async function markFailed(supabase: SupabaseClient, taskId: string, reason: string): Promise<void> {
  await supabase
    .from('growth_tasks')
    .update({ status: 'failed', review_note: reason.slice(0, 500) })
    .eq('id', taskId);
}
