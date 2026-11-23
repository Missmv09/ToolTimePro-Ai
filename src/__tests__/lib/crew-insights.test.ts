import {
  buildCrewReport,
  checkLocationStatus,
  distanceMeters,
  findRunningLong,
  jobOnSiteMinutes,
  alertThresholdMinutes,
  typicalByStepFromReport,
  suggestEndTime,
  jobSpansFromTimeEntries,
  buildCrewDigest,
  type CrewJob,
  type LiveChecklistItem,
} from '@/lib/crew-insights';
import { buildStepTimesReport } from '@/lib/step-times';

const T0 = Date.parse('2026-11-02T16:00:00Z');
const at = (min: number) => new Date(T0 + min * 60000).toISOString();
const SITE = { lat: 34.05, lng: -118.25 };

interface JobOpts {
  minutes?: number | null; // on-site minutes (clock-in -> clock-out)
  checks?: (number | null)[]; // minute offsets per item
  tapped?: boolean;
  photos?: number;
  reviewed?: boolean;
  away?: boolean;
  jobType?: string;
  requiredSkipped?: boolean;
}

let seq = 0;
function crewJob(worker: string, o: JobOpts = {}): CrewJob {
  const minutes = o.minutes === undefined ? 60 : o.minutes;
  const checks = o.tapped
    ? [minutes ?? 60, (minutes ?? 60) + 0.1, (minutes ?? 60) + 0.2]
    : o.checks ?? [10, 30, (minutes ?? 60) - 5];
  const loc = o.away ? { lat: SITE.lat + 0.05, lng: SITE.lng } : SITE;
  return {
    jobId: `job${++seq}`,
    jobType: o.jobType ?? 'Lawn',
    scheduledDate: '2026-11-02',
    jobLat: SITE.lat,
    jobLng: SITE.lng,
    clockIn: at(0),
    clockOut: minutes === null ? null : at(minutes),
    crew: [worker],
    photoCount: o.photos ?? 1,
    reviewed: o.reviewed ?? false,
    items: checks.map((m, i) => {
      const skipped = o.requiredSkipped && i === 1;
      return {
        text: `Step ${i + 1}`,
        sortOrder: i,
        required: true,
        completed: m !== null && !skipped,
        completedAt: m === null || skipped ? null : at(m),
        completedBy: m === null || skipped ? null : worker,
        completedLat: loc.lat,
        completedLng: loc.lng,
        completedAccuracyM: 20,
      };
    }),
  };
}
const times = (n: number, f: () => CrewJob) => Array.from({ length: n }, f);
const worker = (report: ReturnType<typeof buildCrewReport>, id: string) =>
  report.workers.find((w) => w.workerId === id)!;

describe('location', () => {
  it('measures distance', () => {
    expect(Math.round(distanceMeters(34.05, -118.25, 34.06, -118.25))).toBe(1112);
  });

  it('classifies checks on site, away, or unknown', () => {
    expect(checkLocationStatus({ completedLat: 34.0505, completedLng: -118.25, completedAccuracyM: 10 }, SITE.lat, SITE.lng)).toBe('on_site');
    expect(checkLocationStatus({ completedLat: 34.06, completedLng: -118.25, completedAccuracyM: 10 }, SITE.lat, SITE.lng)).toBe('away');
    // a vague fix proves nothing
    expect(checkLocationStatus({ completedLat: 34.06, completedLng: -118.25, completedAccuracyM: 800 }, SITE.lat, SITE.lng)).toBe('unknown');
    // generous when accuracy is mediocre: 300 m off with 100 m accuracy is still on site
    expect(checkLocationStatus({ completedLat: 34.0527, completedLng: -118.25, completedAccuracyM: 100 }, SITE.lat, SITE.lng)).toBe('on_site');
    expect(checkLocationStatus({ completedLat: null, completedLng: null }, SITE.lat, SITE.lng)).toBe('unknown');
    expect(checkLocationStatus({ completedLat: 34.05, completedLng: -118.25 }, null, null)).toBe('unknown');
  });
});

describe('jobOnSiteMinutes', () => {
  it('uses clock-in to clock-out and rejects implausible spans', () => {
    expect(jobOnSiteMinutes({ clockIn: at(0), clockOut: at(90) })).toBe(90);
    expect(jobOnSiteMinutes({ clockIn: at(0), clockOut: null })).toBeNull();
    expect(jobOnSiteMinutes({ clockIn: at(0), clockOut: at(2) })).toBeNull();
    expect(jobOnSiteMinutes({ clockIn: at(0), clockOut: at(20 * 60) })).toBeNull();
  });
});

