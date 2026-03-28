// Material Pricing Engine
// Handles contractor markup/margin calculations and price staleness tracking
// Static prices from materials-database.ts with company-level markup configuration

import type { PriceTier } from './materials-database';
import type { TradeType } from './materials-database';

// ============================================================
// TYPES
// ============================================================

export type SupplierKey = 'home_depot' | 'lowes' | 'sherwin_williams' | 'ferguson' | 'grainger' | 'static';

export interface SupplierProduct {
  supplierId: string;
  supplierKey: SupplierKey;
  supplierName: string;
  productName: string;
  brand: string;
  price: number;
  unit: string;
  inStock: boolean;
  storeLocation?: string;
  productUrl?: string;
  imageUrl?: string;
  lastUpdated: string;
  isLive: boolean;
  salePrice?: number;
  saleLabel?: string;
}

export interface SupplierComparison {
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  tier: PriceTier;
  suppliers: SupplierProduct[];
  lowestSupplier: SupplierKey;
  lowestPrice: number;
  selectedSupplier: SupplierKey;
}

export const SUPPLIER_INFO: Record<SupplierKey, { name: string; logo: string; color: string }> = {
  home_depot: { name: 'Home Depot', logo: '🟧', color: 'orange' },
  lowes: { name: "Lowe's", logo: '🟦', color: 'blue' },
  sherwin_williams: { name: 'Sherwin-Williams', logo: '🔵', color: 'indigo' },
  ferguson: { name: 'Ferguson', logo: '⬜', color: 'gray' },
  grainger: { name: 'Grainger', logo: '🟥', color: 'red' },
  static: { name: 'Estimated', logo: '📊', color: 'gray' },
};

// ============================================================
// MARKUP ENGINE
// ============================================================

export interface MarkupSettings {
  trade: string;          // trade name or '_default'
  materialMarkupPercent: number;
  laborMarkupPercent: number;
}

export interface MarkupResult {
  // Contractor's cost (what they pay at the store)
  materialCost: number;
  laborCost: number;
  totalCost: number;
  // Customer price (with markup applied)
  materialMarkupPercent: number;
  laborMarkupPercent: number;
  customerMaterialTotal: number;
  customerLaborTotal: number;
  customerGrandTotal: number;
  // Profit
  materialProfit: number;
  laborProfit: number;
  totalProfit: number;
  profitMarginPercent: number;
}

/** Default markup percentages by trade (industry standard ranges) */
export const DEFAULT_TRADE_MARKUPS: Record<string, { material: number; labor: number }> = {
  _default:          { material: 20, labor: 0 },
  painting:          { material: 15, labor: 0 },
  plumbing:          { material: 25, labor: 0 },
  electrical:        { material: 25, labor: 0 },
  landscaping:       { material: 20, labor: 0 },
  handyman:          { material: 15, labor: 0 },
  flooring:          { material: 20, labor: 0 },
  lawn_care:         { material: 15, labor: 0 },
  pool_service:      { material: 20, labor: 0 },
  hvac:              { material: 30, labor: 0 },
  roofing:           { material: 25, labor: 0 },
  fencing:           { material: 20, labor: 0 },
  concrete:          { material: 20, labor: 0 },
  carpentry:         { material: 20, labor: 0 },
  irrigation:        { material: 25, labor: 0 },
  pressure_washing:  { material: 15, labor: 0 },
  insulation:        { material: 25, labor: 0 },
  siding:            { material: 25, labor: 0 },
  drywall:           { material: 20, labor: 0 },
  tree_service:      { material: 15, labor: 0 },
  solar:             { material: 20, labor: 0 },
  garage_door:       { material: 25, labor: 0 },
};

/**
 * Calculate customer-facing prices with markup applied
 */
