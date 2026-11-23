/**
 * Loads a company's jobs with everything crew insights need: checklist items
 * (with time, worker and location), time entries, photo counts and whether the
 * customer left a review. Works with the browser client (RLS-scoped) or a
 * service-role client (cron / digest).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  jobOnSiteMinutes,
  jobSpansFromTimeEntries,
  MIN_JOBS_FOR_TYPICAL,
  type CrewJob,
} from './crew-insights';
import { median } from './step-times';

export const GENERAL_JOB_TYPE = 'General';
// Keep .in() lists short enough for the request URL.
const CHUNK = 150;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ITEM_BASE = 'job_id, item_text, sort_order, is_required, is_completed, completed_at, completed_by';
const ITEM_FULL = `${ITEM_BASE}, completed_lat, completed_lng, completed_accuracy_m`;

type ItemRow = {
  job_id: string;
  item_text: string;
  sort_order: number | null;
  is_required: boolean | null;
  is_completed: boolean | null;
  completed_at: string | null;
  completed_by: string | null;
  completed_lat?: number | null;
  completed_lng?: number | null;
  completed_accuracy_m?: number | null;
};
type TimeRow = { job_id: string; user_id: string | null; clock_in: string | null; clock_out: string | null };
type JobRow = {
  id: string;
  scheduled_date: string;
  required_service_id: string | null;
  lat: number | null;
  lng: number | null;
};

export interface LoadCrewJobsOptions {
  /** Inclusive YYYY-MM-DD lower bound on scheduled_date. */
  since: string;
  /** Job statuses to include. Defaults to completed jobs only. */
  statuses?: string[];
}

export async function loadCrewJobs(
  supabase: SupabaseClient,
  companyId: string,
  { since, statuses = ['completed'] }: LoadCrewJobsOptions
): Promise<CrewJob[]> {
  const { data: jobRows, error: jobErr } = await supabase
    .from('jobs')
    .select('id, scheduled_date, required_service_id, lat, lng')
    .eq('company_id', companyId)
    .in('status', statuses)
    .gte('scheduled_date', since);
  if (jobErr) throw new Error(`jobs: ${jobErr.message}`);
  const jobs = (jobRows || []) as JobRow[];
  if (jobs.length === 0) return [];

  const serviceIds = Array.from(new Set(jobs.map((j) => j.required_service_id).filter(Boolean))) as string[];
  const serviceName: Record<string, string> = {};
  if (serviceIds.length) {
    const { data, error } = await supabase.from('services').select('id, name').in('id', serviceIds);
    if (error) throw new Error(`services: ${error.message}`);
    for (const s of (data || []) as { id: string; name: string }[]) serviceName[s.id] = s.name;
  }

  const items: ItemRow[] = [];
  const times: TimeRow[] = [];
  const photoCount: Record<string, number> = {};
  const reviewed = new Set<string>();
  let itemColumns = ITEM_FULL;

  for (const ids of chunk(jobs.map((j) => j.id), CHUNK)) {
    let itemRes = await supabase.from('job_checklists').select(itemColumns).in('job_id', ids);
    if (itemRes.error && /column .* does not exist/i.test(itemRes.error.message)) {
      // Location migration not applied here yet.
      itemColumns = ITEM_BASE;
      itemRes = await supabase.from('job_checklists').select(itemColumns).in('job_id', ids);
    }
    if (itemRes.error) throw new Error(`job_checklists: ${itemRes.error.message}`);

    const [timeRes, photoRes, reviewRes] = await Promise.all([
      supabase.from('time_entries').select('job_id, user_id, clock_in, clock_out').in('job_id', ids),
      supabase.from('job_photos').select('job_id').in('job_id', ids),
      supabase.from('review_requests').select('job_id').eq('status', 'reviewed').in('job_id', ids),
    ]);
    if (timeRes.error) throw new Error(`time_entries: ${timeRes.error.message}`);
    // Photos and reviews enrich the picture; a failure there shouldn't sink the report.
    if (photoRes.error) console.error('crew-data: job_photos', photoRes.error.message);
    if (reviewRes.error) console.error('crew-data: review_requests', reviewRes.error.message);

    items.push(...((itemRes.data || []) as unknown as ItemRow[]));
    times.push(...((timeRes.data || []) as TimeRow[]));
    for (const p of (photoRes.data || []) as { job_id: string }[]) {
      photoCount[p.job_id] = (photoCount[p.job_id] || 0) + 1;
    }
    for (const r of (reviewRes.data || []) as { job_id: string | null }[]) if (r.job_id) reviewed.add(r.job_id);
  }

  const itemsByJob: Record<string, ItemRow[]> = {};
  for (const it of items) (itemsByJob[it.job_id] ||= []).push(it);
  const timesByJob: Record<string, TimeRow[]> = {};
  for (const t of times) (timesByJob[t.job_id] ||= []).push(t);

  return jobs.map((j) => {
    const jobTimes = timesByJob[j.id] || [];
    const clockIns = jobTimes.map((t) => t.clock_in).filter(Boolean) as string[];
    const clockOuts = jobTimes.map((t) => t.clock_out).filter(Boolean) as string[];
    // Only call the job timed when every entry on it has clocked out.
    const allOut = jobTimes.length > 0 && clockOuts.length === jobTimes.length;
    const jobItems = (itemsByJob[j.id] || []).map((it) => ({
      text: it.item_text,
      sortOrder: it.sort_order ?? 0,
      required: it.is_required ?? true,
      completed: !!it.is_completed,
      completedAt: it.completed_at,
      completedBy: it.completed_by,
      completedLat: it.completed_lat ?? null,
      completedLng: it.completed_lng ?? null,
      completedAccuracyM: it.completed_accuracy_m ?? null,
    }));
    const timeCrew = Array.from(new Set(jobTimes.map((t) => t.user_id).filter(Boolean))) as string[];
    const checkCrew = Array.from(new Set(jobItems.map((i) => i.completedBy).filter(Boolean))) as string[];
    return {
      jobId: j.id,
      jobType: (j.required_service_id && serviceName[j.required_service_id]) || GENERAL_JOB_TYPE,
      scheduledDate: j.scheduled_date,
      jobLat: j.lat,
      jobLng: j.lng,
      clockIn: clockIns.length ? clockIns.sort()[0] : null,
      clockOut: allOut ? clockOuts.sort()[clockOuts.length - 1] : null,
      crew: timeCrew.length ? timeCrew : checkCrew,
      items: jobItems,
      photoCount: photoCount[j.id] || 0,
      reviewed: reviewed.has(j.id),
    };
  });
}