describe('buildCrewReport — recognition, not a speed contest', () => {
  const steadyAndThorough = () => times(6, () => crewJob('ana', { minutes: 60 }));

  it('recognises a worker at a normal pace who follows the checklist', () => {
    const report = buildCrewReport([...steadyAndThorough(), ...times(6, () => crewJob('ben', { minutes: 65 }))]);
    const ana = worker(report, 'ana');
    expect(ana.pace).toBe('steady');
    expect(ana.recognitions.map((r) => r.key)).toEqual(expect.arrayContaining(['steady_thorough', 'by_the_book']));
    expect(ana.coaching).toEqual([]);
  });

  it('never recognises a rushed worker, and asks for a quality spot-check instead', () => {
    const report = buildCrewReport([
      ...steadyAndThorough(),
      ...times(6, () => crewJob('ben', { minutes: 60 })),
      ...times(6, () => crewJob('fast', { minutes: 20, checks: [5, 10, 15], reviewed: true })),
    ]);
    const fast = worker(report, 'fast');
    expect(fast.pace).toBe('rushed');
    expect(fast.recognitions).toEqual([]);
    expect(fast.coaching.join(' ')).toMatch(/Spot-check the quality/);
  });

  it('does not recognise tapping through the checklist, and says so', () => {
    const report = buildCrewReport([
      ...steadyAndThorough(),
      ...times(6, () => crewJob('tap', { minutes: 60, tapped: true })),
    ]);
    const tap = worker(report, 'tap');
    expect(tap.tappedThroughJobs).toBe(6);
    expect(tap.disciplineRate).toBe(0);
    expect(tap.recognitions.some((r) => r.key === 'steady_thorough' || r.key === 'by_the_book')).toBe(false);
    expect(tap.coaching.join(' ')).toMatch(/whole checklist at once on 6 of 6/);
  });

  it('flags checks made away from the job site', () => {
    const report = buildCrewReport([...steadyAndThorough(), ...times(5, () => crewJob('far', { away: true }))]);
    const far = worker(report, 'far');
    expect(far.awayChecks).toBe(15);
    expect(far.recognitions.some((r) => r.key === 'by_the_book')).toBe(false);
    expect(far.coaching.join(' ')).toMatch(/away from the job site/);
  });

  it('notes long jobs supportively rather than as a failure', () => {
    const report = buildCrewReport([
      ...steadyAndThorough(),
      ...times(6, () => crewJob('ben', { minutes: 60 })),
      ...times(4, () => crewJob('slow', { minutes: 150, checks: [30, 80, 140] })),
    ]);
    expect(worker(report, 'slow').pace).toBe('long');
    expect(worker(report, 'slow').coaching.join(' ')).toMatch(/worth a conversation/);
  });

  it('needs enough jobs before judging pace or recognising', () => {
    const report = buildCrewReport([...steadyAndThorough(), crewJob('new', { minutes: 60 }), crewJob('new', { minutes: 60 })]);
    expect(worker(report, 'new').pace).toBe('not_enough_data');
    expect(worker(report, 'new').recognitions).toEqual([]);
  });

  it('recognises customer reviews only when the pace is not rushed', () => {
    const report = buildCrewReport([
      ...steadyAndThorough(),
      ...times(3, () => crewJob('liked', { minutes: 60, reviewed: true })),
    ]);
    expect(worker(report, 'liked').recognitions.map((r) => r.key)).toContain('customer_favorite');
  });

  it('counts skipped required items against completeness', () => {
    const report = buildCrewReport([
      ...steadyAndThorough(),
      ...times(6, () => crewJob('skip', { minutes: 60, requiredSkipped: true })),
    ]);
    const skip = worker(report, 'skip');
    expect(skip.requiredCompleteRate).toBe(0);
    expect(skip.recognitions).toEqual([]);
  });

  it('reports typical time per job type and per worker per type', () => {
    const report = buildCrewReport([
      ...times(3, () => crewJob('ana', { minutes: 60, jobType: 'Lawn' })),
      ...times(3, () => crewJob('ana', { minutes: 180, checks: [20, 90, 170], jobType: 'Install' })),
    ]);
    expect(report.jobTypes.map((t) => [t.jobType, t.medianMinutes])).toEqual([['Install', 180], ['Lawn', 60]]);
    expect(worker(report, 'ana').byType.map((b) => b.jobType)).toEqual(['Install', 'Lawn']);
  });

  it('suggests learning from a recognised worker who is quicker on a step', () => {
    // ana: step 2 takes 10 min; ben and cy: 30 min. All steady overall.
    const jobs = [
      ...times(6, () => crewJob('ana', { minutes: 60, checks: [10, 20, 55] })),
      ...times(6, () => crewJob('ben', { minutes: 60, checks: [10, 40, 55] })),
      ...times(6, () => crewJob('cy', { minutes: 60, checks: [10, 40, 55] })),
    ];
    const report = buildCrewReport(jobs);
    expect(report.learnFrom).toContainEqual({ step: 'Step 2', workerId: 'ana', workerMinutes: 10, teamMinutes: 30 });
    expect(report.learnFrom.some((l) => l.workerId !== 'ana')).toBe(false);
  });
});

