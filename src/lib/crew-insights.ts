/**
 * Crew insights: what the owner needs to know about how the crew works, built
 * from job checklists, time entries, photos and reviews.
 *
 * Design rule: this is for recognition and coaching, NOT a speed contest.
 *   - Nobody is ranked by speed. Workers are listed alphabetically.
 *   - Fast is not praised on its own. A pace well under typical is labelled
 *     "rushed" and is a reason to spot-check quality, never an award.
 *   - Recognition requires doing the job properly (checklist followed as the
 *     work happened, required steps done, photos, on site) at a pace in the
 *     normal range.
 * Workers never see this; it is an owner/admin view.
 */
import {
  buildStepTimesReport,
  isTappedThrough,
  median,
  type StepJobInput,
  type StepTimesReport,
} from './step-times';

// ── Job shape ───────────────────────────────────────────────────────

export interface CrewJob extends StepJobInput {
  scheduledDate: string;
  jobLat: number | null;
  jobLng: number | null;
  /** Latest clock-out on the job. */
  clockOut: string | null;
  /** Workers on the job: everyone with a time entry, else everyone who checked an item. */
  crew: string[];
  photoCount: number;
  reviewed: boolean;
}

// ── Location ────────────────────────────────────────────────────────

/** A check within this distance of the job address (plus GPS accuracy) is on site. */
export const ON_SITE_RADIUS_M = 250;
/** Fixes vaguer than this say nothing useful either way. */
export const MAX_USEFUL_ACCURACY_M = 500;

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type LocationStatus = 'on_site' | 'away' | 'unknown';

export function checkLocationStatus(
  item: { completedLat?: number | null; completedLng?: number | null; completedAccuracyM?: number | null },
  jobLat: number | null | undefined,
  jobLng: number | null | undefined
): LocationStatus {
  if (item.completedLat == null || item.completedLng == null || jobLat == null || jobLng == null) {
    return 'unknown';
  }
  const accuracy = item.completedAccuracyM ?? 0;
  if (accuracy > MAX_USEFUL_ACCURACY_M) return 'unknown';
  const d = distanceMeters(item.completedLat, item.completedLng, jobLat, jobLng);
  return d <= ON_SITE_RADIUS_M + accuracy ? 'on_site' : 'away';
}

// ── On-site time ────────────────────────────────────────────────────

export const MIN_JOB_MINUTES = 5;
export const MAX_JOB_MINUTES = 16 * 60;
/** A job type needs this many timed jobs before it has a "typical". */
export const MIN_JOBS_FOR_TYPICAL = 3;

/** Clock-in to clock-out, or null when either is missing or implausible. */
export function jobOnSiteMinutes(job: { clockIn: string | null; clockOut: string | null }): number | null {
  if (!job.clockIn || !job.clockOut) return null;
  const minutes = (Date.parse(job.clockOut) - Date.parse(job.clockIn)) / 60000;
  if (!Number.isFinite(minutes) || minutes < MIN_JOB_MINUTES || minutes > MAX_JOB_MINUTES) return null;
  return minutes;
}

export interface JobTypeTypical {
  jobType: string;
  medianMinutes: number;
  samples: number;
}

export function typicalMinutesByType(jobs: CrewJob[]): Record<string, JobTypeTypical> {
  const byType: Record<string, number[]> = {};
  for (const job of jobs) {
    const minutes = jobOnSiteMinutes(job);
    if (minutes === null) continue;
    (byType[job.jobType] ||= []).push(minutes);
  }
  const out: Record<string, JobTypeTypical> = {};
  for (const [jobType, list] of Object.entries(byType)) {
    out[jobType] = { jobType, medianMinutes: median(list), samples: list.length };
  }
  return out;
}

// ── Crew report ─────────────────────────────────────────────────────

export const RUSHED_RATIO = 0.6;
export const LONG_RATIO = 1.4;
export const MIN_JOBS_FOR_PACE = 3;
export const MIN_JOBS_FOR_RECOGNITION = 5;

export type PaceBand = 'rushed' | 'steady' | 'long' | 'not_enough_data';

export interface Recognition {
  key: 'steady_thorough' | 'by_the_book' | 'customer_favorite';
  title: string;
  reason: string;
}

export interface WorkerJobTypeStat {
  jobType: string;
  jobs: number;
  medianMinutes: number;
  teamMedianMinutes: number | null;
}

export interface WorkerCrewStats {
  workerId: string;
  jobs: number;
  byType: WorkerJobTypeStat[];
  /** Median of (job time / typical for that job type) over the worker's timed jobs. */
  paceRatio: number | null;
  pace: PaceBand;
  checklistJobs: number;
  tappedThroughJobs: number;
  /** Share of checklist jobs that were checked step by step (not tapped through). */
  disciplineRate: number | null;
  /** Share of checklist jobs with every required item checked. */
  requiredCompleteRate: number | null;
  photoRate: number | null;
  locatedChecks: number;
  awayChecks: number;
  reviews: number;
  recognitions: Recognition[];
  coaching: string[];
}

