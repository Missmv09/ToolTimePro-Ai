// Material Markup API Route
// Returns markup calculations for estimates and company-specific settings
// POST /api/supplier-pricing — calculate markup for an estimate
// GET /api/supplier-pricing — get company markup settings

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateMarkup,
  DEFAULT_TRADE_MARKUPS,
  type MarkupSettings,
} from '@/lib/supplier-pricing';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// POST — Calculate markup for an estimate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialTotal, laborEstimate, trade, companyId } = body as {
      materialTotal: number;
      laborEstimate: number;
      trade: string;
      companyId?: string;
    };

    if (materialTotal === undefined || laborEstimate === undefined || !trade) {
      return NextResponse.json(
        { error: 'materialTotal, laborEstimate, and trade are required' },
        { status: 400 }
      );
    }

    // Try to load company-specific markup settings
    let companyMarkup: MarkupSettings | null = null;

    if (companyId) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        // Try trade-specific first, fall back to _default
        const { data: tradeMarkup } = await supabase
          .from('company_markup_settings')
          .select('trade, material_markup_percent, labor_markup_percent')
          .eq('company_id', companyId)
          .eq('trade', trade)
          .single();

        if (tradeMarkup) {
          companyMarkup = {
            trade: tradeMarkup.trade,
            materialMarkupPercent: tradeMarkup.material_markup_percent,
            laborMarkupPercent: tradeMarkup.labor_markup_percent,
          };
        } else {
          const { data: defaultMarkup } = await supabase
            .from('company_markup_settings')
            .select('trade, material_markup_percent, labor_markup_percent')
            .eq('company_id', companyId)
            .eq('trade', '_default')
            .single();

          if (defaultMarkup) {
            companyMarkup = {
              trade: defaultMarkup.trade,
              materialMarkupPercent: defaultMarkup.material_markup_percent,
              laborMarkupPercent: defaultMarkup.labor_markup_percent,
            };
          }
        }
      }
    }

    const result = calculateMarkup(materialTotal, laborEstimate, trade, companyMarkup);

    return NextResponse.json({
      markup: result,
      source: companyMarkup ? 'company' : 'default',
      defaults: DEFAULT_TRADE_MARKUPS[trade] || DEFAULT_TRADE_MARKUPS._default,
    });
  } catch (error) {
    console.error('Markup calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate markup' },
      { status: 500 }
    );
  }
}

// GET — Fetch company markup settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      // Return defaults
      return NextResponse.json({ settings: [], defaults: DEFAULT_TRADE_MARKUPS });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ settings: [], defaults: DEFAULT_TRADE_MARKUPS });
    }

    const { data: settings } = await supabase
      .from('company_markup_settings')
      .select('*')
      .eq('company_id', companyId)
      .order('trade');

    return NextResponse.json({
      settings: settings || [],
      defaults: DEFAULT_TRADE_MARKUPS,
    });
  } catch (error) {
    console.error('Markup settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markup settings' },
      { status: 500 }
    );
  }
}
