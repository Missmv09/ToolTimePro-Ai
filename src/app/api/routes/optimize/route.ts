import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { optimizeRoute, optimizeMultiWorkerRoutes, RoutePoint, RouteOptions, OptimizedRoute } from '@/lib/route-optimization';
import { geocodeJobAddress, buildAddressQuery } from '@/lib/geocoding';
import {
  assignJobsToWorkers,
  AssignableWorker,
  WorkerCapability,
  ServiceMeta,
  SkilledJob,
} from '@/lib/worker-assignment';

interface JobInput {
  id: string;
  address: string | null;
  city: string | null;
  state?: string | null;
  zip?: string | null;
  requiredServiceId?: string | null;
  lat?: number | null;
  lng?: number | null;
  scheduledTime?: string | null;
  earliestArrival?: string | null;
  latestArrival?: string | null;
  label?: string;
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const sb = getSupabaseAdmin();
  const { data: { user } } = await sb.auth.getUser(token);
  return user;
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    isFinite(lat) && isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    // Reject (0, 0) — "Null Island" — almost certainly a DB default, not a real job
    !(lat === 0 && lng === 0)
  );
}

/**
 * Collapse several per-worker routes into one aggregate result shaped like a
 * single OptimizedRoute, so the existing map / savings / route-order UI keeps
 * working while multi-worker details are carried separately.
 */
