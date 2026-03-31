import { NextRequest, NextResponse } from 'next/server';
import { optimizeRoute, RoutePoint } from '@/lib/route-optimization';
import { geocodeAddress } from '@/lib/geocoding';

interface JobInput {
  id: string;
  address: string | null;
  city: string | null;
  lat?: number | null;
  lng?: number | null;
  scheduledTime?: string | null;
  label?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobs, startLocation } = body as {
      jobs: JobInput[];
      startLocation?: { lat: number; lng: number; label?: string };
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
      });
    }

    if (points.length <= 1) {
      return NextResponse.json({
        error: 'Not enough geocodable jobs to optimize (need at least 2)',
        geocodeErrors,
      }, { status: 400 });
    }

    // If a start location (office/depot) is provided, prepend it
    let fixedStartIndex: number | undefined;
    if (startLocation) {
      points.unshift({
        id: 'start',
        lat: startLocation.lat,
        lng: startLocation.lng,
        label: startLocation.label || 'Office',
      });
      fixedStartIndex = 0;
    }

    const result = optimizeRoute(points, fixedStartIndex);

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
