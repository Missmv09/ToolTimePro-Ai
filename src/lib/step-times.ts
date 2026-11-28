/**
 * Step Times: how long each job checklist step takes, per worker, against the
 * team's typical time.
 *
 * A step's duration is the gap between its check and the previous check on the
 * same job (the first step is measured from clock-in). That only means
 * something if workers check items as they finish them, so:
 *   - jobs where everything was checked within TAP_THROUGH_SECONDS are treated
 *     as tapped-through and left out of the averages (but counted, per worker);
 *   - a gap that is negative (checked out of order) or longer than
 *     MAX_STEP_MINUTES (left the app open overnight) is dropped.
 * "Typical" is the median, so one disastrous job does not move it much.
 */

export const TAP_THROUGH_SECONDS = 60;
export const MAX_STEP_MINUTES = 8 * 60;
/** A worker needs this many timed instances of a step before they are flagged. */
export const MIN_SAMPLES_TO_FLAG = 3;
/** Flag a worker whose typical time is at least this multiple of the team's. */
export const SLOW_RATIO = 1.5;
export const FAST_RATIO = 0.5;

export interface StepJobInput {
  jobId: string;
  jobType: string;
  /** Earliest clock-in on the job, if any. */
  clockIn: string | null;
  items: {
    text: string;
    sortOrder: number;
    completed: boolean;
    completedAt: string | null;
    completedBy: string | null;
    /** Defaults to required when absent. */
    required?: boolean;
    completedLat?: number | null;
    completedLng?: number | null;
    completedAccuracyM?: number | null;
  }[];
}

export interface StepSample {
  jobId: string;
  jobType: string;
  step: string;
  stepOrder: number;
  workerId: string;
  minutes: number;
}

export interface WorkerStepStat {
  workerId: string;
  samples: number;
  medianMinutes: number;
  /** worker median / team median; null when the team median is 0. */
  ratio: number | null;
  flag: 'slow' | 'fast' | null;
}

export interface StepStat {
  step: string;
  stepOrder: number;
  samples: number;
  teamMedianMinutes: number;
  workers: WorkerStepStat[];
}

export interface StepTimesReport {
  steps: StepStat[];
  jobsAnalyzed: number;
  /** Jobs left out because every check landed within TAP_THROUGH_SECONDS. */
  tappedThroughJobs: number;
  /** workerId -> number of tapped-through jobs they checked. */
  tappedThroughByWorker: Record<string, number>;
  /** Jobs done so far under normal time they were left out of "typical". */
  rushedJobsExcludedFromTypical: number;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : NaN);

/** True when 3+ items were all checked within TAP_THROUGH_SECONDS of each other. */
export function isTappedThrough(job: StepJobInput): boolean {
  const times = job.items
    .filter((i) => i.completed && i.completedAt)
    .map((i) => ms(i.completedAt))
    .filter((t) => !isNaN(t));
  if (times.length < 3) return false;
  return (Math.max(...times) - Math.min(...times)) / 1000 <= TAP_THROUGH_SECONDS;
}

/** Turn one job's checks into timed steps. */
export function jobStepSamples(job: StepJobInput): StepSample[] {
  const ordered = [...job.items].sort((a, b) => a.sortOrder - b.sortOrder);

  const samples: StepSample[] = [];
  // A step is timed only from the check immediately before it (or clock-in for
  // the first item). If the previous item was skipped, the gap would span two
  // steps, so it is not timed.
  let previous = ms(job.clockIn);
  ordered.forEach((item) => {
    const at = item.completed ? ms(item.completedAt) : NaN;
    if (isNaN(at)) {
      previous = NaN;
      return;
    }
    const start = previous;
    if (!isNaN(start) && item.completedBy) {
      const minutes = (at - start) / 60000;
      if (minutes >= 0 && minutes <= MAX_STEP_MINUTES) {
        samples.push({
          jobId: job.jobId,
          jobType: job.jobType,
          step: item.text,
          stepOrder: item.sortOrder,
          workerId: item.completedBy as string,
          minutes,
        });
      }
    }
    previous = at;
  });
  return samples;
}

/**
 * A job finished in under this share of the normal job time doesn't count
 * toward "typical": otherwise a rushed worker drags typical down and makes
 * everyone doing the job properly look slow.
 */
