'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Timer, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import {
  buildStepTimesReport,
  formatMinutes,
  TAP_THROUGH_SECONDS,
  MIN_SAMPLES_TO_FLAG,
  type StepJobInput,
} from '@/lib/step-times';

type RangeDays = 30 | 90 | 365;
const GENERAL = 'General';
const ALL = '__all__';
// Keep .in() lists short enough for the URL.
const CHUNK = 150;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function StepTimesPage() {
  const { dbUser } = useAuth();
  const { can } = usePermissions();
  const companyId = dbUser?.company_id;

  const [rangeDays, setRangeDays] = useState<RangeDays>(90);
  const [jobType, setJobType] = useState<string>(ALL);
  const [jobs, setJobs] = useState<StepJobInput[]>([]);
  const [workerNames, setWorkerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const since = new Date(Date.now() - rangeDays * 86400000).toISOString().slice(0, 10);

        const { data: jobRows, error: jobErr } = await supabase
          .from('jobs')
          .select('id, required_service_id')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .gte('scheduled_date', since);
        if (jobErr) throw new Error(jobErr.message);
        const jobList = (jobRows || []) as { id: string; required_service_id: string | null }[];
        const jobIds = jobList.map((j) => j.id);

        const serviceIds = Array.from(new Set(jobList.map((j) => j.required_service_id).filter(Boolean))) as string[];
        const [servicesRes, usersRes] = await Promise.all([
          serviceIds.length
            ? supabase.from('services').select('id, name').in('id', serviceIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('users').select('id, full_name').eq('company_id', companyId),
        ]);
        if (servicesRes.error) throw new Error(servicesRes.error.message);
        if (usersRes.error) throw new Error(usersRes.error.message);
        const serviceName: Record<string, string> = {};
        for (const s of (servicesRes.data || []) as { id: string; name: string }[]) serviceName[s.id] = s.name;

        type ItemRow = {
          job_id: string; item_text: string; sort_order: number | null;
          is_completed: boolean | null; completed_at: string | null; completed_by: string | null;
        };
        type TimeRow = { job_id: string; clock_in: string };
        const items: ItemRow[] = [];
        const times: TimeRow[] = [];
        for (const ids of chunk(jobIds, CHUNK)) {
          const [itemRes, timeRes] = await Promise.all([
            supabase
              .from('job_checklists')
              .select('job_id, item_text, sort_order, is_completed, completed_at, completed_by')
              .in('job_id', ids),
            supabase.from('time_entries').select('job_id, clock_in').in('job_id', ids),
          ]);
          if (itemRes.error) throw new Error(itemRes.error.message);
          if (timeRes.error) throw new Error(timeRes.error.message);
          items.push(...((itemRes.data || []) as ItemRow[]));
          times.push(...((timeRes.data || []) as TimeRow[]));
        }

        const earliestClockIn: Record<string, string> = {};
        for (const t of times) {
          if (!t.clock_in) continue;
          const cur = earliestClockIn[t.job_id];
          if (!cur || t.clock_in < cur) earliestClockIn[t.job_id] = t.clock_in;
        }

        const itemsByJob: Record<string, ItemRow[]> = {};
        for (const it of items) (itemsByJob[it.job_id] ||= []).push(it);

        const inputs: StepJobInput[] = jobList
          .filter((j) => itemsByJob[j.id]?.length)
          .map((j) => ({
            jobId: j.id,
            jobType: (j.required_service_id && serviceName[j.required_service_id]) || GENERAL,
            clockIn: earliestClockIn[j.id] || null,
            items: itemsByJob[j.id].map((it) => ({
              text: it.item_text,
              sortOrder: it.sort_order ?? 0,
              completed: !!it.is_completed,
              completedAt: it.completed_at,
              completedBy: it.completed_by,
            })),
          }));

        const names: Record<string, string> = {};
        for (const u of (usersRes.data || []) as { id: string; full_name: string | null }[]) {
          names[u.id] = u.full_name || 'Team member';
        }

        if (!cancelled) {
          setJobs(inputs);
          setWorkerNames(names);
        }
      } catch (err) {
        console.error('Step times load failed:', err);
        if (!cancelled) setError('Could not load checklist data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [companyId, rangeDays]);

  const jobTypes = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.jobType))).sort(),
    [jobs]
  );
  const report = useMemo(
    () => buildStepTimesReport(jobType === ALL ? jobs : jobs.filter((j) => j.jobType === jobType)),
    [jobs, jobType]
  );
  const name = (id: string) => workerNames[id] || 'Team member';

  if (!can('settings')) {
    return (
      <div className="card p-8 text-center text-gray-600">
        You don&apos;t have access to reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/reports" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Reports
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Timer className="text-blue-600" size={24} /> Step Times
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              How long each checklist step takes, by worker, compared with your team&apos;s typical time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="input text-sm"
              aria-label="Job type"
            >
              <option value={ALL}>All job types</option>
              {jobTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {([30, 90, 365] as RangeDays[]).map((d) => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={rangeDays === d ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
              >
                {d === 365 ? 'Last year' : `Last ${d} days`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
        <Info size={18} className="flex-shrink-0 mt-0.5" />
        <p>
          A step&apos;s time is the gap between its check and the check before it (the first step counts from
          clock-in). Steps after a skipped item aren&apos;t timed. Jobs where every item was checked within{' '}
          {TAP_THROUGH_SECONDS} seconds are treated as tapped through and left out. Workers are flagged only
          after {MIN_SAMPLES_TO_FLAG}+ timed instances of a step. Compare one job type at a time for the fairest picture.
        </p>
      </div>

      {error && <div className="card p-4 text-red-700">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <p className="text-sm text-gray-500">Jobs timed</p>
              <p className="text-2xl font-bold text-gray-900">{report.jobsAnalyzed}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-gray-500">Steps timed</p>
              <p className="text-2xl font-bold text-gray-900">
                {report.steps.reduce((n, s) => n + s.samples, 0)}
              </p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-gray-500">Tapped-through jobs (left out)</p>
              <p className={`text-2xl font-bold ${report.tappedThroughJobs ? 'text-amber-600' : 'text-gray-900'}`}>
                {report.tappedThroughJobs}
              </p>
            </div>
          </div>

          {report.steps.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              No timed steps yet for this period. Times appear once workers check off checklist items as they
              finish each one on completed jobs.
            </div>
          ) : (
            report.steps.map((step) => (
              <div key={step.step} className="card overflow-hidden">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-4 border-b">
                  <h2 className="font-semibold text-gray-900">{step.step}</h2>
                  <p className="text-sm text-gray-600">
                    Typical: <span className="font-semibold text-gray-900">{formatMinutes(step.teamMedianMinutes)}</span>
                    <span className="text-gray-400"> · {step.samples} timed</span>
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="table-header text-left px-5 py-2">Worker</th>
                        <th className="table-header text-right px-5 py-2">Times</th>
                        <th className="table-header text-right px-5 py-2">Their typical</th>
                        <th className="table-header text-right px-5 py-2">vs team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {step.workers.map((w) => (
                        <tr key={w.workerId} className={w.flag === 'slow' ? 'bg-amber-50' : w.flag === 'fast' ? 'bg-blue-50' : ''}>
                          <td className="table-cell px-5 py-2">
                            {name(w.workerId)}
                            {w.flag === 'slow' && <span className="ml-2 text-xs text-amber-700">Slower than typical</span>}
                            {w.flag === 'fast' && <span className="ml-2 text-xs text-blue-700">Much faster — worth a look</span>}
                          </td>
                          <td className="table-cell text-right px-5 py-2">{w.samples}</td>
                          <td className="table-cell text-right px-5 py-2">{formatMinutes(w.medianMinutes)}</td>
                          <td className="table-cell text-right px-5 py-2">{vsTeam(w.ratio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}

          {Object.keys(report.tappedThroughByWorker).length > 0 && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-amber-600" /> Checklists tapped through
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                Every item checked within {TAP_THROUGH_SECONDS} seconds, so these jobs can&apos;t be timed. A reminder to
                check steps as they&apos;re finished usually fixes it.
              </p>
              <ul className="text-sm space-y-1">
                {Object.entries(report.tappedThroughByWorker)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <li key={id} className="flex justify-between max-w-sm">
                      <span>{name(id)}</span>
                      <span className="text-gray-600">{n} job{n === 1 ? '' : 's'}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function vsTeam(ratio: number | null): string {
  if (ratio === null) return '—';
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) return 'same';
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}
