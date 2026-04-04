import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

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

const DEFAULTS = {
  avg_speed_mph: 25,
  fuel_cost_per_mile: 0.40,
  road_factor: 1.35,
  office_lat: null,
  office_lng: null,
  office_address: null,
  time_window_enabled: false,
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();
    const { data: userData } = await sb
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    const { data } = await sb
      .from('route_settings')
      .select('*')
      .eq('company_id', userData.company_id)
      .single();

    return NextResponse.json(data || { company_id: userData.company_id, ...DEFAULTS });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sb = getSupabaseAdmin();
    const { data: userData } = await sb
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    const body = await request.json();
    const settingsData = {
      company_id: userData.company_id,
      avg_speed_mph: body.avg_speed_mph ?? DEFAULTS.avg_speed_mph,
      fuel_cost_per_mile: body.fuel_cost_per_mile ?? DEFAULTS.fuel_cost_per_mile,
      road_factor: body.road_factor ?? DEFAULTS.road_factor,
      office_lat: body.office_lat ?? null,
      office_lng: body.office_lng ?? null,
      office_address: body.office_address ?? null,
      time_window_enabled: body.time_window_enabled ?? false,
    };

    const { data, error } = await sb
      .from('route_settings')
      .upsert(settingsData, { onConflict: 'company_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
