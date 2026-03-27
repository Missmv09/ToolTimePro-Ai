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
// PRICE STALENESS TRACKING
// ============================================================

/** Price data was set to 2026-01-01 as the base date */
const PRICE_BASE_DATE = '2026-01-01T00:00:00Z';
const STALE_THRESHOLD_DAYS = 365; // Flag after 1 year

export interface PriceStalenessReport {
  totalTrades: number;
  totalMaterials: number;
  staleTradeCount: number;
  staleTrades: Array<{
    trade: string;
    tradeName: string;
    materialCount: number;
    priceAge: number;       // days since base date
    isStale: boolean;
  }>;
  priceBaseDate: string;
  daysSinceUpdate: number;
  lastChecked: string;
}

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

/**
 * Generate a price staleness report for all trades
 * Used by Jenny's cron to flag when prices need updating
 */
export function generateStalenessReport(
  tradeMaterialCounts: Record<string, number>
): PriceStalenessReport {
  const now = new Date();
  const baseDate = new Date(PRICE_BASE_DATE);
  const daysSinceUpdate = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  const trades = Object.entries(tradeMaterialCounts).map(([trade, count]) => ({
    trade,
    tradeName: TRADE_NAMES[trade] || trade,
    materialCount: count,
    priceAge: daysSinceUpdate,
    isStale: daysSinceUpdate > STALE_THRESHOLD_DAYS,
  }));

  return {
    totalTrades: trades.length,
    totalMaterials: trades.reduce((sum, t) => sum + t.materialCount, 0),
    staleTradeCount: trades.filter(t => t.isStale).length,
    staleTrades: trades,
    priceBaseDate: PRICE_BASE_DATE,
    daysSinceUpdate,
    lastChecked: now.toISOString(),
  };
}

/**
 * Check if prices are approaching staleness (used in Jenny cron)
 * Returns true if prices are within 30 days of becoming stale
 */
export function pricesNeedAttention(): { needsUpdate: boolean; daysSinceUpdate: number; daysUntilStale: number } {
  const now = new Date();
  const baseDate = new Date(PRICE_BASE_DATE);
  const daysSinceUpdate = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilStale = STALE_THRESHOLD_DAYS - daysSinceUpdate;

  return {
    needsUpdate: daysUntilStale <= 30, // Flag when within 30 days of stale
    daysSinceUpdate,
    daysUntilStale: Math.max(0, daysUntilStale),
  };
}
