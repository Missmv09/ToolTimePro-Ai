/**
 * Job checklist persistence.
 *
 * Each item lives in `job_checklists` and is stamped with who checked it and
 * when, so the office can see progress and the business has a record of when
 * each step happened (disputes, job costing, tap-through detection).
 *
 * The worker page must never be blocked by this: if the table can't be read or
 * written (migration not applied, RLS, offline), callers fall back to an
 * in-memory checklist exactly like the app had before.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ChecklistTemplateItem {
  text: string;
  required: boolean;
}

export interface SavedChecklistItem {
  id: string;
  text: string;
  required: boolean;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  completedLat: number | null;
  completedLng: number | null;
  completedAccuracyM: number | null;
}

export interface GeoFix {
  lat: number;
  lng: number;
  accuracyM: number | null;
}

interface ChecklistRow {
  id: string;
  item_text: string;
  is_required: boolean | null;
  is_completed: boolean | null;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number | null;
  completed_lat?: number | null;
  completed_lng?: number | null;
  completed_accuracy_m?: number | null;
}

const BASE_COLUMNS = 'id, item_text, is_required, is_completed, completed_at, completed_by, sort_order';
const COLUMNS = `${BASE_COLUMNS}, completed_lat, completed_lng, completed_accuracy_m`;

/** Postgres 42703: the location columns' migration hasn't run in this environment yet. */
function isMissingColumn(error: { message: string; code?: string } | null): boolean {
  return !!error && (error.code === '42703' || /column .* does not exist/i.test(error.message));
}

export function rowToItem(row: ChecklistRow): SavedChecklistItem {
  return {
    id: row.id,
    text: row.item_text,
    required: row.is_required ?? true,
    completed: !!row.is_completed,
    completedAt: row.completed_at,
    completedBy: row.completed_by,
    completedLat: row.completed_lat ?? null,
    completedLng: row.completed_lng ?? null,
    completedAccuracyM: row.completed_accuracy_m ?? null,
  };
}

/** Read a job's saved checklist, ordered as the worker sees it. */
export async function fetchJobChecklist(
  supabase: SupabaseClient,
  jobId: string
): Promise<SavedChecklistItem[]> {
  const query = (columns: string) =>
    supabase
      .from('job_checklists')
      .select(columns)
      .eq('job_id', jobId)
      .order('sort_order', { ascending: true });
  let { data, error } = await query(COLUMNS);
  if (isMissingColumn(error)) ({ data, error } = await query(BASE_COLUMNS));
  if (error) throw new Error(error.message);
  return ((data || []) as unknown as ChecklistRow[]).map(rowToItem);
}

/**
 * Load the job's checklist, creating it from the template the first time the
 * job is opened. Throws if the table can't be used so the caller can fall back.
 */
export async function loadOrCreateJobChecklist(
  supabase: SupabaseClient,
  jobId: string,
  template: ChecklistTemplateItem[]
): Promise<SavedChecklistItem[]> {
  const existing = await fetchJobChecklist(supabase, jobId);
  if (existing.length > 0) return existing;

  const { data, error } = await supabase
    .from('job_checklists')
    .insert(
      template.map((item, index) => ({
        job_id: jobId,
        item_text: item.text,
        is_required: item.required,
        is_completed: false,
        sort_order: index,
      }))
    )
    .select(BASE_COLUMNS);
  if (error) throw new Error(error.message);

  return ((data || []) as ChecklistRow[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(rowToItem);
}

/** Check or uncheck one item. Unchecking clears the stamp. */
export async function setChecklistItemCompleted(
  supabase: SupabaseClient,
  itemId: string,
  completed: boolean,
  workerId: string,
  now: Date = new Date()
): Promise<{ completedAt: string | null; completedBy: string | null }> {
  const completedAt = completed ? now.toISOString() : null;
  const completedBy = completed ? workerId : null;
  const { error } = await supabase
    .from('job_checklists')
    .update({ is_completed: completed, completed_at: completedAt, completed_by: completedBy })
    .eq('id', itemId);
  if (error) throw new Error(error.message);
  if (!completed) {
    // Clear the old location separately so a missing column can't fail the uncheck.
    await supabase
      .from('job_checklists')
      .update({ completed_lat: null, completed_lng: null, completed_accuracy_m: null })
      .eq('id', itemId);
  }
  return { completedAt, completedBy };
}

/**
 * Attach where the worker was when they checked an item. Sent after the check
 * itself so a slow GPS fix never delays the tap. Only writes if the item is
 * still checked. Returns false (never throws) when it couldn't be saved —
 * location is supporting evidence, not something to bother the worker about.
 */
export async function recordChecklistItemLocation(
  supabase: SupabaseClient,
  itemId: string,
  fix: GeoFix
): Promise<boolean> {
  const { error } = await supabase
    .from('job_checklists')
    .update({
      completed_lat: fix.lat,
      completed_lng: fix.lng,
      completed_accuracy_m: fix.accuracyM,
    })
    .eq('id', itemId)
    .eq('is_completed', true);
  if (error) {
    if (!isMissingColumn(error)) console.error('Failed to save checklist location:', error.message);
    return false;
  }
  return true;
}

/** "2:14 PM" in the business's timezone. Always 12-hour. */
export function formatChecklistTime(iso: string | null, timeZone?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  try {
    return date.toLocaleTimeString('en-US', timeZone ? { ...opts, timeZone } : opts);
  } catch {
    // Bad IANA name on the company record — show local time rather than nothing.
    return date.toLocaleTimeString('en-US', opts);
  }
}
