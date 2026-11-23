'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, HeartHandshake, Lightbulb, MessageCircle, Timer, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { loadCrewJobs, daysAgo } from '@/lib/crew-data';
import {
  buildCrewReport,
  MIN_JOBS_FOR_RECOGNITION,
  type CrewJob,
  type PaceBand,
  type WorkerCrewStats,
} from '@/lib/crew-insights';
import { formatMinutes } from '@/lib/step-times';

type RangeDays = 30 | 90 | 365;

const PACE: Record<PaceBand, { label: string; className: string; hint: string }> = {
  steady: { label: 'Normal pace', className: 'bg-green-100 text-green-800', hint: 'Within the normal range for the jobs they do.' },
  long: { label: 'Takes longer', className: 'bg-amber-100 text-amber-800', hint: 'Jobs run well over typical.' },
  rushed: { label: 'Rushed?', className: 'bg-red-100 text-red-800', hint: 'Jobs finish far under typical — spot-check quality.' },
  not_enough_data: { label: 'Not enough jobs', className: 'bg-gray-100 text-gray-600', hint: 'Needs 3+ timed jobs.' },
};

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);

export default function CrewReportPage() {
  const { dbUser } = useAuth();
  const { can } = usePermissions();
  const companyId = dbUser?.company_id;

  const [rangeDays, setRangeDays] = useState<RangeDays>(90);
  const [jobs, setJobs] = useState<CrewJob[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      loadCrewJobs(supabase, companyId, { since: daysAgo(rangeDays) }),
      supabase.from('users').select('id, full_name').eq('company_id', companyId),
    ])
      .then(([crewJobs, usersRes]) => {
        if (cancelled) return;
        if (usersRes.error) throw new Error(usersRes.error.message);
        const map: Record<string, string> = {};
        for (const u of (usersRes.data || []) as { id: string; full_name: string | null }[]) {
          map[u.id] = u.full_name || 'Team member';
        }
        setJobs(crewJobs);
        setNames(map);
      })
      .catch((err) => {
        console.error('Crew report load failed:', err);
        if (!cancelled) setError('Could not load crew data.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId, rangeDays]);

  const report = useMemo(() => buildCrewReport(jobs), [jobs]);
  const name = (id: string) => names[id] || 'Team member';
  // Alphabetical on purpose: this is not a leaderboard.
  const workers = useMemo(
    () => [...report.workers].sort((a, b) => name(a.workerId).localeCompare(name(b.workerId))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [report, names]
  );
  const recognized = workers.filter((w) => w.recognitions.length > 0);
  const coaching = workers.filter((w) => w.coaching.length > 0);

  if (!can('settings')) {
    return <div className="card p-8 text-center text-gray-600">You don&apos;t have access to reports.</div>;
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
              <Users className="text-blue-600" size={24} /> Crew Insights
            </h1>
            <p className="text-sm text-gray-500 mt-1">Who&apos;s doing great work, typical job times, and where someone may need support.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/reports/step-times" className="btn-secondary text-sm inline-flex items-center gap-1">
              <Timer size={16} /> Step Times
            </Link>
            {([30, 90, 365] as RangeDays[]).map((d) => (
              <button key={d} onClick={() => setRangeDays(d)} className={rangeDays === d ? 'btn-primary text-sm' : 'btn-ghost text-sm'}>
                {d === 365 ? 'Last year' : `Last ${d} days`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900">
        <HeartHandshake size={18} className="flex-shrink-0 mt-0.5" />
        <p>
          This page is for you, not a leaderboard for the crew. Recognition goes to people who work at a normal pace
          <strong> and</strong> do the job properly: checklist followed as the work happens, required steps done, photos
          taken, on site. Finishing far faster than typical is never rewarded on its own — it&apos;s flagged so you can check
          the quality.
        </p>
      </div>

      {error && <div className="card p-4 text-red-700">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-gray-500">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">No completed jobs in this period yet.</div>
      ) : (
        <>
          {/* Recognition */}
          <section className="card p-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Award size={18} className="text-amber-500" /> Recognition
            </h2>
            {recognized.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nobody qualifies yet. Recognition needs at least {MIN_JOBS_FOR_RECOGNITION} jobs with the checklist
                tapped as each step is finished.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recognized.map((w) => (
                  <div key={w.workerId} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="font-semibold text-gray-900">{name(w.workerId)}</p>
                    <ul className="mt-2 space-y-1.5">
                      {w.recognitions.map((r) => (
                        <li key={r.key} className="text-sm">
                          <span className="font-medium text-amber-800">{r.title}</span>
                          <span className="text-gray-700"> — {r.reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Typical times */}
          <section className="card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Typical on-site time by job type</h2>
              <p className="text-xs text-gray-500 mt-0.5">Clock-in to clock-out, median across the crew.</p>
            </div>
            {report.jobTypes.length === 0 ? (
              <p className="p-5 text-sm text-gray-500">No jobs with both a clock-in and clock-out yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header text-left px-5 py-2">Job type</th>
                    <th className="table-header text-right px-5 py-2">Typical</th>
                    <th className="table-header text-right px-5 py-2">Timed jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {report.jobTypes.map((t) => (
                    <tr key={t.jobType}>
                      <td className="table-cell px-5 py-2">{t.jobType}</td>
                      <td className="table-cell text-right px-5 py-2 font-medium">{formatMinutes(t.medianMinutes)}</td>
                      <td className="table-cell text-right px-5 py-2 text-gray-600">{t.samples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Crew table */}
          <section className="card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Your crew</h2>
              <p className="text-xs text-gray-500 mt-0.5">Alphabetical. Tap a name for their times by job type.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header text-left px-5 py-2">Worker</th>
                    <th className="table-header text-right px-3 py-2">Jobs</th>
                    <th className="table-header text-left px-3 py-2">Pace</th>
                    <th className="table-header text-right px-3 py-2" title="Checklist tapped as the work happened, not all at once">Checklist followed</th>
                    <th className="table-header text-right px-3 py-2">Required done</th>
                    <th className="table-header text-right px-3 py-2">Photos</th>
                    <th className="table-header text-right px-3 py-2" title="Checks made at the job address">On site</th>
                    <th className="table-header text-right px-5 py-2">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w) => (
                    <Fragment key={w.workerId}>
                      <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setOpen(open === w.workerId ? null : w.workerId)}>
                        <td className="table-cell px-5 py-2 font-medium">
                          <span className="inline-flex items-center gap-1">
                            {open === w.workerId ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {name(w.workerId)}
                            {w.recognitions.length > 0 && <Award size={14} className="text-amber-500" aria-label="Recognized" />}
                          </span>
                        </td>
                        <td className="table-cell text-right px-3 py-2">{w.jobs}</td>
                        <td className="table-cell px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${PACE[w.pace].className}`} title={PACE[w.pace].hint}>
                            {PACE[w.pace].label}
                          </span>
                        </td>
                        <td className="table-cell text-right px-3 py-2">{pct(w.disciplineRate)}</td>
                        <td className="table-cell text-right px-3 py-2">{pct(w.requiredCompleteRate)}</td>
                        <td className="table-cell text-right px-3 py-2">{pct(w.photoRate)}</td>
                        <td className="table-cell text-right px-3 py-2">
                          {w.locatedChecks ? pct(1 - w.awayChecks / w.locatedChecks) : '—'}
                        </td>
                        <td className="table-cell text-right px-5 py-2">{w.reviews}</td>
                      </tr>
                      {open === w.workerId && <WorkerDetail w={w} />}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Coaching */}
          {coaching.length > 0 && (
            <section className="card p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <MessageCircle size={18} className="text-blue-600" /> Worth a conversation
              </h2>
              <p className="text-xs text-gray-500 mb-3">Private to you. Often there&apos;s a good reason — ask before assuming.</p>
              <ul className="space-y-3">
                {coaching.map((w) => (
                  <li key={w.workerId}>
                    <p className="text-sm font-medium text-gray-900">{name(w.workerId)}</p>
                    <ul className="list-disc ml-5 text-sm text-gray-700">
                      {w.coaching.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Learn from */}
          {report.learnFrom.length > 0 && (
            <section className="card p-5">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-1">
                <Lightbulb size={18} className="text-amber-500" /> Learn from the crew
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Recognized workers who do a step quicker than typical without cutting corners. Ask them to show others how.
              </p>
              <ul className="space-y-1 text-sm">
                {report.learnFrom.map((l) => (
                  <li key={`${l.step}-${l.workerId}`}>
                    <span className="font-medium">{name(l.workerId)}</span> — {l.step}: {formatMinutes(l.workerMinutes)}
                    <span className="text-gray-500"> (typical {formatMinutes(l.teamMinutes)})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function WorkerDetail({ w }: { w: WorkerCrewStats }) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={8} className="px-5 py-3">
        {w.byType.length === 0 ? (
          <p className="text-sm text-gray-500">No jobs with a clock-in and clock-out yet.</p>
        ) : (
          <table className="text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="text-left pr-6 py-1 font-medium">Job type</th>
                <th className="text-right pr-6 py-1 font-medium">Jobs</th>
                <th className="text-right pr-6 py-1 font-medium">Their typical</th>
                <th className="text-right py-1 font-medium">Team typical</th>
              </tr>
            </thead>
            <tbody>
              {w.byType.map((b) => (
                <tr key={b.jobType}>
                  <td className="pr-6 py-1">{b.jobType}</td>
                  <td className="text-right pr-6 py-1">{b.jobs}</td>
                  <td className="text-right pr-6 py-1">{formatMinutes(b.medianMinutes)}</td>
                  <td className="text-right py-1 text-gray-600">{b.teamMedianMinutes === null ? '—' : formatMinutes(b.teamMedianMinutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {w.coaching.length > 0 && (
          <ul className="list-disc ml-5 mt-2 text-sm text-gray-700">
            {w.coaching.map((c) => <li key={c}>{c}</li>)}
          </ul>
        )}
      </td>
    </tr>
  );
}