function combineRoutes(routes: OptimizedRoute[]): OptimizedRoute {
  const sum = (key: keyof OptimizedRoute) =>
    routes.reduce((s, r) => s + (r[key] as number), 0);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const totalDistanceMiles = round1(sum('totalDistanceMiles'));
  const originalDistanceMiles = round1(sum('originalDistanceMiles'));
  const milesSaved = round1(sum('milesSaved'));

  return {
    orderedPoints: routes.flatMap((r) => r.orderedPoints),
    totalDistanceMiles,
    originalDistanceMiles,
    totalDriveTimeMinutes: Math.round(sum('totalDriveTimeMinutes')),
    originalDriveTimeMinutes: Math.round(sum('originalDriveTimeMinutes')),
    milesSaved,
    timeSavedMinutes: Math.round(sum('timeSavedMinutes')),
    fuelSaved: Math.round(sum('fuelSaved') * 100) / 100,
    percentImprovement: originalDistanceMiles > 0 ? Math.round((milesSaved / originalDistanceMiles) * 100) : 0,
    distanceMatrix: [],
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobs, startLocation, settings, workerCount, workers, routeDate } = body as {
      jobs: JobInput[];
      startLocation?: { lat: number; lng: number; label?: string };
      settings?: { avgSpeedMph?: number; fuelCostPerMile?: number; roadFactor?: number; timeWindowEnabled?: boolean; startTimeMinutes?: number };
      workerCount?: number;
      workers?: { id: string; label?: string }[];
      routeDate?: string;
    };

    // Map of job id -> required service, for skill-aware assignment.
    const requiredServiceByJob = new Map<string, string | null>();
    for (const j of jobs || []) requiredServiceByJob.set(j.id, j.requiredServiceId ?? null);

    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ error: 'No jobs provided' }, { status: 400 });
    }

    // Geocode any jobs that don't already have coordinates
    const points: RoutePoint[] = [];
    const geocodeErrors: string[] = [];

    for (const job of jobs) {
      let lat = job.lat;
      let lng = job.lng;

      // If coordinates exist, validate them
      if (lat != null && lng != null) {
        if (!isValidCoordinate(lat, lng)) {
          geocodeErrors.push(`Job ${job.id}: Invalid coordinates (${lat}, ${lng}) — falling back to geocoding`);
          lat = null;
          lng = null;
        }
      }

      if (lat == null || lng == null) {
        const fullAddress = buildAddressQuery(job.address, job.city, job.state, job.zip);
        if (!fullAddress) {
          geocodeErrors.push(`Job ${job.id}: No address provided`);
          continue;
        }

        const geocoded = await geocodeJobAddress({
          address: job.address,
          city: job.city,
          state: job.state,
          zip: job.zip,
        });
        if (!geocoded) {
          geocodeErrors.push(`Job ${job.id}: Could not geocode "${fullAddress}"`);
          continue;
        }
        lat = geocoded.coords.lat;
        lng = geocoded.coords.lng;
        if (geocoded.approximate) {
          geocodeErrors.push(
            `Job ${job.id}: Used approximate location "${geocoded.query}" (could not pinpoint "${fullAddress}")`
          );
        }
      }

      points.push({
        id: job.id,
        lat,
        lng,
        label: job.label || job.id,
        scheduledTime: job.scheduledTime,
        earliestArrival: job.earliestArrival,
        latestArrival: job.latestArrival,
      });
    }

    if (points.length <= 1) {
      return NextResponse.json({
        error: 'Not enough geocodable jobs to optimize (need at least 2)',
        geocodeErrors,
      }, { status: 400 });
    }

    // Validate start location if provided
    let validStartLocation = startLocation;
    if (startLocation && !isValidCoordinate(startLocation.lat, startLocation.lng)) {
      geocodeErrors.push('Office/start location has invalid coordinates — ignoring');
      validStartLocation = undefined;
    }

    // If a start location (office/depot) is provided, prepend it
    let fixedStartIndex: number | undefined;
    if (validStartLocation) {
      points.unshift({
        id: 'start',
        lat: validStartLocation.lat,
        lng: validStartLocation.lng,
        label: validStartLocation.label || 'Office',
      });
      fixedStartIndex = 0;
    }

    const routeOptions: RouteOptions | undefined = settings ? {
      avgSpeedMph: settings.avgSpeedMph,
      fuelCostPerMile: settings.fuelCostPerMile,
      roadFactor: settings.roadFactor,
      enforceTimeWindows: settings.timeWindowEnabled ?? false,
      startTimeMinutes: settings.startTimeMinutes,
    } : undefined;

    // Skill-aware multi-worker mode: assign jobs to specific selected workers,
    // honoring required skills and (for licensed services) certification expiry.
    if (workers && workers.length > 0) {
      const supabaseAdmin = getSupabaseAdmin();

      // Resolve caller's company to scope service/skill lookups.
      const { data: caller } = await supabaseAdmin
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      const companyId = caller?.company_id;

      // Which services require a license?
      const servicesMeta = new Map<string, ServiceMeta>();
      if (companyId) {
        const { data: svc } = await supabaseAdmin
          .from('services')
          .select('id, name, requires_license')
          .eq('company_id', companyId);
        for (const s of svc || []) {
          servicesMeta.set(s.id, { id: s.id, name: s.name, requiresLicense: s.requires_license });
        }
      }

      // Each selected worker's capabilities.
      const workerIds = workers.map((w) => w.id);
      const { data: skillRows } = await supabaseAdmin
        .from('worker_skills')
        .select('user_id, service_id, cert_expiry')
        .in('user_id', workerIds);

      const capsByWorker = new Map<string, WorkerCapability[]>();
      for (const w of workers) capsByWorker.set(w.id, []);
      for (const row of skillRows || []) {
        capsByWorker.get(row.user_id)?.push({ serviceId: row.service_id, certExpiry: row.cert_expiry });
      }
      const assignableWorkers: AssignableWorker[] = workers.map((w) => ({
        id: w.id,
        label: w.label,
        capabilities: capsByWorker.get(w.id) || [],
      }));

      // Job points (excluding the office start) tagged with their required service.
      const jobPoints = validStartLocation ? points.slice(1) : points;
      const skilledJobs: SkilledJob[] = jobPoints.map((p) => ({
        ...p,
        requiredServiceId: requiredServiceByJob.get(p.id) ?? null,
      }));

      const routeDateStr = routeDate || new Date().toISOString().split('T')[0];
      const { assignments, unassigned } = assignJobsToWorkers(
        skilledJobs,
        assignableWorkers,
        servicesMeta,
        routeDateStr
      );

      // Optimize each worker's assigned stops (starting from the office if given).
      const workerRoutes = assignableWorkers
        .map((w) => {
          const assigned = assignments.get(w.id) || [];
          if (assigned.length === 0) return null;
          let routePoints: RoutePoint[] = assigned;
          let fixedIdx: number | undefined;
          if (validStartLocation) {
            routePoints = [points[0], ...assigned];
            fixedIdx = 0;
          }
          const r = optimizeRoute(routePoints, fixedIdx, routeOptions);
          return { workerId: w.id, workerLabel: w.label || w.id, jobCount: assigned.length, ...r };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      const combined = combineRoutes(workerRoutes);
      const unassignedJobs = unassigned.map((u) => ({
        id: u.job.id,
        label: u.job.label || u.job.id,
        reason: u.reason,
      }));

      return NextResponse.json({
        ...combined,
        workerRoutes,
        unassignedJobs: unassignedJobs.length > 0 ? unassignedJobs : undefined,
        geocodeErrors: geocodeErrors.length > 0 ? geocodeErrors : undefined,
      });
    }

    // Multi-worker mode
    if (workerCount && workerCount > 1) {
      // Separate start point from job points so each worker starts from office
      const jobPoints = validStartLocation ? points.slice(1) : points;
      const multiResult = optimizeMultiWorkerRoutes(jobPoints, workerCount, routeOptions);

      // If office was provided, prepend it to each worker's route
      if (validStartLocation) {
        const startPoint = points[0];
        for (const route of multiResult.workerRoutes) {
          route.orderedPoints.unshift(startPoint);
        }
      }

      return NextResponse.json({
        ...multiResult,
        geocodeErrors: geocodeErrors.length > 0 ? geocodeErrors : undefined,
      });
    }

    const result = optimizeRoute(points, fixedStartIndex, routeOptions);

    return NextResponse.json({
      ...result,
      geocodeErrors: geocodeErrors.length > 0 ? geocodeErrors : undefined,
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    );
  }
}
