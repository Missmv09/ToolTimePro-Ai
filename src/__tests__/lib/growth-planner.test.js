/**
 * Tests for the growth agent planner.
 *
 * Two things carry real risk here. What the model is told — because a prompt
 * missing the experiment history quietly turns the agent into a content mill
 * that reproposes the same work forever. And what we believe from what it says
 * back — because a proposed task costs money and ends up in front of a human
 * as though the model actually proposed it.
 */

import {
  GROWTH_CHANNELS,
  TASK_TYPES,
  buildPlannerPrompt,
  parsePlannerResponse,
  isGrowthChannel,
  isTaskType,
} from '@/lib/growth-planner';

const baseContext = (overrides = {}) => ({
  metrics: [],
  experiments: [],
  existingContent: [],
  existingComparisons: [],
  taskCount: 5,
  ...overrides,
});

const validTask = (overrides = {}) => ({
  title: 'Write a Workiz alternative comparison page',
  rationale: 'Comparison pages convert 3x better than blog posts in the last 30 days.',
  channel: 'comparison_page',
  taskType: 'write_comparison_page',
  priority: 1,
  expectedImpact: '~15 extra leads/month',
  ...overrides,
});

describe('buildPlannerPrompt', () => {
  it('says plainly when there is no data, rather than implying a baseline exists', () => {
    const prompt = buildPlannerPrompt(baseContext());
    expect(prompt).toContain('No funnel data recorded yet');
    expect(prompt).toContain('week zero');
  });

  it('summarizes the funnel with real totals', () => {
    const prompt = buildPlannerPrompt(
      baseContext({
        metrics: [
          {
            metric_date: '2026-08-17',
            leads_captured: 4,
            leads_total: 40,
            signups: 1,
            trials_active: 3,
            paid_active: 2,
            by_source: { tool_final_wage: 3, pricing: 1 },
          },
          {
            metric_date: '2026-08-16',
            leads_captured: 6,
            leads_total: 36,
            signups: 2,
            trials_active: 3,
            paid_active: 2,
            by_source: { tool_final_wage: 6 },
          },
        ],
      })
    );

    expect(prompt).toContain('Leads captured: 10');
    expect(prompt).toContain('Signups: 3');
    // Sources aggregate across the window, not just the newest row.
    expect(prompt).toContain('tool_final_wage: 9');
    expect(prompt).toContain('Paying customers: 2');
  });

  // The experiment history is the agent's memory. Without it in the prompt,
  // the planner proposes the same plausible work every week forever.
  it('feeds past experiments back in, with their learnings', () => {
    const prompt = buildPlannerPrompt(
      baseContext({
        experiments: [
          {
            hypothesis: 'Free tools convert better than blog posts',
            channel: 'free_tool',
            status: 'won',
            metric: 'lead_rate',
            baseline_value: 2,
            actual_value: 9,
            learning: 'Tool visitors convert 4x. Build more tools.',
          },
        ],
      })
    );

    expect(prompt).toContain('do not repeat these');
    expect(prompt).toContain('Free tools convert better than blog posts');
    expect(prompt).toContain('lead_rate: 2 -> 9');
    expect(prompt).toContain('Tool visitors convert 4x');
  });

  it('states when nothing has been ruled in or out yet', () => {
    expect(buildPlannerPrompt(baseContext())).toContain('No experiments have been run yet');
  });

  it('lists existing content so the agent does not repropose it', () => {
    const prompt = buildPlannerPrompt(
      baseContext({
        existingContent: ['How to Price HVAC Jobs'],
        existingComparisons: ['jobber', 'housecall-pro'],
      })
    );
    expect(prompt).toContain('do not propose duplicates');
    expect(prompt).toContain('How to Price HVAC Jobs');
    expect(prompt).toContain('jobber, housecall-pro');
  });

  it('asks for the requested number of tasks', () => {
    expect(buildPlannerPrompt(baseContext({ taskCount: 3 }))).toContain('exactly 3 tasks');
  });
});

describe('parsePlannerResponse', () => {
  it('accepts a well-formed task', () => {
    const tasks = parsePlannerResponse({ tasks: [validTask()] });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].channel).toBe('comparison_page');
    expect(tasks[0].priority).toBe(1);
  });

  it('returns tasks in priority order', () => {
    const tasks = parsePlannerResponse({
      tasks: [
        validTask({ title: 'third', priority: 8 }),
        validTask({ title: 'first', priority: 1 }),
        validTask({ title: 'second', priority: 4 }),
      ],
    });
    expect(tasks.map((t) => t.title)).toEqual(['first', 'second', 'third']);
  });

  // A task with an invented channel is one nothing downstream can act on.
  // Coercing it to a valid value would put work in front of the founder that
  // the model never actually proposed.
  it('drops a task with a channel the agent is not allowed to use', () => {
    expect(parsePlannerResponse({ tasks: [validTask({ channel: 'billboards' })] })).toHaveLength(0);
  });

  it('drops a task with a type the generator cannot build', () => {
    expect(parsePlannerResponse({ tasks: [validTask({ taskType: 'do_marketing' })] })).toHaveLength(0);
  });

  it.each([
    ['a missing title', { title: undefined }],
    ['a blank title', { title: '   ' }],
    ['a missing rationale', { rationale: undefined }],
  ])('drops a task with %s', (_label, overrides) => {
    expect(parsePlannerResponse({ tasks: [validTask(overrides)] })).toHaveLength(0);
  });

  // A bad priority is a ranking problem, not a reason to lose the task.
  it.each([
    ['above the range', 99, 10],
    ['below the range', -4, 1],
    ['fractional', 2.6, 3],
    ['non-numeric', 'urgent', 5],
    ['missing', undefined, 5],
  ])('clamps a %s priority rather than dropping the task', (_label, input, expected) => {
    const tasks = parsePlannerResponse({ tasks: [validTask({ priority: input })] });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].priority).toBe(expected);
  });

  it('keeps the good tasks when only some are malformed', () => {
    const tasks = parsePlannerResponse({
      tasks: [validTask({ title: 'keep me' }), validTask({ channel: 'nonsense' }), null, 'string'],
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('keep me');
  });

  it('caps how much work a single run can propose', () => {
    const tasks = parsePlannerResponse(
      { tasks: Array.from({ length: 40 }, () => validTask()) },
      5
    );
    expect(tasks).toHaveLength(5);
  });

  it.each([
    ['null', null],
    ['a string', 'tasks: none'],
    ['an object with no tasks array', { result: 'ok' }],
    ['tasks as a string', { tasks: 'none' }],
  ])('returns nothing for %s rather than throwing', (_label, input) => {
    expect(() => parsePlannerResponse(input)).not.toThrow();
    expect(parsePlannerResponse(input)).toEqual([]);
  });
});

describe('allowlists', () => {
  it('recognizes every declared channel and task type', () => {
    for (const channel of GROWTH_CHANNELS) expect(isGrowthChannel(channel)).toBe(true);
    for (const type of TASK_TYPES) expect(isTaskType(type)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isGrowthChannel('tv')).toBe(false);
    expect(isTaskType('')).toBe(false);
    expect(isTaskType(undefined)).toBe(false);
  });
});
