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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    let query = sb
      .from('saved_routes')
      .select('*')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('route_date', date);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch saved routes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { name, route_date, worker_id, ordered_job_ids, route_data } = body;

    if (!route_date) {
      return NextResponse.json({ error: 'route_date is required' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('saved_routes')
      .insert({
        company_id: userData.company_id,
        name: name || `Route ${route_date}`,
        route_date,
        worker_id: worker_id || null,
        ordered_job_ids: ordered_job_ids || [],
        route_data: route_data || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save route' }, { status: 500 });
  }
}