/** YYYY-MM-DD for `days` ago. */
export function daysAgo(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
}

export interface ServiceTypical {
  /** Median on-site minutes, or null with fewer than MIN_JOBS_FOR_TYPICAL timed jobs. */
  medianMinutes: number | null;
  samples: number;
  /** What the service is configured to take (services.duration_minutes). */
  configuredMinutes: number | null;
}

/** Real on-site time for a service, from its most recent completed jobs. */
export async function fetchServiceTypical(
  supabase: SupabaseClient,
  companyId: string,
  serviceId: string,
  recentJobs = 60
): Promise<ServiceTypical> {
  const [jobsRes, serviceRes] = await Promise.all([
    supabase
      .from('jobs')
      .select('id')
      .eq('company_id', companyId)
      .eq('required_service_id', serviceId)
      .eq('status', 'completed')
      .order('scheduled_date', { ascending: false })
      .limit(recentJobs),
    supabase.from('services').select('duration_minutes').eq('id', serviceId).maybeSingle(),
  ]);
  if (jobsRes.error) throw new Error(`jobs: ${jobsRes.error.message}`);
  const configuredMinutes =
    (serviceRes.data as { duration_minutes: number | null } | null)?.duration_minutes ?? null;

  const ids = ((jobsRes.data || []) as { id: string }[]).map((j) => j.id);
  if (ids.length === 0) return { medianMinutes: null, samples: 0, configuredMinutes };

  const { data, error } = await supabase
    .from('time_entries')
    .select('job_id, clock_in, clock_out')
    .in('job_id', ids);
  if (error) throw new Error(`time_entries: ${error.message}`);

  const spans = jobSpansFromTimeEntries(
    (data || []) as { job_id: string; clock_in: string | null; clock_out: string | null }[]
  );
  const minutes = Object.values(spans)
    .map((s) => jobOnSiteMinutes(s))
    .filter((m): m is number => m !== null);
  return {
    medianMinutes: minutes.length >= MIN_JOBS_FOR_TYPICAL ? median(minutes) : null,
    samples: minutes.length,
    configuredMinutes,
  };
}
