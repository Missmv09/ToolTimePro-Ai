import {
  isWorkerEligibleForJob,
  assignJobsToWorkers,
  AssignableWorker,
  SkilledJob,
  ServiceMeta,
} from '@/lib/worker-assignment';

const ROUTE_DATE = '2026-06-22';

function services(...metas: ServiceMeta[]): Map<string, ServiceMeta> {
  return new Map(metas.map((m) => [m.id, m]));
}

function job(id: string, lat: number, lng: number, requiredServiceId?: string | null): SkilledJob {
  return { id, lat, lng, requiredServiceId };
}

describe('isWorkerEligibleForJob', () => {
  const svc = services(
    { id: 'lawn', requiresLicense: false, name: 'Lawn Mowing' },
    { id: 'pest', requiresLicense: true, name: 'Pesticide Application' }
  );

  it('allows any worker when the job has no required service', () => {
    const worker: AssignableWorker = { id: 'w1', capabilities: [] };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, null), svc, ROUTE_DATE)).toBe(true);
  });

  it('rejects a worker who lacks the required skill', () => {
    const worker: AssignableWorker = { id: 'w1', capabilities: [{ serviceId: 'lawn' }] };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, 'pest'), svc, ROUTE_DATE)).toBe(false);
  });

  it('allows a worker with a non-licensed skill', () => {
    const worker: AssignableWorker = { id: 'w1', capabilities: [{ serviceId: 'lawn' }] };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, 'lawn'), svc, ROUTE_DATE)).toBe(true);
  });

  it('rejects a licensed job when the worker has the skill but no certification on file', () => {
    const worker: AssignableWorker = { id: 'w1', capabilities: [{ serviceId: 'pest' }] };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, 'pest'), svc, ROUTE_DATE)).toBe(false);
  });

  it('rejects a licensed job when the certification is expired', () => {
    const worker: AssignableWorker = {
      id: 'w1',
      capabilities: [{ serviceId: 'pest', certExpiry: '2026-01-10' }],
    };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, 'pest'), svc, ROUTE_DATE)).toBe(false);
  });

  it('allows a licensed job when the certification is still valid', () => {
    const worker: AssignableWorker = {
      id: 'w1',
      capabilities: [{ serviceId: 'pest', certExpiry: '2026-09-01' }],
    };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, 'pest'), svc, ROUTE_DATE)).toBe(true);
  });

  it('treats a certification expiring on the route date as still valid', () => {
    const worker: AssignableWorker = {
      id: 'w1',
      capabilities: [{ serviceId: 'pest', certExpiry: ROUTE_DATE }],
    };
    expect(isWorkerEligibleForJob(worker, job('j1', 0, 0, 'pest'), svc, ROUTE_DATE)).toBe(true);
  });
});

describe('assignJobsToWorkers', () => {
  const svc = services(
    { id: 'lawn', requiresLicense: false, name: 'Lawn Mowing' },
    { id: 'pest', requiresLicense: true, name: 'Pesticide Application' }
  );

  it('routes a licensed job only to the qualified, non-expired worker', () => {
    const maria: AssignableWorker = {
      id: 'maria',
      capabilities: [{ serviceId: 'lawn' }, { serviceId: 'pest', certExpiry: '2026-09-01' }],
    };
    const bob: AssignableWorker = {
      id: 'bob',
      capabilities: [{ serviceId: 'lawn' }, { serviceId: 'pest', certExpiry: '2026-01-10' }], // expired
    };

    const jobs = [job('pest1', 0, 0, 'pest'), job('lawn1', 1, 1, 'lawn')];
    const { assignments, unassigned } = assignJobsToWorkers(jobs, [maria, bob], svc, ROUTE_DATE);

    expect(unassigned).toHaveLength(0);
    // The pesticide job must go to Maria (Bob's cert is expired).
    expect(assignments.get('maria')!.map((j) => j.id)).toContain('pest1');
    expect(assignments.get('bob')!.map((j) => j.id)).not.toContain('pest1');
  });

  it('flags a job no worker can cover, with a skill reason', () => {
    const bob: AssignableWorker = { id: 'bob', capabilities: [{ serviceId: 'lawn' }] };
    const jobs = [job('pest1', 0, 0, 'pest')];

    const { unassigned } = assignJobsToWorkers(jobs, [bob], svc, ROUTE_DATE);

    expect(unassigned).toHaveLength(1);
    expect(unassigned[0].reason).toMatch(/Pesticide Application/);
    expect(unassigned[0].reason).toMatch(/skill/i);
  });

  it('flags a license reason when workers have the skill but all certs are expired', () => {
    const bob: AssignableWorker = {
      id: 'bob',
      capabilities: [{ serviceId: 'pest', certExpiry: '2026-01-10' }],
    };
    const jobs = [job('pest1', 0, 0, 'pest')];

    const { unassigned } = assignJobsToWorkers(jobs, [bob], svc, ROUTE_DATE);

    expect(unassigned).toHaveLength(1);
    expect(unassigned[0].reason).toMatch(/certification|license/i);
  });

  it('balances unconstrained jobs across workers', () => {
    const a: AssignableWorker = { id: 'a', capabilities: [{ serviceId: 'lawn' }] };
    const b: AssignableWorker = { id: 'b', capabilities: [{ serviceId: 'lawn' }] };
    const jobs = [
      job('j1', 0, 0, 'lawn'),
      job('j2', 0, 0, 'lawn'),
      job('j3', 0, 0, 'lawn'),
      job('j4', 0, 0, 'lawn'),
    ];

    const { assignments, unassigned } = assignJobsToWorkers(jobs, [a, b], svc, ROUTE_DATE);

    expect(unassigned).toHaveLength(0);
    expect(assignments.get('a')!.length).toBe(2);
    expect(assignments.get('b')!.length).toBe(2);
  });

  it('returns all jobs as unassigned when there are no workers', () => {
    const jobs = [job('j1', 0, 0, 'lawn'), job('j2', 0, 0, null)];
    const { assignments, unassigned } = assignJobsToWorkers(jobs, [], svc, ROUTE_DATE);

    expect(assignments.size).toBe(0);
    expect(unassigned).toHaveLength(2);
  });

  it('prefers the geographically nearer eligible worker on ties', () => {
    // Both qualified and equally loaded after their first job; the second
    // lawn job near worker B's stop should go to B.
    const a: AssignableWorker = { id: 'a', capabilities: [{ serviceId: 'lawn' }] };
    const b: AssignableWorker = { id: 'b', capabilities: [{ serviceId: 'lawn' }] };
    const jobs = [
      job('far', 0, 0, 'lawn'),
      job('nearB', 10, 10, 'lawn'),
      job('alsoNearB', 10.01, 10.01, 'lawn'),
    ];

    const { assignments } = assignJobsToWorkers(jobs, [a, b], svc, ROUTE_DATE);

    // Whichever worker took 'nearB' should also get 'alsoNearB' (proximity tie-break),
    // and the two near jobs should land with the same worker.
    const aIds = assignments.get('a')!.map((j) => j.id);
    const bIds = assignments.get('b')!.map((j) => j.id);
    const ownerOfNearB = aIds.includes('nearB') ? aIds : bIds;
    expect(ownerOfNearB).toContain('alsoNearB');
  });
});