export interface LearnFrom {
  step: string;
  workerId: string;
  workerMinutes: number;
  teamMinutes: number;
}

export interface CrewReport {
  workers: WorkerCrewStats[];
  jobTypes: JobTypeTypical[];
  steps: StepTimesReport;
  learnFrom: LearnFrom[];
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function paceBand(ratio: number | null, timedJobs: number): PaceBand {
  if (ratio === null || timedJobs < MIN_JOBS_FOR_PACE) return 'not_enough_data';
  if (ratio < RUSHED_RATIO) return 'rushed';
  if (ratio > LONG_RATIO) return 'long';
  return 'steady';
}

export function buildCrewReport(jobs: CrewJob[]): CrewReport {
  const typical = typicalMinutesByType(jobs);
  const steps = buildStepTimesReport(jobs);

  const jobsByWorker: Record<string, CrewJob[]> = {};
  for (const job of jobs) {
    for (const w of job.crew) (jobsByWorker[w] ||= []).push(job);
  }

  const workers: WorkerCrewStats[] = Object.entries(jobsByWorker).map(([workerId, list]) => {
    // Time per job type, and pace against typical.
    const minutesByType: Record<string, number[]> = {};
    const ratios: number[] = [];
    for (const job of list) {
      const minutes = jobOnSiteMinutes(job);
      if (minutes === null) continue;
      (minutesByType[job.jobType] ||= []).push(minutes);
      const t = typical[job.jobType];
      if (t && t.samples >= MIN_JOBS_FOR_TYPICAL && t.medianMinutes > 0) ratios.push(minutes / t.medianMinutes);
    }
    const byType: WorkerJobTypeStat[] = Object.entries(minutesByType)
      .map(([jobType, mins]) => {
        const t = typical[jobType];
        return {
          jobType,
          jobs: mins.length,
          medianMinutes: median(mins),
          teamMedianMinutes: t && t.samples >= MIN_JOBS_FOR_TYPICAL ? t.medianMinutes : null,
        };
      })
      .sort((a, b) => a.jobType.localeCompare(b.jobType));
    const paceRatio = ratios.length ? median(ratios) : null;
    const pace = paceBand(paceRatio, ratios.length);

    // Checklist discipline. A job counts for this worker if they checked any of it.
    const checklistJobs = list.filter((j) => j.items.some((i) => i.completedBy === workerId));
    const tapped = checklistJobs.filter((j) => isTappedThrough(j)).length;
    const requiredDone = checklistJobs.filter((j) =>
      j.items.filter((i) => i.required !== false).every((i) => i.completed)
    ).length;

    let locatedChecks = 0;
    let awayChecks = 0;
    for (const job of list) {
      for (const item of job.items) {
        if (item.completedBy !== workerId || !item.completed) continue;
        const status = checkLocationStatus(item, job.jobLat, job.jobLng);
        if (status === 'unknown') continue;
        locatedChecks++;
        if (status === 'away') awayChecks++;
      }
    }

    const disciplineRate = checklistJobs.length ? 1 - tapped / checklistJobs.length : null;
    const requiredCompleteRate = checklistJobs.length ? requiredDone / checklistJobs.length : null;
    const photoRate = list.length ? list.filter((j) => j.photoCount > 0).length / list.length : null;
    const reviews = list.filter((j) => j.reviewed).length;
    const awayShare = locatedChecks ? awayChecks / locatedChecks : 0;

    const recognitions: Recognition[] = [];
    if (
      list.length >= MIN_JOBS_FOR_RECOGNITION &&
      pace === 'steady' &&
      (disciplineRate ?? 0) >= 0.9 &&
      (requiredCompleteRate ?? 0) >= 0.95 &&
      (photoRate ?? 0) >= 0.8 &&
      awayShare <= 0.05
    ) {
      recognitions.push({
        key: 'steady_thorough',
        title: 'Steady & thorough',
        reason: `Normal pace on ${list.length} jobs with the checklist followed step by step, required items done and photos taken.`,
      });
    }
    if (
      checklistJobs.length >= MIN_JOBS_FOR_RECOGNITION &&
      tapped === 0 &&
      requiredDone === checklistJobs.length &&
      locatedChecks > 0 &&
      awayChecks === 0 &&
      pace !== 'rushed'
    ) {
      recognitions.push({
        key: 'by_the_book',
        title: 'By the book',
        reason: `Every one of ${checklistJobs.length} checklists done as the work happened, on site, with nothing skipped.`,
      });
    }
    if (reviews >= 2 && pace !== 'rushed') {
      recognitions.push({
        key: 'customer_favorite',
        title: 'Customer favorite',
        reason: `${reviews} customers left a review after their job.`,
      });
    }

    const coaching: string[] = [];
    if (pace === 'rushed' && paceRatio !== null) {
      coaching.push(
        `Finishes jobs well under typical time (${pct(paceRatio)} of normal). Spot-check the quality before treating the speed as a win.`
      );
    }
    if (pace === 'long' && paceRatio !== null) {
      coaching.push(
        `Jobs run longer than typical (${pct(paceRatio)} of normal). Could be thoroughness, harder jobs or a training need — worth a conversation.`
      );
    }
    if (checklistJobs.length >= MIN_JOBS_FOR_PACE && tapped / checklistJobs.length > 0.2) {
      coaching.push(
        `Checked the whole checklist at once on ${tapped} of ${checklistJobs.length} jobs. Remind them to tap each step as it's finished.`
      );
    }
    if (awayChecks >= 2) {
      coaching.push(`${awayChecks} checklist items were checked away from the job site.`);
    }
    if (list.length >= MIN_JOBS_FOR_PACE && photoRate !== null && photoRate < 0.5) {
      coaching.push(`Completion photos on only ${pct(photoRate)} of jobs.`);
    }

    return {
      workerId,
      jobs: list.length,
      byType,
      paceRatio,
      pace,
      checklistJobs: checklistJobs.length,
      tappedThroughJobs: tapped,
      disciplineRate,
      requiredCompleteRate,
      photoRate,
      locatedChecks,
      awayChecks,
      reviews,
      recognitions,
      coaching,
    };
  });

  // Learn from: a recognised, steady worker who does a step noticeably quicker
  // than typical without cutting corners is the person to show others how.
  const steady = new Set(
    workers.filter((w) => w.recognitions.some((r) => r.key === 'steady_thorough')).map((w) => w.workerId)
  );
  const learnFrom: LearnFrom[] = [];
  for (const step of steps.steps) {
    if (step.teamMedianMinutes < 5) continue;
    for (const w of step.workers) {
      if (!steady.has(w.workerId) || w.samples < 3) continue;
      if (w.medianMinutes <= step.teamMedianMinutes * 0.8) {
        learnFrom.push({
          step: step.step,
          workerId: w.workerId,
          workerMinutes: w.medianMinutes,
          teamMinutes: step.teamMedianMinutes,
        });
      }
    }
  }

  return {
    workers,
    jobTypes: Object.values(typical).sort((a, b) => a.jobType.localeCompare(b.jobType)),
    steps,
    learnFrom,
  };
}

// ── Running long (live alert) ───────────────────────────────────────

/** A step needs this many timed samples before it can trigger an alert. */
export const MIN_SAMPLES_FOR_ALERT = 5;

export interface LiveChecklistItem {
  id: string;
  text: string;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
  overdueAlertedAt: string | null;
}

export interface RunningLong {
  itemId: string;
  step: string;
  startedAt: string;
  elapsedMinutes: number;
  typicalMinutes: number;
}

/** Alert when the step in progress has run past max(2x typical, typical + 20 min). */
export function alertThresholdMinutes(typicalMinutes: number): number {
  return Math.max(typicalMinutes * 2, typicalMinutes + 20);
}

/**
 * The step a worker is on is the first unchecked item. It started when the
 * item before it was checked (or at clock-in for the first item). Returns null
 * when there is nothing to say: no current step, no start time, the worker has
 * skipped ahead, the step has no reliable typical yet, it's within normal, or
 * it has already been alerted.
 */
export function findRunningLong(
  job: { clockIn: string | null; items: LiveChecklistItem[] },
  typicalByStep: Record<string, { medianMinutes: number; samples: number }>,
  now: Date
): RunningLong | null {
  const ordered = [...job.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const index = ordered.findIndex((i) => !i.completed);
  if (index === -1) return null;
  const current = ordered[index];
  if (ordered.slice(index + 1).some((i) => i.completed)) return null;
  if (current.overdueAlertedAt) return null;

  const startedAt = index === 0 ? job.clockIn : ordered[index - 1].completedAt;
  if (!startedAt) return null;

  const typ = typicalByStep[current.text];
  if (!typ || typ.samples < MIN_SAMPLES_FOR_ALERT || typ.medianMinutes <= 0) return null;

  const elapsedMinutes = (now.getTime() - Date.parse(startedAt)) / 60000;
  if (!(elapsedMinutes > alertThresholdMinutes(typ.medianMinutes))) return null;
  // Past the plausible range it's an app left open, not a job running long.
  if (elapsedMinutes > MAX_JOB_MINUTES) return null;

  return {
    itemId: current.id,
    step: current.text,
    startedAt,
    elapsedMinutes,
    typicalMinutes: typ.medianMinutes,
  };
}

/** Step text -> typical minutes and sample count, from a step-times report. */
export function typicalByStepFromReport(
  report: StepTimesReport
): Record<string, { medianMinutes: number; samples: number }> {
  const out: Record<string, { medianMinutes: number; samples: number }> = {};
  for (const s of report.steps) out[s.step] = { medianMinutes: s.teamMedianMinutes, samples: s.samples };
  return out;
}