export const RUSHED_JOB_RATIO = 0.6;
/** Need this many timed jobs before deciding any of them were rushed. */
export const MIN_JOBS_FOR_RUSHED = 5;

/** Clock-in (or first check) to last check, in minutes. */
function checklistSpanMinutes(job: StepJobInput): number | null {
  const times = job.items
    .filter((i) => i.completed && i.completedAt)
    .map((i) => ms(i.completedAt))
    .filter((t) => !isNaN(t));
  if (times.length < 2) return null;
  const start = !isNaN(ms(job.clockIn)) ? ms(job.clockIn) : Math.min(...times);
  const minutes = (Math.max(...times) - start) / 60000;
  return minutes > 0 ? minutes : null;
}

/** Job ids done in well under the normal time, among the given (non-tapped) jobs. */
export function rushedJobIds(jobs: StepJobInput[]): Set<string> {
  const spans = jobs
    .map((j) => ({ id: j.jobId, span: checklistSpanMinutes(j) }))
    .filter((x): x is { id: string; span: number } => x.span !== null);
  if (spans.length < MIN_JOBS_FOR_RUSHED) return new Set();
  const normal = median(spans.map((x) => x.span));
  return new Set(spans.filter((x) => x.span < normal * RUSHED_JOB_RATIO).map((x) => x.id));
}

export function buildStepTimesReport(jobs: StepJobInput[]): StepTimesReport {
  const tappedThroughByWorker: Record<string, number> = {};
  let tappedThroughJobs = 0;
  const samples: StepSample[] = [];
  let jobsAnalyzed = 0;
  const timedJobs: StepJobInput[] = [];

  for (const job of jobs) {
    if (!job.items.some((i) => i.completed && i.completedAt)) continue;
    if (isTappedThrough(job)) {
      tappedThroughJobs++;
      const workers = new Set(job.items.map((i) => i.completedBy).filter(Boolean) as string[]);
      workers.forEach((w) => { tappedThroughByWorker[w] = (tappedThroughByWorker[w] || 0) + 1; });
      continue;
    }
    timedJobs.push(job);
  }
  const rushed = rushedJobIds(timedJobs);

  for (const job of timedJobs) {
    const jobSamples = jobStepSamples(job);
    if (jobSamples.length > 0) jobsAnalyzed++;
    samples.push(...jobSamples);
  }

  const byStep = new Map<string, StepSample[]>();
  for (const s of samples) {
    const list = byStep.get(s.step) || [];
    list.push(s);
    byStep.set(s.step, list);
  }

  const steps: StepStat[] = Array.from(byStep.entries()).map(([step, list]) => {
    const normalSamples = list.filter((s) => !rushed.has(s.jobId));
    const teamMedian = median((normalSamples.length ? normalSamples : list).map((s) => s.minutes));
    const byWorker = new Map<string, number[]>();
    for (const s of list) {
      const arr = byWorker.get(s.workerId) || [];
      arr.push(s.minutes);
      byWorker.set(s.workerId, arr);
    }
    const workers: WorkerStepStat[] = Array.from(byWorker.entries())
      .map(([workerId, minutes]) => {
        const workerMedian = median(minutes);
        const ratio = teamMedian > 0 ? workerMedian / teamMedian : null;
        let flag: WorkerStepStat['flag'] = null;
        if (ratio !== null && minutes.length >= MIN_SAMPLES_TO_FLAG) {
          if (ratio >= SLOW_RATIO) flag = 'slow';
          else if (ratio <= FAST_RATIO) flag = 'fast';
        }
        return { workerId, samples: minutes.length, medianMinutes: workerMedian, ratio, flag };
      })
      .sort((a, b) => b.medianMinutes - a.medianMinutes);
    return {
      step,
      stepOrder: Math.min(...list.map((s) => s.stepOrder)),
      samples: list.length,
      teamMedianMinutes: teamMedian,
      workers,
    };
  });

  steps.sort((a, b) => a.stepOrder - b.stepOrder);
  return {
    steps,
    jobsAnalyzed,
    tappedThroughJobs,
    tappedThroughByWorker,
    rushedJobsExcludedFromTypical: rushed.size,
  };
}

/** "45 min", "1h 20m", "<1 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '<1 min';
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
