// Supplier Pricing Engine
// Queries Home Depot API (and future suppliers) for live material pricing
// Falls back to static materials-database.ts prices when APIs unavailable

import type { PriceTier, Material } from './materials-database';

// ============================================================
// TYPES
// ============================================================

export type SupplierKey = 'home_depot' | 'lowes' | 'sherwin_williams' | 'ferguson' | 'grainger' | 'static';

export interface SupplierProduct {
  supplierId: string;        // Product ID in the supplier's system
  supplierKey: SupplierKey;
  supplierName: string;
  productName: string;
  brand: string;
  price: number;
  unit: string;
  inStock: boolean;
  storeLocation?: string;    // Nearest store with stock
  productUrl?: string;       // Direct link (with affiliate tracking)
  imageUrl?: string;
  lastUpdated: string;       // ISO timestamp
  isLive: boolean;           // true = from API, false = static/estimated
  salePrice?: number;        // If on sale
  saleLabel?: string;        // e.g., "30% off", "BOGO"
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
  selectedSupplier: SupplierKey;  // User's choice (defaults to lowest)
}

export interface PricingConfig {
  homeDepotApiKey?: string;
  homeDepotAffiliateId?: string;
  lowesAffiliateId?: string;
  enabledSuppliers: SupplierKey[];
  preferredSupplier?: SupplierKey;  // Contractor's default store
  zipCode?: string;                  // For store availability
}

// ============================================================
// SUPPLIER CONFIGS
// ============================================================

export const SUPPLIER_INFO: Record<SupplierKey, { name: string; logo: string; color: string; affiliateBaseUrl?: string }> = {
  home_depot: {
    name: 'Home Depot',
    logo: '🟧',
    color: 'orange',
    affiliateBaseUrl: 'https://www.homedepot.com/p/',
  },
  lowes: {
    name: "Lowe's",
    logo: '🟦',
    color: 'blue',
    affiliateBaseUrl: 'https://www.lowes.com/pd/',
  },
  sherwin_williams: {
    name: 'Sherwin-Williams',
    logo: '🔵',
    color: 'indigo',
    affiliateBaseUrl: 'https://www.sherwin-williams.com/product/',
  },
  ferguson: {
    name: 'Ferguson',
    logo: '⬜',
    color: 'gray',
    affiliateBaseUrl: 'https://www.ferguson.com/product/',
  },
  grainger: {
    name: 'Grainger',
    logo: '🟥',
    color: 'red',
    affiliateBaseUrl: 'https://www.grainger.com/product/',
  },
  static: {
    name: 'Estimated',
    logo: '📊',
    color: 'gray',
  },
};

// ============================================================
// HOME DEPOT API CLIENT
// ============================================================

