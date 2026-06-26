/**
 * Skill-constrained worker assignment.
 *
 * Decides which worker should handle which job, respecting:
 *   - skill/service qualifications (a worker can only take jobs they're trained for)
 *   - certifications/licenses with expiry (an expired license disqualifies a worker)
 *   - workload balance (spread jobs so no one worker is overloaded)
 *   - geography (prefer the worker whose existing stops are nearest)
 *
 * Jobs that no qualified worker can cover are returned separately, with a
 * human-readable reason, so they're surfaced loudly instead of misassigned.
 *
 * This module is pure (no DB / network) so it can be unit-tested directly and
 * reused by the route optimizer.
 */

import { RoutePoint } from './route-optimization';

export interface ServiceMeta {
  id: string;
  /** Whether this service requires a non-expired certification to perform. */
  requiresLicense: boolean;
  /** Display name, used to build readable "uncoverable" reasons. */
  name?: string;
}

export interface WorkerCapability {
  serviceId: string;
  /**
   * Certification expiry date as `YYYY-MM-DD`. Only meaningful for services
   * where `requiresLicense` is true. `null`/omitted means no certification on
   * file — which makes the worker ineligible for licensed services.
   */
  certExpiry?: string | null;
}

export interface AssignableWorker {
  id: string;
  label?: string;
  capabilities: WorkerCapability[];
}

export interface SkilledJob extends RoutePoint {
  /**
   * The service this job requires. `null`/omitted means no special skill is
   * needed and any worker may be assigned.
   */
  requiredServiceId?: string | null;
}

export interface UnassignedJob {
  job: SkilledJob;
  reason: string;
}

export interface AssignmentResult {
  /** Map of worker id -> jobs assigned to that worker, in no particular order. */
  assignments: Map<string, SkilledJob[]>;
  /** Jobs that no eligible worker could cover, each with a readable reason. */
  unassigned: UnassignedJob[];
}

/**
 * Whether a worker is qualified to perform a given job on a given date.
 *
 * @param routeDate The date the job runs, as `YYYY-MM-DD`. Used to evaluate
 *                  certification expiry (a cert expiring before this date is
 *                  treated as expired).
 */
export function isWorkerEligibleForJob(
  worker: AssignableWorker,
  job: SkilledJob,
  services: Map<string, ServiceMeta>,
  routeDate: string
): boolean {
  const requiredId = job.requiredServiceId;
  // No requirement — anyone can do it.
  if (!requiredId) return true;

  const capability = worker.capabilities.find((c) => c.serviceId === requiredId);
  if (!capability) return false;

  const service = services.get(requiredId);
  if (service?.requiresLicense) {
    // Licensed service: must have a certification that hasn't expired.
    if (!capability.certExpiry) return false;
    // `YYYY-MM-DD` strings compare correctly lexicographically.
    if (capability.certExpiry < routeDate) return false;
  }

  return true;
}

/**
 * Build a readable reason explaining why no worker could take a job.
 * Distinguishes "nobody has the skill" from "the license is missing/expired".
 */
function buildUnassignedReason(
  job: SkilledJob,
  workers: AssignableWorker[],
  services: Map<string, ServiceMeta>,
  routeDate: string
): string {
  const requiredId = job.requiredServiceId;
  if (!requiredId) {
    // Should not happen (a job with no requirement is always assignable if any
    // worker exists), but handle defensively.
    return 'No workers available';
  }

  const service = services.get(requiredId);
  const serviceName = service?.name || 'this service';

  const haveSkill = workers.some((w) =>
    w.capabilities.some((c) => c.serviceId === requiredId)
  );

  if (!haveSkill) {
    return `No available worker has the "${serviceName}" skill`;
  }

  // Someone has the skill but all failed eligibility — must be a license issue.
  if (service?.requiresLicense) {
    return `"${serviceName}" requires a valid certification — no available worker has a current one`;
  }

  return `No available worker can cover "${serviceName}"`;
}

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Assign jobs to workers under skill constraints, balancing workload and
 * preferring geographic proximity.
 *
 * Strategy: most-constrained-first. Jobs with the fewest eligible workers are
 * placed first (the licensed/specialist jobs), so they aren't crowded out by
 * general work. Among a job's eligible workers we pick the least-loaded, and
 * break ties by proximity to that worker's existing stops.
 */
export function assignJobsToWorkers(
  jobs: SkilledJob[],
  workers: AssignableWorker[],
  services: Map<string, ServiceMeta>,
  routeDate: string
): AssignmentResult {
  const assignments = new Map<string, SkilledJob[]>();
  for (const w of workers) assignments.set(w.id, []);

  const unassigned: UnassignedJob[] = [];

  if (workers.length === 0) {
    return { assignments, unassigned: jobs.map((job) => ({ job, reason: 'No workers available' })) };
  }

  // Precompute eligible workers per job.
  const eligibilityByJob = new Map<string, AssignableWorker[]>();
  for (const job of jobs) {
    const eligible = workers.filter((w) => isWorkerEligibleForJob(w, job, services, routeDate));
    eligibilityByJob.set(job.id, eligible);
  }

  // Most-constrained-first ordering. Stable: ties keep original order.
  const ordered = [...jobs].sort(
    (a, b) =>
      (eligibilityByJob.get(a.id)!.length) - (eligibilityByJob.get(b.id)!.length)
  );

  for (const job of ordered) {
    const eligible = eligibilityByJob.get(job.id)!;
    if (eligible.length === 0) {
      unassigned.push({ job, reason: buildUnassignedReason(job, workers, services, routeDate) });
      continue;
    }

    // Pick the least-loaded eligible worker; tie-break by geographic proximity
    // to the jobs they already hold.
    let best: AssignableWorker | null = null;
    let bestLoad = Infinity;
    let bestProximity = Infinity;

    for (const w of eligible) {
      const current = assignments.get(w.id)!;
      const load = current.length;
      const proximity =
        current.length === 0
          ? 0
          : Math.min(...current.map((j) => distance(job, j)));

      if (load < bestLoad || (load === bestLoad && proximity < bestProximity)) {
        best = w;
        bestLoad = load;
        bestProximity = proximity;
      }
    }

    assignments.get(best!.id)!.push(job);
  }

  return { assignments, unassigned };
}
