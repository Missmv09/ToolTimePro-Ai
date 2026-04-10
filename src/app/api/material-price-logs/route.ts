// Material Price Logging API
// POST /api/material-price-logs — Log what a contractor actually paid
// GET  /api/material-price-logs — Get price intelligence for a company

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePriceIntelligence } from '@/lib/supplier-pricing';
import { getMaterialById } from '@/lib/materials-database';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST — Log actual prices paid by a contractor
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    // Authenticate via Bearer token (not spoofable x-user-id header)
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', authUser.id)
      .single();

    if (!user?.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { items } = body as {
      items: Array<{
        materialId: string;
        trade: string;
        tier: string;
        estimatedPrice: number;
        actualPrice: number;
        storeName?: string;
        purchaseDate?: string;
        notes?: string;
      }>;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    const rows = items.map(item => ({
      company_id: user.company_id,
      material_id: item.materialId,
      trade: item.trade,
      tier: item.tier,
      estimated_price: item.estimatedPrice,
      actual_price: item.actualPrice,
      store_name: item.storeName || null,
      purchase_date: item.purchaseDate || null,
      notes: item.notes || null,
      created_by: authUser.id,
    }));

    const { error } = await supabase
      .from('material_price_logs')
      .insert(rows);

    if (error) {
      console.error('Price log insert error:', error);
      return NextResponse.json({ error: 'Failed to save price logs' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      logged: rows.length,
    });
  } catch (error) {
    console.error('Price log error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET — Get price intelligence report
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Server config error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const trade = searchParams.get('trade');
    const days = parseInt(searchParams.get('days') || '90');

    const since = new Date(Date.now() - days * 86400000).toISOString();

    let query = supabase
      .from('material_price_logs')
      .select('material_id, estimated_price, actual_price, created_at')
      .not('actual_price', 'is', null)
      .gte('created_at', since);

    if (trade) {
      query = query.eq('trade', trade);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Price log query error:', error);
      return NextResponse.json({ error: 'Failed to fetch price logs' }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        intelligence: null,
        message: 'No price data logged yet. Log actual prices after purchasing to build your price intelligence.',
        logCount: 0,
      });
    }

    // Build material name lookup
    const materialNames: Record<string, string> = {};
    const uniqueIds = [...new Set(logs.map(l => l.material_id))];
    for (const id of uniqueIds) {
      const mat = getMaterialById(id);
      if (mat) materialNames[id] = mat.name;
    }

    const intelligence = calculatePriceIntelligence(logs, materialNames);

    return NextResponse.json({
      intelligence,
      logCount: logs.length,
    });
  } catch (error) {
    console.error('Price intelligence error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
