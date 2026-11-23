import {
  loadOrCreateJobChecklist,
  setChecklistItemCompleted,
  formatChecklistTime,
  rowToItem,
} from '@/lib/job-checklist';
import type { SupabaseClient } from '@supabase/supabase-js';

type Result = { data?: unknown; error: { message: string } | null };

/** Minimal chainable supabase-js stand-in; each terminal call pops the next result. */
function mockSupabase(results: Result[]) {
  const calls: { op: string; args: unknown[] }[] = [];
  const queue = [...results];
  const builder: Record<string, unknown> = {};
  const chain = (op: string) => (...args: unknown[]) => {
    calls.push({ op, args });
    return builder;
  };
  for (const op of ['from', 'select', 'insert', 'update', 'eq', 'order']) builder[op] = chain(op);
  builder.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(queue.shift() ?? { data: null, error: null }).then(resolve, reject);
  return { client: builder as unknown as SupabaseClient, calls };
}

const template = [
  { text: 'Arrive', required: true },
  { text: 'Sign-off', required: false },
];

describe('loadOrCreateJobChecklist', () => {
  it('returns the saved checklist when the job already has one', async () => {
    const { client, calls } = mockSupabase([
      {
        data: [{
          id: 'a', item_text: 'Arrive', is_required: true, is_completed: true,
          completed_at: '2026-11-23T22:14:00Z', completed_by: 'w1', sort_order: 0,
        }],
        error: null,
      },
    ]);
    const items = await loadOrCreateJobChecklist(client, 'job1', template);
    expect(items).toEqual([{
      id: 'a', text: 'Arrive', required: true, completed: true,
      completedAt: '2026-11-23T22:14:00Z', completedBy: 'w1',
    }]);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('creates the checklist from the template on first open, in order', async () => {
    const { client, calls } = mockSupabase([
      { data: [], error: null },
      {
        data: [
          { id: 'b', item_text: 'Sign-off', is_required: false, is_completed: false, completed_at: null, completed_by: null, sort_order: 1 },
          { id: 'a', item_text: 'Arrive', is_required: true, is_completed: false, completed_at: null, completed_by: null, sort_order: 0 },
        ],
        error: null,
      },
    ]);
    const items = await loadOrCreateJobChecklist(client, 'job1', template);
    const insert = calls.find((c) => c.op === 'insert');
    expect(insert?.args[0]).toEqual([
      { job_id: 'job1', item_text: 'Arrive', is_required: true, is_completed: false, sort_order: 0 },
      { job_id: 'job1', item_text: 'Sign-off', is_required: false, is_completed: false, sort_order: 1 },
    ]);
    expect(items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(items[1].required).toBe(false);
  });

  it('throws on a read error so the page can fall back to a local checklist', async () => {
    const { client } = mockSupabase([{ data: null, error: { message: 'column "is_required" does not exist' } }]);
    await expect(loadOrCreateJobChecklist(client, 'job1', template)).rejects.toThrow('is_required');
  });

  it('throws on an insert error instead of silently returning nothing', async () => {
    const { client } = mockSupabase([
      { data: [], error: null },
      { data: null, error: { message: 'new row violates row-level security policy' } },
    ]);
    await expect(loadOrCreateJobChecklist(client, 'job1', template)).rejects.toThrow('row-level security');
  });
});

describe('setChecklistItemCompleted', () => {
  it('stamps who and when on check', async () => {
    const { client, calls } = mockSupabase([{ error: null }]);
    const now = new Date('2026-11-23T22:14:00Z');
    const result = await setChecklistItemCompleted(client, 'item1', true, 'w1', now);
    expect(result).toEqual({ completedAt: '2026-11-23T22:14:00.000Z', completedBy: 'w1' });
    expect(calls.find((c) => c.op === 'update')?.args[0]).toEqual({
      is_completed: true, completed_at: '2026-11-23T22:14:00.000Z', completed_by: 'w1',
    });
    expect(calls.find((c) => c.op === 'eq')?.args).toEqual(['id', 'item1']);
  });

  it('clears the stamp on uncheck', async () => {
    const { client, calls } = mockSupabase([{ error: null }]);
    const result = await setChecklistItemCompleted(client, 'item1', false, 'w1');
    expect(result).toEqual({ completedAt: null, completedBy: null });
    expect(calls.find((c) => c.op === 'update')?.args[0]).toEqual({
      is_completed: false, completed_at: null, completed_by: null,
    });
  });

  it('throws when the update fails', async () => {
    const { client } = mockSupabase([{ error: { message: 'permission denied' } }]);
    await expect(setChecklistItemCompleted(client, 'item1', true, 'w1')).rejects.toThrow('permission denied');
  });
});

describe('formatChecklistTime', () => {
  it('formats in the business timezone as 12-hour time', () => {
    expect(formatChecklistTime('2026-11-23T22:14:00Z', 'America/Los_Angeles')).toBe('2:14 PM');
    expect(formatChecklistTime('2026-11-23T22:14:00Z', 'America/New_York')).toBe('5:14 PM');
  });

  it('never returns 24-hour time', () => {
    expect(formatChecklistTime('2026-11-23T22:14:00Z', 'UTC')).toBe('10:14 PM');
  });

  it('survives a bad timezone name and empty input', () => {
    expect(formatChecklistTime('2026-11-23T22:14:00Z', 'Not/AZone')).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
    expect(formatChecklistTime(null)).toBe('');
    expect(formatChecklistTime('garbage')).toBe('');
  });
});

describe('rowToItem', () => {
  it('treats a missing is_required as required', () => {
    expect(rowToItem({
      id: 'x', item_text: 't', is_required: null, is_completed: null,
      completed_at: null, completed_by: null, sort_order: null,
    }).required).toBe(true);
  });
});
