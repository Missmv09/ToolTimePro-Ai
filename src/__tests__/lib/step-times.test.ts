import {
  buildStepTimesReport,
  jobStepSamples,
  isTappedThrough,
  median,
  formatMinutes,
  type StepJobInput,
} from '@/lib/step-times';

const T0 = Date.parse('2026-11-23T16:00:00Z');
const at = (min: number) => new Date(T0 + min * 60000).toISOString();

/** A job whose items are checked at the given minute offsets (null = unchecked). */
function job(id: string, worker: string, checks: (number | null)[], clockIn: number | null = 0, jobType = 'General'): StepJobInput {
  return {
    jobId: id,
    jobType,
    clockIn: clockIn === null ? null : at(clockIn),
    items: checks.map((m, i) => ({
      text: `Step ${i + 1}`,
      sortOrder: i,
      completed: m !== null,
      completedAt: m === null ? null : at(m),
      completedBy: m === null ? null : worker,
    })),
  };
}

describe('jobStepSamples', () => {
  it('times the first step from clock-in and each later step from the previous check', () => {
    const samples = jobStepSamples(job('j1', 'w1', [5, 25, 30]));
    expect(samples.map((s) => [s.step, s.minutes])).toEqual([
      ['Step 1', 5], ['Step 2', 20], ['Step 3', 5],
    ]);
    expect(samples.every((s) => s.workerId === 'w1')).toBe(true);
  });

  it('does not time the first step without a clock-in', () => {
    const samples = jobStepSamples(job('j1', 'w1', [5, 25], null));
    expect(samples.map((s) => s.step)).toEqual(['Step 2']);
  });

  it('does not time a step whose previous item was skipped (gap would span two steps)', () => {
    const samples = jobStepSamples(job('j1', 'w1', [5, null, 40, 50]));
    expect(samples.map((s) => s.step)).toEqual(['Step 1', 'Step 4']);
  });

  it('drops out-of-order checks and implausibly long gaps', () => {
    expect(jobStepSamples(job('j1', 'w1', [30, 10])).map((s) => s.step)).toEqual(['Step 1']);
    expect(jobStepSamples(job('j1', 'w1', [5, 5 + 9 * 60])).map((s) => s.step)).toEqual(['Step 1']);
  });
});

describe('isTappedThrough', () => {
  it('flags 3+ checks all within a minute', () => {
    expect(isTappedThrough(job('j', 'w', [90, 90.2, 90.5]))).toBe(true);
  });
  it('does not flag spread-out checks or fewer than 3 checks', () => {
    expect(isTappedThrough(job('j', 'w', [10, 30, 45]))).toBe(false);
    expect(isTappedThrough(job('j', 'w', [10, 10.1]))).toBe(false);
  });
});

describe('buildStepTimesReport', () => {
  it('compares each worker against the team median and flags only with enough samples', () => {
    const jobs = [
      // Ana: step 2 takes 20 min, three times
      job('a1', 'ana', [5, 25]), job('a2', 'ana', [5, 25]), job('a3', 'ana', [5, 25]),
      // Ben: step 2 takes 60 min, three times
      job('b1', 'ben', [5, 65]), job('b2', 'ben', [5, 65]), job('b3', 'ben', [5, 65]),
      // Cy: step 2 takes 20 min once — not enough to flag anything
      job('c1', 'cy', [5, 25]),
    ];
    const report = buildStepTimesReport(jobs);
    expect(report.jobsAnalyzed).toBe(7);

    const step2 = report.steps.find((s) => s.step === 'Step 2')!;
    expect(step2.teamMedianMinutes).toBe(20);
    const ben = step2.workers.find((w) => w.workerId === 'ben')!;
    expect(ben).toMatchObject({ samples: 3, medianMinutes: 60, ratio: 3, flag: 'slow' });
    expect(step2.workers.find((w) => w.workerId === 'ana')!.flag).toBeNull();
    expect(step2.workers.find((w) => w.workerId === 'cy')!.flag).toBeNull();
    expect(report.steps.map((s) => s.step)).toEqual(['Step 1', 'Step 2']);
  });

  it('flags a worker who is much faster than typical', () => {
    const jobs = [
      job('a1', 'ana', [5, 45]), job('a2', 'ana', [5, 45]), job('a3', 'ana', [5, 45]),
      job('a4', 'ana', [5, 45]),
      job('b1', 'ben', [5, 10]), job('b2', 'ben', [5, 10]), job('b3', 'ben', [5, 10]),
    ];
    const step2 = buildStepTimesReport(jobs).steps.find((s) => s.step === 'Step 2')!;
    expect(step2.workers.find((w) => w.workerId === 'ben')!.flag).toBe('fast');
  });

  it('leaves tapped-through jobs out of the times and counts them per worker', () => {
    const report = buildStepTimesReport([
      job('ok', 'ana', [5, 25, 30]),
      job('tap', 'ben', [120, 120.1, 120.2]),
    ]);
    expect(report.tappedThroughJobs).toBe(1);
    expect(report.tappedThroughByWorker).toEqual({ ben: 1 });
    expect(report.jobsAnalyzed).toBe(1);
    expect(report.steps.every((s) => s.workers.every((w) => w.workerId === 'ana'))).toBe(true);
  });

  it('ignores jobs with nothing checked', () => {
    expect(buildStepTimesReport([job('x', 'ana', [null, null])])).toEqual({
      steps: [], jobsAnalyzed: 0, tappedThroughJobs: 0, tappedThroughByWorker: {},
    });
  });
});

describe('helpers', () => {
  it('median', () => {
    expect(median([])).toBe(0);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 10])).toBe(2.5);
  });
  it('formatMinutes', () => {
    expect(formatMinutes(0.4)).toBe('<1 min');
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(80)).toBe('1h 20m');
  });
});
