// Supplier Pricing API Route
// Server-side proxy to keep API keys secure
// GET /api/supplier-pricing?materials=JSON&tier=standard&zip=90210

import { NextRequest, NextResponse } from 'next/server';
import {
  getSupplierComparisons,
  calculateSavings,
  generateStalenessReport,
  type PricingConfig,
  type PriceLookupRequest,
} from '@/lib/supplier-pricing';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, tier, zipCode, preferredSupplier } = body as {
      items: PriceLookupRequest[];
      tier?: string;
      zipCode?: string;
      preferredSupplier?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    // Build config from environment variables
    const config: PricingConfig = {
      homeDepotApiKey: process.env.HOMEDEPOT_API_KEY,
      homeDepotAffiliateId: process.env.HOMEDEPOT_AFFILIATE_ID,
      lowesAffiliateId: process.env.LOWES_AFFILIATE_ID,
      enabledSuppliers: [],
      preferredSupplier: preferredSupplier as PricingConfig['preferredSupplier'],
      zipCode: zipCode || process.env.DEFAULT_ZIP_CODE,
    };

    // Enable suppliers based on available API keys
    if (process.env.HOMEDEPOT_API_KEY) {
      config.enabledSuppliers.push('home_depot');
    }
    // Future: if (process.env.LOWES_API_KEY) config.enabledSuppliers.push('lowes');

    // Fetch comparisons from all suppliers
    const comparisons = await getSupplierComparisons(items, config);
    const savings = calculateSavings(comparisons);
    const stalenessReport = generateStalenessReport(comparisons);

    return NextResponse.json({
      comparisons,
      savings,
      staleness: stalenessReport,
      enabledSuppliers: config.enabledSuppliers,
      hasLivePricing: config.enabledSuppliers.length > 0,
    });
  } catch (error) {
    console.error('Supplier pricing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier pricing' },
      { status: 500 }
    );
  }
}