describe('findRunningLong', () => {
  const items = (checks: (number | null)[], alerted: string | null = null): LiveChecklistItem[] =>
    checks.map((m, i) => ({
      id: `i${i}`,
      text: `Step ${i + 1}`,
      sortOrder: i,
      completed: m !== null,
      completedAt: m === null ? null : at(m),
      overdueAlertedAt: i === checks.findIndex((c) => c === null) ? alerted : null,
    }));
  const typical = { 'Step 1': { medianMinutes: 10, samples: 8 }, 'Step 2': { medianMinutes: 30, samples: 8 } };

  it('uses the larger of 2x typical and typical + 20 minutes', () => {
    expect(alertThresholdMinutes(10)).toBe(30);
    expect(alertThresholdMinutes(30)).toBe(60);
  });

  it('alerts when the current step runs past the threshold', () => {
    const r = findRunningLong({ clockIn: at(0), items: items([10, null, null]) }, typical, new Date(T0 + 75 * 60000));
    expect(r).toMatchObject({ itemId: 'i1', step: 'Step 2', elapsedMinutes: 65, typicalMinutes: 30 });
  });

  it('stays quiet within normal time', () => {
    expect(findRunningLong({ clockIn: at(0), items: items([10, null]) }, typical, new Date(T0 + 50 * 60000))).toBeNull();
  });

  it('times the first step from clock-in', () => {
    const r = findRunningLong({ clockIn: at(0), items: items([null, null]) }, typical, new Date(T0 + 31 * 60000));
    expect(r?.step).toBe('Step 1');
  });

  it('alerts once per step', () => {
    expect(findRunningLong({ clockIn: at(0), items: items([10, null], at(70)) }, typical, new Date(T0 + 120 * 60000))).toBeNull();
  });

  it('stays quiet without enough history, when skipping ahead, or when all done', () => {
    const thin = { 'Step 2': { medianMinutes: 30, samples: 2 } };
    expect(findRunningLong({ clockIn: at(0), items: items([10, null]) }, thin, new Date(T0 + 200 * 60000))).toBeNull();
    expect(findRunningLong({ clockIn: at(0), items: items([10, null, 50]) }, typical, new Date(T0 + 200 * 60000))).toBeNull();
    expect(findRunningLong({ clockIn: at(0), items: items([10, 20]) }, typical, new Date(T0 + 200 * 60000))).toBeNull();
  });

  it('builds typicals from a step-times report', () => {
    const report = buildStepTimesReport([crewJob('ana', { checks: [10, 30, 55] })]);
    expect(typicalByStepFromReport(report)['Step 2']).toEqual({ medianMinutes: 20, samples: 1 });
  });
});

describe('suggestEndTime', () => {
  it('adds the typical time and rounds up to 15 minutes', () => {
    expect(suggestEndTime('09:00', 110)).toBe('11:00');
    expect(suggestEndTime('09:00:00', 60)).toBe('10:00');
    expect(suggestEndTime('13:10', 20)).toBe('13:30');
  });
  it('gives up on bad input or past midnight', () => {
    expect(suggestEndTime('', 60)).toBeNull();
    expect(suggestEndTime('23:30', 60)).toBeNull();
    expect(suggestEndTime('09:00', 0)).toBeNull();
  });
});

describe('jobSpansFromTimeEntries', () => {
  it('spans earliest clock-in to latest clock-out, only once everyone is out', () => {
    const spans = jobSpansFromTimeEntries([
      { job_id: 'a', clock_in: at(10), clock_out: at(70) },
      { job_id: 'a', clock_in: at(0), clock_out: at(90) },
      { job_id: 'b', clock_in: at(0), clock_out: at(30) },
      { job_id: 'b', clock_in: at(5), clock_out: null },
    ]);
    expect(spans.a).toEqual({ clockIn: at(0), clockOut: at(90) });
    expect(spans.b).toEqual({ clockIn: at(0), clockOut: null });
  });
});

describe('buildCrewDigest', () => {
  it('leads with recognition and counts this week\'s issues without ranking anyone', () => {
    const month = [
      ...times(6, () => crewJob('ana', { minutes: 60 })),
      ...times(6, () => crewJob('ben', { minutes: 62 })),
      { ...crewJob('tap', { minutes: 60, tapped: true }), scheduledDate: '2026-11-18' },
      { ...crewJob('far', { minutes: 60, away: true }), scheduledDate: '2026-11-19' },
    ];
    const d = buildCrewDigest({
      monthJobs: month,
      weekStart: '2026-11-16',
      weekEnd: '2026-11-22',
      runningLongAlerts: 2,
      names: { ana: 'Ana', ben: 'Ben', tap: 'Tad', far: 'Fay' },
    });
    expect(d.recognitions.map((r) => r.name)).toEqual(expect.arrayContaining(['Ana', 'Ben']));
    expect(d.recognitions.some((r) => r.name === 'Tad')).toBe(false);
    expect(d.tappedThrough).toEqual([{ name: 'Tad', count: 1 }]);
    expect(d.awayChecks).toBe(3);
    expect(d.jobsWithChecklist).toBe(2);
    expect(d.runningLongAlerts).toBe(2);
    expect(d.isEmpty).toBe(false);
  });

  it('is empty when there is nothing to say', () => {
    expect(buildCrewDigest({ monthJobs: [], weekStart: '2026-11-16', weekEnd: '2026-11-22', runningLongAlerts: 0, names: {} }).isEmpty).toBe(true);
  });
});