// Material ID to Home Depot product keyword mapping
// Used to search HD's product catalog for matching items
const HD_PRODUCT_MAPPINGS: Record<string, { searchTerm: string; category?: string }> = {
  // Painting
  'paint-interior-flat': { searchTerm: 'interior paint flat finish gallon', category: 'paint' },
  'paint-interior-eggshell': { searchTerm: 'interior paint eggshell finish gallon', category: 'paint' },
  'paint-interior-satin': { searchTerm: 'interior paint satin finish gallon', category: 'paint' },
  'paint-interior-semigloss': { searchTerm: 'interior paint semi-gloss finish gallon', category: 'paint' },
  'paint-exterior': { searchTerm: 'exterior paint satin gallon', category: 'paint' },
  'primer': { searchTerm: 'interior primer gallon', category: 'paint' },
  'painter-tape': { searchTerm: 'blue painter tape 1.88 inch', category: 'paint-supplies' },
  'drop-cloth': { searchTerm: 'canvas drop cloth 9x12', category: 'paint-supplies' },
  'roller-cover': { searchTerm: 'paint roller cover 9 inch', category: 'paint-supplies' },
  'paint-tray': { searchTerm: 'paint tray 9 inch', category: 'paint-supplies' },
  'caulk-paintable': { searchTerm: 'paintable caulk white', category: 'caulk-sealant' },
  'spackle': { searchTerm: 'spackling compound quart', category: 'paint-supplies' },
  'sandpaper-pack': { searchTerm: 'sandpaper assorted grit pack', category: 'abrasives' },

  // Plumbing
  'toilet-standard': { searchTerm: 'elongated toilet white', category: 'plumbing' },
  'faucet-kitchen': { searchTerm: 'kitchen faucet pull down', category: 'plumbing' },
  'faucet-bath': { searchTerm: 'bathroom faucet', category: 'plumbing' },
  'garbage-disposal': { searchTerm: 'garbage disposal 1/2 HP', category: 'plumbing' },
  'water-heater-40gal': { searchTerm: 'water heater 40 gallon gas', category: 'plumbing' },
  'wax-ring': { searchTerm: 'toilet wax ring', category: 'plumbing' },
  'supply-line': { searchTerm: 'toilet supply line stainless', category: 'plumbing' },
  'shutoff-valve': { searchTerm: 'quarter turn shutoff valve', category: 'plumbing' },

  // Electrical
  'wire-14-2': { searchTerm: 'romex wire 14/2 250ft', category: 'electrical' },
  'wire-12-2': { searchTerm: 'romex wire 12/2 250ft', category: 'electrical' },
  'outlet-standard': { searchTerm: 'duplex outlet 15 amp white', category: 'electrical' },
  'outlet-gfci': { searchTerm: 'GFCI outlet 15 amp white', category: 'electrical' },
  'switch-single': { searchTerm: 'single pole light switch white', category: 'electrical' },
  'switch-dimmer': { searchTerm: 'dimmer switch single pole', category: 'electrical' },

  // Flooring
  'flooring-laminate': { searchTerm: 'laminate flooring plank per sq ft', category: 'flooring' },
  'flooring-vinyl-plank': { searchTerm: 'luxury vinyl plank flooring per sq ft', category: 'flooring' },
  'flooring-tile': { searchTerm: 'porcelain tile 12x12 per sq ft', category: 'flooring' },
  'flooring-hardwood': { searchTerm: 'engineered hardwood flooring per sq ft', category: 'flooring' },
  'underlayment': { searchTerm: 'flooring underlayment roll', category: 'flooring' },
  'grout': { searchTerm: 'tile grout 25 lb bag', category: 'flooring' },
  'thinset': { searchTerm: 'thinset mortar 50 lb bag', category: 'flooring' },

  // Roofing
  'shingles-3tab': { searchTerm: '3-tab asphalt shingles bundle', category: 'roofing' },
  'shingles-architectural': { searchTerm: 'architectural shingles bundle', category: 'roofing' },
  'roofing-underlayment': { searchTerm: 'roof underlayment felt 15 lb roll', category: 'roofing' },
  'roofing-nails': { searchTerm: 'roofing nails 1.25 inch 5lb box', category: 'roofing' },
  'flashing': { searchTerm: 'roof flashing aluminum roll', category: 'roofing' },
  'ridge-vent': { searchTerm: 'ridge vent 4 ft', category: 'roofing' },

  // HVAC
  'hvac-filter': { searchTerm: 'HVAC air filter 20x25x1', category: 'hvac' },
  'thermostat-smart': { searchTerm: 'smart thermostat programmable', category: 'hvac' },

  // Landscaping
  'mulch-brown': { searchTerm: 'brown mulch 2 cu ft bag', category: 'landscaping' },
  'sod-bermuda': { searchTerm: 'bermuda sod per sq ft', category: 'landscaping' },
  'paver-concrete': { searchTerm: 'concrete paver stone', category: 'landscaping' },
  'landscape-gravel': { searchTerm: 'pea gravel 0.5 cu ft bag', category: 'landscaping' },

  // Fencing
  'fence-post-4x4': { searchTerm: 'pressure treated 4x4 fence post 8ft', category: 'lumber' },
  'fence-picket': { searchTerm: 'cedar fence picket 6ft', category: 'lumber' },
  'fence-rail': { searchTerm: 'fence rail 2x4 8ft', category: 'lumber' },

  // Concrete
  'concrete-mix-60lb': { searchTerm: 'concrete mix 60 lb bag', category: 'concrete' },
  'rebar-3/8': { searchTerm: 'rebar 3/8 inch 10ft', category: 'concrete' },
  'concrete-sealer': { searchTerm: 'concrete sealer gallon', category: 'concrete' },

  // Insulation
  'insulation-batt-r13': { searchTerm: 'fiberglass batt insulation r13', category: 'insulation' },
  'insulation-batt-r19': { searchTerm: 'fiberglass batt insulation r19', category: 'insulation' },
  'spray-foam-kit': { searchTerm: 'spray foam insulation kit', category: 'insulation' },
  'vapor-barrier': { searchTerm: 'vapor barrier plastic sheeting 6 mil', category: 'insulation' },

  // Siding
  'vinyl-siding': { searchTerm: 'vinyl siding panel', category: 'siding' },
  'fiber-cement-siding': { searchTerm: 'hardie board fiber cement siding', category: 'siding' },
  'house-wrap': { searchTerm: 'house wrap tyvek roll', category: 'siding' },

  // Carpentry
  'lumber-2x4-8ft': { searchTerm: 'lumber 2x4 8ft', category: 'lumber' },
  'lumber-2x6-8ft': { searchTerm: 'lumber 2x6 8ft', category: 'lumber' },
  'plywood-3/4': { searchTerm: 'plywood 3/4 inch 4x8 sheet', category: 'lumber' },
  'deck-screws': { searchTerm: 'deck screws 3 inch 5lb box', category: 'fasteners' },

  // Solar
  'solar-panel-400w': { searchTerm: 'solar panel 400 watt', category: 'solar' },
  'solar-inverter': { searchTerm: 'solar inverter hybrid', category: 'solar' },

  // Garage Door
  'garage-door-single': { searchTerm: 'garage door single 8x7', category: 'garage-doors' },
  'garage-door-opener': { searchTerm: 'garage door opener belt drive', category: 'garage-doors' },
};

