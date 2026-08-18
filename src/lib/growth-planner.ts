/**
 * Growth agent planner — prompt assembly and output validation.
 *
 * This is the "decide" half of the loop. Once a week it reads the funnel time
 * series, the standing content inventory, and — critically — what past
 * experiments actually produced, then proposes a ranked list of work.
 *
 * The experiment history is what makes this an agent rather than a content
 * generator on a cron. Without outcomes fed back in, it proposes the same
 * plausible-sounding plan forever.
 *
 * Everything here is pure so the two risky parts can be tested directly: what
 * the model is told, and what is believed from what it says back. Model output
 * is treated as untrusted input — it is proposing work that costs money and
 * reaches the public, so it is validated as strictly as a form post.
 */

/** Channels the agent is allowed to propose work in. */
export const GROWTH_CHANNELS = [
  'seo_page',
  'blog',
  'comparison_page',
  'email_sequence',
  'free_tool',
  'social',
  'paid_search',
  'product',
] as const;

export type GrowthChannel = (typeof GROWTH_CHANNELS)[number];

/** Concrete deliverables. Anything else is not something the generator builds. */
export const TASK_TYPES = [
  'write_blog_post',
  'write_landing_page',
  'write_comparison_page',
  'write_email',
  'write_social_posts',
  'write_ad_copy',
  'propose_experiment',
  'fix_funnel_leak',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export interface MetricsRow {
  metric_date: string;
  leads_captured: number;
  leads_total: number;
  signups: number;
  trials_active: number;
  paid_active: number;
  by_source: Record<string, number> | null;
}

export interface ExperimentRow {
  hypothesis: string;
  channel: string;
  status: string;
  metric: string | null;
  baseline_value: number | null;
  actual_value: number | null;
  learning: string | null;
}

export interface PlannerContext {
  metrics: MetricsRow[];
  experiments: ExperimentRow[];
  /** Titles of content that already exists, so the agent doesn't re-propose it. */
  existingContent: string[];
  /** Competitor slugs with comparison pages already built. */
  existingComparisons: string[];
  /** How many tasks to ask for. */
  taskCount: number;
}

export interface ProposedTask {
  title: string;
  rationale: string;
  channel: GrowthChannel;
  taskType: TaskType;
  priority: number;
  expectedImpact: string | null;
}

export const PLANNER_SYSTEM_PROMPT = `You are the growth strategist for Task Iguana, a field service management SaaS sold to independent contractors — landscapers, plumbers, HVAC and electrical shops, mostly 1 to 15 trucks.

The business is run by a single founder with no marketing team. Every task you propose is work she will review personally, so propose few things that matter rather than many that sound busy.

Competitive reality, which should shape what you propose:
- Housecall Pro, Jobber, and ServiceTitan outspend Task Iguana enormously. Head terms like "field service software" are unwinnable on budget.
- Task Iguana's real advantages are compliance tooling (no competitor has it), bilingual support, per-user pricing at $7 vs $29-35, and AI that acts autonomously rather than just answering phones.
- Its existing assets are free compliance tools, competitor comparison pages, industry landing pages, and interactive demos. Long-tail and high-intent beats broad reach.

How to choose:
- Prefer work that compounds (SEO pages, tools) over work that decays (one-off posts).
- Prefer fixing a measured funnel leak over adding new top-of-funnel volume. A leak wastes traffic you already paid for.
- If an experiment already tested something, do not propose it again — build on what it found.
- Do not propose work in a channel with no evidence behind it when a proven channel still has room.
- Be specific. "Write a blog post about HVAC" is not a task. "Write a comparison page for Workiz targeting 'workiz alternative' searches" is.

Return ONLY a JSON object, no markdown fences:
{
  "tasks": [
    {
      "title": "specific, concrete deliverable",
      "rationale": "why this, now, referencing the data you were given",
      "channel": "one of: ${GROWTH_CHANNELS.join(', ')}",
      "taskType": "one of: ${TASK_TYPES.join(', ')}",
      "priority": 1,
      "expectedImpact": "what you expect to move, and roughly how much"
    }
  ]
}

priority is 1 (do first) to 10. Rank by expected value per hour of the founder's attention.`;

/** Compact the funnel into something worth spending prompt tokens on. */
function summarizeMetrics(metrics: MetricsRow[]): string {
  if (metrics.length === 0) {
    return 'No funnel data recorded yet. This is week zero — propose work that establishes a baseline rather than work that optimizes one.';
  }

  const recent = metrics.slice(0, 28);
  const totals = recent.reduce(
    (acc, row) => ({
      leads: acc.leads + (row.leads_captured || 0),
      signups: acc.signups + (row.signups || 0),
    }),
    { leads: 0, signups: 0 }
  );

  const latest = recent[0];

  // Aggregate lead sources across the window rather than sending 28 rows.
  const sourceTotals: Record<string, number> = {};
  for (const row of recent) {
    for (const [source, count] of Object.entries(row.by_source || {})) {
      sourceTotals[source] = (sourceTotals[source] || 0) + (typeof count === 'number' ? count : 0);
    }
  }
  const sources = Object.entries(sourceTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => `  ${source}: ${count}`)
    .join('\n');

  return [
    `Funnel, last ${recent.length} days:`,
    `  Leads captured: ${totals.leads}`,
    `  Signups: ${totals.signups}`,
    `  Total leads on list: ${latest.leads_total ?? 0}`,
    `  Active trials: ${latest.trials_active ?? 0}`,
    `  Paying customers: ${latest.paid_active ?? 0}`,
    sources ? `Leads by source:\n${sources}` : '  No leads captured by source yet.',
  ].join('\n');
}

/**
 * Render past experiments as the agent's memory.
 *
 * Concluded experiments come first and carry their learning verbatim — this is
 * the only part of the prompt that reflects what actually happened rather than
 * what was measured, and it is what stops the plan repeating itself.
 */
function summarizeExperiments(experiments: ExperimentRow[]): string {
  if (experiments.length === 0) {
    return 'No experiments have been run yet. Nothing has been ruled in or out.';
  }

  const lines = experiments.map((exp) => {
    const outcome =
      exp.actual_value !== null && exp.baseline_value !== null
        ? ` (${exp.metric ?? 'metric'}: ${exp.baseline_value} -> ${exp.actual_value})`
        : '';
    const learning = exp.learning ? ` Learned: ${exp.learning}` : '';
    return `- [${exp.status}] ${exp.hypothesis} via ${exp.channel}${outcome}.${learning}`;
  });

  return `Experiments already run — do not repeat these, build on them:\n${lines.join('\n')}`;
}

export function buildPlannerPrompt(context: PlannerContext): string {
  const content =
    context.existingContent.length > 0
      ? `Content that already exists (do not propose duplicates):\n${context.existingContent
          .map((title) => `- ${title}`)
          .join('\n')}`
      : 'No published content yet.';

  const comparisons =
    context.existingComparisons.length > 0
      ? `Comparison pages already built: ${context.existingComparisons.join(', ')}.`
      : 'No comparison pages built yet.';

  return [
    summarizeMetrics(context.metrics),
    '',
    summarizeExperiments(context.experiments),
    '',
    content,
    comparisons,
    '',
    `Propose exactly ${context.taskCount} tasks for the coming week, ranked by priority.`,
  ].join('\n');
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/**
 * Validate the planner's output.
 *
 * Anything malformed is dropped rather than repaired. A task with an invented
 * channel or a missing rationale is a task nobody can act on, and silently
 * coercing it to something valid would put work the model never actually
 * proposed in front of the founder as though it had.
 */
export function parsePlannerResponse(parsed: unknown, maxTasks = 10): ProposedTask[] {
  const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
  const rawTasks = Array.isArray(root.tasks) ? root.tasks : [];

  const tasks: ProposedTask[] = [];

  for (const raw of rawTasks) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Record<string, unknown>;

    const title = cleanString(item.title, 300);
    const rationale = cleanString(item.rationale, 2000);
    if (!title || !rationale) continue;

    const channel = item.channel;
    if (!isGrowthChannel(channel)) continue;

    const taskType = item.taskType;
    if (!isTaskType(taskType)) continue;

    // Clamp rather than drop: a bad priority is a ranking problem, not a
    // reason to lose an otherwise well-formed task.
    const rawPriority = Number(item.priority);
    const priority = Number.isFinite(rawPriority)
      ? Math.min(10, Math.max(1, Math.round(rawPriority)))
      : 5;

    tasks.push({
      title,
      rationale,
      channel,
      taskType,
      priority,
      expectedImpact: cleanString(item.expectedImpact, 500),
    });

    if (tasks.length >= maxTasks) break;
  }

  return tasks.sort((a, b) => a.priority - b.priority);
}

export function isGrowthChannel(value: unknown): value is GrowthChannel {
  return typeof value === 'string' && (GROWTH_CHANNELS as readonly string[]).includes(value);
}

export function isTaskType(value: unknown): value is TaskType {
  return typeof value === 'string' && (TASK_TYPES as readonly string[]).includes(value);
}
