import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { optimizeRoute, optimizeMultiWorkerRoutes, RoutePoint, RouteOptions } from '@/lib/route-optimization';
import { geocodeAddress } from '@/lib/geocoding';

interface JobInput {
  id: string;
  address: string | null;
  city: string | null;
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

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobs, startLocation, settings, workerCount } = body as {
      jobs: JobInput[];
      startLocation?: { lat: number; lng: number; label?: string };
      settings?: { avgSpeedMph?: number; fuelCostPerMile?: number; roadFactor?: number; timeWindowEnabled?: boolean; startTimeMinutes?: number };
      workerCount?: number;
    };

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
        const fullAddress = [job.address, job.city].filter(Boolean).join(', ');
        if (!fullAddress) {
          geocodeErrors.push(`Job ${job.id}: No address provided`);
          continue;
        }

        const coords = await geocodeAddress(fullAddress);
        if (!coords) {
          geocodeErrors.push(`Job ${job.id}: Could not geocode "${fullAddress}"`);
          continue;
        }
        lat = coords.lat;
        lng = coords.lng;
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