export function calculateMarkup(
  materialTotal: number,
  laborEstimate: number,
  trade: string,
  companyMarkup?: MarkupSettings | null,
): MarkupResult {
  // Use company-specific markup if set, otherwise use trade defaults
  const defaults = DEFAULT_TRADE_MARKUPS[trade] || DEFAULT_TRADE_MARKUPS._default;
  const materialMarkup = companyMarkup?.materialMarkupPercent ?? defaults.material;
  const laborMarkup = companyMarkup?.laborMarkupPercent ?? defaults.labor;

  const customerMaterialTotal = materialTotal * (1 + materialMarkup / 100);
  const customerLaborTotal = laborEstimate * (1 + laborMarkup / 100);
  const customerGrandTotal = customerMaterialTotal + customerLaborTotal;

  const materialProfit = customerMaterialTotal - materialTotal;
  const laborProfit = customerLaborTotal - laborEstimate;
  const totalProfit = materialProfit + laborProfit;
  const totalCost = materialTotal + laborEstimate;
  const profitMarginPercent = customerGrandTotal > 0 ? (totalProfit / customerGrandTotal) * 100 : 0;

  return {
    materialCost: materialTotal,
    laborCost: laborEstimate,
    totalCost,
    materialMarkupPercent: materialMarkup,
    laborMarkupPercent: laborMarkup,
    customerMaterialTotal: Math.round(customerMaterialTotal * 100) / 100,
    customerLaborTotal: Math.round(customerLaborTotal * 100) / 100,
    customerGrandTotal: Math.round(customerGrandTotal * 100) / 100,
    materialProfit: Math.round(materialProfit * 100) / 100,
    laborProfit: Math.round(laborProfit * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
  };
}

// ============================================================
// PHASE 2: TIERED VOLATILITY — PER-CATEGORY STALENESS
// ============================================================

/** Price data was set to 2026-01-01 as the base date */
const PRICE_BASE_DATE = '2026-01-01T00:00:00Z';

export type VolatilityTier = 'high' | 'medium' | 'low';

export interface CategoryVolatility {
  category: string;
  tier: VolatilityTier;
  staleDays: number;     // Days before flagging as stale
  warningDays: number;   // Days before stale to start warning
  reason: string;
}

/** Per-category volatility tiers — commodity-driven materials expire faster */
export const MATERIAL_VOLATILITY: Record<string, CategoryVolatility> = {
  // HIGH volatility (90 days) — commodity prices, metals, lumber
  lumber:     { category: 'Lumber & Plywood', tier: 'high', staleDays: 90, warningDays: 14, reason: 'Commodity lumber prices fluctuate with market conditions' },
  copper:     { category: 'Copper Wire & Pipe', tier: 'high', staleDays: 90, warningDays: 14, reason: 'Copper is a commodity metal with volatile pricing' },
  steel:      { category: 'Steel & Rebar', tier: 'high', staleDays: 90, warningDays: 14, reason: 'Steel prices tied to global commodity markets' },

  // MEDIUM volatility (180 days) — manufactured goods with supply chain exposure
  concrete:   { category: 'Concrete & Masonry', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Cement prices shift with fuel and material costs' },
  roofing:    { category: 'Roofing Materials', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Shingle prices driven by asphalt costs' },
  insulation: { category: 'Insulation', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Fiberglass and foam prices vary with energy costs' },
  siding:     { category: 'Siding & Exterior', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Vinyl and fiber cement prices shift seasonally' },
  hvac:       { category: 'HVAC Parts', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Refrigerant and equipment pricing varies' },
  solar:      { category: 'Solar Equipment', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Panel and inverter prices drop steadily' },
  drywall:    { category: 'Drywall', tier: 'medium', staleDays: 180, warningDays: 30, reason: 'Gypsum prices tied to construction demand' },

  // LOW volatility (365 days) — stable retail products
  paint:      { category: 'Paint & Coatings', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Retail paint pricing is relatively stable year-over-year' },
  fixtures:   { category: 'Plumbing Fixtures', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Fixtures have stable retail pricing' },
  electrical: { category: 'Electrical Devices', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Outlets, switches, and devices have stable pricing' },
  flooring:   { category: 'Flooring', tier: 'low', staleDays: 365, warningDays: 30, reason: 'LVP, tile, and laminate pricing changes slowly' },
  fencing:    { category: 'Fencing', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Vinyl and pre-built fence pricing is stable' },
  irrigation: { category: 'Irrigation', tier: 'low', staleDays: 365, warningDays: 30, reason: 'PVC pipe and sprinkler heads have stable pricing' },
  landscaping:{ category: 'Landscaping', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Mulch, sod, and pavers have stable seasonal pricing' },
  tools:      { category: 'Tools & Supplies', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Hand tools and supplies rarely change price' },
  garage:     { category: 'Garage Doors', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Garage door and opener pricing is stable' },
  chemicals:  { category: 'Chemicals & Cleaners', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Pool chemicals and pressure wash solutions have stable pricing' },
  tree:       { category: 'Tree Service', tier: 'low', staleDays: 365, warningDays: 30, reason: 'Equipment rental and consumables are stable' },
};

/** Map trade types to their volatility categories */
export const TRADE_VOLATILITY_MAP: Record<string, string[]> = {
  painting:         ['paint', 'tools'],
  plumbing:         ['fixtures', 'copper'],
  electrical:       ['electrical', 'copper'],
  landscaping:      ['landscaping'],
  handyman:         ['drywall', 'tools'],
  flooring:         ['flooring'],
  lawn_care:        ['chemicals', 'landscaping'],
  pool_service:     ['chemicals'],
  hvac:             ['hvac', 'copper'],
  roofing:          ['roofing'],
  fencing:          ['fencing', 'lumber', 'concrete'],
  concrete:         ['concrete', 'steel'],
  carpentry:        ['lumber'],
  irrigation:       ['irrigation'],
  pressure_washing: ['chemicals', 'tools'],
  insulation:       ['insulation'],
  siding:           ['siding'],
  drywall:          ['drywall'],
  tree_service:     ['tree'],
  solar:            ['solar', 'electrical'],
  garage_door:      ['garage'],
};

/** Trade display names for reporting */
const TRADE_NAMES: Record<string, string> = {
  painting: 'Painting', plumbing: 'Plumbing', electrical: 'Electrical',
  landscaping: 'Landscaping', handyman: 'Handyman', flooring: 'Flooring',
  lawn_care: 'Lawn Care', pool_service: 'Pool Service', hvac: 'HVAC',
  roofing: 'Roofing', fencing: 'Fencing', concrete: 'Concrete & Masonry',
  carpentry: 'Carpentry', irrigation: 'Irrigation', pressure_washing: 'Pressure Washing',
  insulation: 'Insulation', siding: 'Siding', drywall: 'Drywall',
  tree_service: 'Tree Service', solar: 'Solar', garage_door: 'Garage Door',
};

export interface CategoryStalenessStatus {
  category: string;
  volatilityTier: VolatilityTier;
  staleDays: number;
  daysSinceUpdate: number;
  daysUntilStale: number;
  isStale: boolean;
  isWarning: boolean;   // Within warning window
  reason: string;
}

export interface TradeStalenessStatus {
  trade: string;
  tradeName: string;
  materialCount: number;
  categories: CategoryStalenessStatus[];
  worstCategory: CategoryStalenessStatus | null; // Most urgent
  overallStatus: 'fresh' | 'warning' | 'stale';
}

export interface PriceStalenessReport {
  totalTrades: number;
  totalMaterials: number;
  staleTradeCount: number;
  warningTradeCount: number;
  freshTradeCount: number;
  trades: TradeStalenessStatus[];
  staleCategorySummary: CategoryStalenessStatus[]; // Only stale/warning categories
  priceBaseDate: string;
  lastChecked: string;
}

/**
 * Get staleness status for a specific volatility category
 */
function getCategoryStaleness(volKey: string): CategoryStalenessStatus {
  const vol = MATERIAL_VOLATILITY[volKey];
  if (!vol) {
    return {
      category: volKey,
      volatilityTier: 'low',
      staleDays: 365,
      daysSinceUpdate: 0,
      daysUntilStale: 365,
      isStale: false,
      isWarning: false,
      reason: 'Unknown category',
    };
  }

  const now = new Date();
  const baseDate = new Date(PRICE_BASE_DATE);
  const daysSinceUpdate = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilStale = Math.max(0, vol.staleDays - daysSinceUpdate);

  return {
    category: vol.category,
    volatilityTier: vol.tier,
    staleDays: vol.staleDays,
    daysSinceUpdate,
    daysUntilStale,
    isStale: daysSinceUpdate >= vol.staleDays,
    isWarning: !!(daysUntilStale > 0 && daysUntilStale <= vol.warningDays),
    reason: vol.reason,
  };
}

/**
 * Generate per-category staleness report
 * Used by Jenny's cron — checks each category independently
 */
export function generateStalenessReport(
  tradeMaterialCounts: Record<string, number>
): PriceStalenessReport {
  const now = new Date();

  const trades: TradeStalenessStatus[] = Object.entries(tradeMaterialCounts).map(([trade, count]) => {
    const volKeys = TRADE_VOLATILITY_MAP[trade] || ['tools'];
    const categories = volKeys.map(getCategoryStaleness);

    // Worst = closest to or past stale threshold
    const worst = categories.reduce((w, c) =>
      c.daysUntilStale < (w?.daysUntilStale ?? Infinity) ? c : w,
      null as CategoryStalenessStatus | null
    );

    const overallStatus: 'fresh' | 'warning' | 'stale' =
      categories.some(c => c.isStale) ? 'stale' :
      categories.some(c => c.isWarning) ? 'warning' : 'fresh';

    return {
      trade,
      tradeName: TRADE_NAMES[trade] || trade,
      materialCount: count,
      categories,
      worstCategory: worst,
      overallStatus,
    };
  });

  const staleCategorySummary = Object.entries(MATERIAL_VOLATILITY)
    .map(([key]) => getCategoryStaleness(key))
    .filter(c => c.isStale || c.isWarning)
    .sort((a, b) => a.daysUntilStale - b.daysUntilStale);

  return {
    totalTrades: trades.length,
    totalMaterials: trades.reduce((sum, t) => sum + t.materialCount, 0),
    staleTradeCount: trades.filter(t => t.overallStatus === 'stale').length,
    warningTradeCount: trades.filter(t => t.overallStatus === 'warning').length,
    freshTradeCount: trades.filter(t => t.overallStatus === 'fresh').length,
    trades,
    staleCategorySummary,
    priceBaseDate: PRICE_BASE_DATE,
    lastChecked: now.toISOString(),
  };
}

/**
 * Check if any material category needs attention (used in Jenny cron)
 * Returns per-category status instead of all-or-nothing
 */
export function pricesNeedAttention(): {
  needsUpdate: boolean;
  staleCategories: CategoryStalenessStatus[];
  warningCategories: CategoryStalenessStatus[];
  daysSinceUpdate: number;
} {
  const now = new Date();
  const baseDate = new Date(PRICE_BASE_DATE);
  const daysSinceUpdate = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  const allCategories = Object.keys(MATERIAL_VOLATILITY).map(getCategoryStaleness);
  const staleCategories = allCategories.filter(c => c.isStale);
  const warningCategories = allCategories.filter(c => c.isWarning);

  return {
    needsUpdate: staleCategories.length > 0 || warningCategories.length > 0,
    staleCategories,
    warningCategories,
    daysSinceUpdate,
  };
}

// ============================================================
// PHASE 3: CROWD-SOURCED PRICE INTELLIGENCE
// ============================================================

export interface PriceLogEntry {
  materialId: string;
  materialName: string;
  trade: string;
  tier: PriceTier;
  estimatedPrice: number;
  actualPrice: number;
  storeName?: string;
  purchaseDate?: string;
  notes?: string;
}

export interface PriceIntelligence {
  materialId: string;
  materialName: string;
  estimatedPrice: number;           // Our static price
  avgActualPrice: number;            // Average of what contractors paid
  medianActualPrice: number;
  sampleSize: number;                // How many contractors reported
  priceDrift: number;                // Difference: actual - estimated
  priceDriftPercent: number;         // % difference
  driftDirection: 'higher' | 'lower' | 'stable'; // Are real prices higher or lower?
  lastReported: string;              // Most recent report date
  confidence: 'low' | 'medium' | 'high'; // Based on sample size
}

export interface PriceIntelligenceReport {
  totalMaterials: number;
  materialsWithData: number;
  avgDriftPercent: number;
  significantDrifts: PriceIntelligence[];  // Materials where actual differs >10%
  topOverpriced: PriceIntelligence[];      // Our price is too high (losing jobs)
  topUnderpriced: PriceIntelligence[];     // Our price is too low (losing money)
  generatedAt: string;
}

/**
 * Calculate price intelligence from logged actual prices
 * Compares crowd-sourced data against static estimates
 */
export function calculatePriceIntelligence(
  logs: Array<{ material_id: string; estimated_price: number; actual_price: number; created_at: string }>,
  materialNames: Record<string, string>
): PriceIntelligenceReport {
  // Group logs by material
  const byMaterial = new Map<string, typeof logs>();
  for (const log of logs) {
    const list = byMaterial.get(log.material_id) || [];
    list.push(log);
    byMaterial.set(log.material_id, list);
  }

  const allIntel: PriceIntelligence[] = [];

  for (const [materialId, materialLogs] of byMaterial) {
    const actualPrices = materialLogs.map(l => l.actual_price).sort((a, b) => a - b);
    const estimatedPrice = materialLogs[0].estimated_price;
    const avgActual = actualPrices.reduce((s, p) => s + p, 0) / actualPrices.length;
    const medianActual = actualPrices.length % 2 === 0
      ? (actualPrices[actualPrices.length / 2 - 1] + actualPrices[actualPrices.length / 2]) / 2
      : actualPrices[Math.floor(actualPrices.length / 2)];

    const drift = avgActual - estimatedPrice;
    const driftPercent = estimatedPrice > 0 ? (drift / estimatedPrice) * 100 : 0;

    const sampleSize = materialLogs.length;
    const confidence: 'low' | 'medium' | 'high' =
      sampleSize >= 10 ? 'high' : sampleSize >= 3 ? 'medium' : 'low';

    const lastReported = materialLogs
      .map(l => l.created_at)
      .sort()
      .pop() || '';

    allIntel.push({
      materialId,
      materialName: materialNames[materialId] || materialId,
      estimatedPrice: Math.round(estimatedPrice * 100) / 100,
      avgActualPrice: Math.round(avgActual * 100) / 100,
      medianActualPrice: Math.round(medianActual * 100) / 100,
      sampleSize,
      priceDrift: Math.round(drift * 100) / 100,
      priceDriftPercent: Math.round(driftPercent * 10) / 10,
      driftDirection: Math.abs(driftPercent) < 5 ? 'stable' : driftPercent > 0 ? 'higher' : 'lower',
      lastReported,
      confidence,
    });
  }

  // Significant drifts (>10% difference)
  const significantDrifts = allIntel
    .filter(i => Math.abs(i.priceDriftPercent) > 10)
    .sort((a, b) => Math.abs(b.priceDriftPercent) - Math.abs(a.priceDriftPercent));

  // Overpriced: our estimate is higher than what contractors actually pay (drift < -10%)
  const topOverpriced = allIntel
    .filter(i => i.priceDriftPercent < -10)
    .sort((a, b) => a.priceDriftPercent - b.priceDriftPercent)
    .slice(0, 10);

  // Underpriced: our estimate is lower than what contractors actually pay (drift > 10%)
  const topUnderpriced = allIntel
    .filter(i => i.priceDriftPercent > 10)
    .sort((a, b) => b.priceDriftPercent - a.priceDriftPercent)
    .slice(0, 10);

  const avgDriftPercent = allIntel.length > 0
    ? Math.round((allIntel.reduce((s, i) => s + Math.abs(i.priceDriftPercent), 0) / allIntel.length) * 10) / 10
    : 0;

  return {
    totalMaterials: Object.keys(materialNames).length,
    materialsWithData: byMaterial.size,
    avgDriftPercent,
    significantDrifts,
    topOverpriced,
    topUnderpriced,
    generatedAt: new Date().toISOString(),
  };
}