interface HomeDepotSearchResult {
  products: Array<{
    itemId: string;
    title: string;
    brand: string;
    price: number;
    originalPrice?: number;
    inStock: boolean;
    url: string;
    imageUrl?: string;
    saleTag?: string;
  }>;
}

/**
 * Search Home Depot's Product API for materials
 * Requires HOMEDEPOT_API_KEY environment variable
 */
export async function searchHomeDepot(
  materialId: string,
  apiKey: string,
  affiliateId?: string,
  zipCode?: string
): Promise<SupplierProduct | null> {
  const mapping = HD_PRODUCT_MAPPINGS[materialId];
  if (!mapping) return null;

  try {
    const params = new URLSearchParams({
      keyword: mapping.searchTerm,
      key: apiKey,
      storeId: zipCode || '121',  // Default: national pricing
      pageSize: '1',
      sortBy: 'best_match',
    });
    if (mapping.category) {
      params.set('category', mapping.category);
    }

    const response = await fetch(
      `https://api.homedepot.com/v2/products/search?${params.toString()}`,
      {
        headers: {
          'Accept': 'application/json',
          'x-api-key': apiKey,
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      console.warn(`Home Depot API error for ${materialId}: ${response.status}`);
      return null;
    }

    const data: HomeDepotSearchResult = await response.json();
    if (!data.products || data.products.length === 0) return null;

    const product = data.products[0];
    const productUrl = affiliateId
      ? `${product.url}?cm_mmc=afl-ir-${affiliateId}`
      : product.url;

    return {
      supplierId: product.itemId,
      supplierKey: 'home_depot',
      supplierName: 'Home Depot',
      productName: product.title,
      brand: product.brand,
      price: product.price,
      unit: 'each',
      inStock: product.inStock,
      productUrl,
      imageUrl: product.imageUrl,
      lastUpdated: new Date().toISOString(),
      isLive: true,
      salePrice: product.originalPrice && product.price < product.originalPrice
        ? product.price : undefined,
      saleLabel: product.saleTag,
    };
  } catch (error) {
    console.warn(`Home Depot API failed for ${materialId}:`, error);
    return null;
  }
}

// ============================================================
// STATIC FALLBACK (from materials-database.ts)
// ============================================================

export function getStaticSupplierProduct(
  material: Material,
  tier: PriceTier
): SupplierProduct {
  return {
    supplierId: material.id,
    supplierKey: 'static',
    supplierName: 'Estimated (2026)',
    productName: material.name,
    brand: material.brands[tier],
    price: material.prices[tier],
    unit: material.unit,
    inStock: true,
    lastUpdated: '2026-01-01T00:00:00Z',
    isLive: false,
  };
}

// ============================================================
// MULTI-SUPPLIER COMPARISON ENGINE
// ============================================================

export interface PriceLookupRequest {
  materialId: string;
  materialName: string;
  unit: string;
  quantity: number;
  tier: PriceTier;
  staticPrice: number;
  staticBrand: string;
}

/**
 * Fetch prices from all enabled suppliers for a list of materials
 * Returns supplier comparisons with lowest-price flagged
 */
export async function getSupplierComparisons(
  items: PriceLookupRequest[],
  config: PricingConfig
): Promise<SupplierComparison[]> {
  const comparisons: SupplierComparison[] = [];

  // Batch fetch from all enabled suppliers in parallel
  const supplierPromises = items.map(async (item) => {
    const suppliers: SupplierProduct[] = [];

    // Always include static fallback
    suppliers.push({
      supplierId: item.materialId,
      supplierKey: 'static',
      supplierName: 'Estimated (2026)',
      productName: item.materialName,
      brand: item.staticBrand,
      price: item.staticPrice,
      unit: item.unit,
      inStock: true,
      lastUpdated: '2026-01-01T00:00:00Z',
      isLive: false,
    });

    // Home Depot live pricing
    if (config.enabledSuppliers.includes('home_depot') && config.homeDepotApiKey) {
      const hdProduct = await searchHomeDepot(
        item.materialId,
        config.homeDepotApiKey,
        config.homeDepotAffiliateId,
        config.zipCode
      );
      if (hdProduct) {
        suppliers.push(hdProduct);
      }
    }

    // Future: Add Lowe's, Sherwin-Williams, Ferguson, Grainger here
    // Each supplier follows the same pattern:
    // if (config.enabledSuppliers.includes('lowes') && config.lowesApiKey) {
    //   const lowesProduct = await searchLowes(item.materialId, ...);
    //   if (lowesProduct) suppliers.push(lowesProduct);
    // }

    // Find lowest price
    const liveSuppliers = suppliers.filter(s => s.isLive);
    const allPriced = liveSuppliers.length > 0 ? liveSuppliers : suppliers;
    const lowest = allPriced.reduce((min, s) =>
      (s.salePrice || s.price) < (min.salePrice || min.price) ? s : min
    );

    return {
      materialId: item.materialId,
      materialName: item.materialName,
      unit: item.unit,
      quantity: item.quantity,
      tier: item.tier,
      suppliers,
      lowestSupplier: lowest.supplierKey,
      lowestPrice: lowest.salePrice || lowest.price,
      selectedSupplier: config.preferredSupplier && suppliers.some(s => s.supplierKey === config.preferredSupplier)
        ? config.preferredSupplier
        : lowest.supplierKey,
    } satisfies SupplierComparison;
  });

  const results = await Promise.all(supplierPromises);
  comparisons.push(...results);

  return comparisons;
}

// ============================================================
// AFFILIATE LINK BUILDER
// ============================================================

export function buildAffiliateLink(
  supplierKey: SupplierKey,
  productUrl: string,
  affiliateId?: string
): string {
  if (!affiliateId || !productUrl) return productUrl || '#';

  switch (supplierKey) {
    case 'home_depot':
      return `${productUrl}${productUrl.includes('?') ? '&' : '?'}cm_mmc=afl-ir-${affiliateId}`;
    case 'lowes':
      return `${productUrl}${productUrl.includes('?') ? '&' : '?'}cm_mmc=aff-_-${affiliateId}`;
    default:
      return productUrl;
  }
}

// ============================================================
// PRICE STALENESS TRACKING
// ============================================================

export interface PriceStalenessReport {
  totalMaterials: number;
  liveCount: number;
  estimatedCount: number;
  staleItems: Array<{
    materialId: string;
    materialName: string;
    staticPrice: number;
    lastUpdated: string;
    daysSinceUpdate: number;
  }>;
  lastChecked: string;
}

/**
 * Generate a report of which prices are live vs estimated/stale
 * Useful for the monthly price review cron
 */
export function generateStalenessReport(
  comparisons: SupplierComparison[]
): PriceStalenessReport {
  const now = new Date();
  const staleThresholdDays = 90; // Flag items older than 90 days

  const staleItems = comparisons
    .filter(c => c.suppliers.every(s => !s.isLive))
    .map(c => {
      const staticSupplier = c.suppliers.find(s => s.supplierKey === 'static');
      const lastUpdated = staticSupplier?.lastUpdated || '2026-01-01T00:00:00Z';
      const daysSince = Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
      return {
        materialId: c.materialId,
        materialName: c.materialName,
        staticPrice: staticSupplier?.price || 0,
        lastUpdated,
        daysSinceUpdate: daysSince,
      };
    })
    .filter(item => item.daysSinceUpdate > staleThresholdDays);

  return {
    totalMaterials: comparisons.length,
    liveCount: comparisons.filter(c => c.suppliers.some(s => s.isLive)).length,
    estimatedCount: comparisons.filter(c => c.suppliers.every(s => !s.isLive)).length,
    staleItems,
    lastChecked: now.toISOString(),
  };
}

// ============================================================
// SAVINGS CALCULATOR
// ============================================================

export function calculateSavings(
  comparisons: SupplierComparison[]
): { totalLowest: number; totalStatic: number; savedAmount: number; savedPercent: number } {
  let totalLowest = 0;
  let totalStatic = 0;

  for (const comp of comparisons) {
    const staticSupplier = comp.suppliers.find(s => s.supplierKey === 'static');
    const staticPrice = staticSupplier ? staticSupplier.price * comp.quantity : 0;
    const lowestTotal = comp.lowestPrice * comp.quantity;

    totalLowest += lowestTotal;
    totalStatic += staticPrice;
  }

  const savedAmount = totalStatic - totalLowest;
  const savedPercent = totalStatic > 0 ? (savedAmount / totalStatic) * 100 : 0;

  return { totalLowest, totalStatic, savedAmount, savedPercent };
}
