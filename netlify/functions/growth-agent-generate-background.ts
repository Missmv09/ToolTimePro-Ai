// Netlify Background Function: Growth Agent — Generator
//
// Background for the same reason as the planner: this makes up to three
// sequential AI calls, which is far beyond Netlify's 10s synchronous and 30s
// scheduled limits. Triggered by growth-agent-generate-cron.
//
// Only picks up tasks a human has approved. That is deliberate twice over: it
// avoids spending tokens on work that may be rejected, and it avoids putting a
// finished-looking draft in front of the reviewer, which biases the decision.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  buildGenerationPrompt,
  getAssetSpec,
  parseGeneratedAsset,
} from '../../src/lib/growth-generator';
import { isTaskType } from '../../src/lib/growth-planner';

const { aiComplete, parseAIJson } = require('../../src/lib/ai-client');

const BATCH_LIMIT = 3;

function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface TaskRow {
  id: string;
  title: string;
  rationale: string;
  channel: string;
  task_type: string;
  expected_impact: string | null;
}

export default async function handler(request: Request) {
  // Auth failures here were indistinguishable from each other, which cost an
  // afternoon: "the variable isn't reaching the function" and "the value
  // doesn't match" both printed the same line. Report which one it is, by
  // length and prefix only — never the secret itself, since these logs are
  // readable by anyone with Netlify access.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') || '';

  if (!cronSecret) {
    console.error(
      '[Growth Generator] CRON_SECRET is not visible to this function. The variable is ' +
        'either unset, or its Netlify scopes exclude Functions.'
    );
    return new Response('Unauthorized', { status: 401 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    const sent = authHeader.replace(/^Bearer /, '');
    console.error(
      `[Growth Generator] Secret mismatch. Expected ${cronSecret.length} chars starting ` +
        `"${cronSecret.slice(0, 4)}", received ${sent.length} chars starting ` +
        `"${sent.slice(0, 4)}".` +
        (sent.length === 0 ? ' No Bearer token was sent at all.' : '')
    );
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[Growth Generator] Supabase env vars not configured');
    return new Response('Server config error', { status: 500 });
  }

  // Optional ?taskId= to generate one specific task on demand.
  const taskId = new URL(request.url).searchParams.get('taskId');

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
      return new Response('Could not read tasks', { status: 500 });
    }

    if (!tasks?.length) {
      console.log('[Growth Generator] No approved tasks awaiting generation');
      return new Response('Nothing to generate', { status: 200 });
    }

    let generated = 0;
    let failed = 0;

    // Sequential rather than parallel: nothing is waiting on this, and three
    // concurrent AI calls is a rate-limit spike for no benefit.
    for (const task of tasks as TaskRow[]) {
      const ok = await generateForTask(supabase, task);
      if (ok) generated += 1;
      else failed += 1;
    }

    console.log(`[Growth Generator] Generated ${generated}, failed ${failed}`);
    return new Response('Generation complete', { status: 200 });
  } catch (error) {
    console.error('[Growth Generator] Error:', error);
    return new Response('Generator failed', { status: 500 });
  }
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
 * Left visible rather than silently retried: a task that keeps failing usually
 * means the prompt or the task type is wrong, and a retry loop would burn
 * tokens without anyone noticing.
 */
async function markFailed(supabase: SupabaseClient, taskId: string, reason: string): Promise<void> {
  await supabase
    .from('growth_tasks')
    .update({ status: 'failed', review_note: reason.slice(0, 500) })
    .eq('id', taskId);
}
