// Material Estimator Database
// Trade-specific materials with pricing tiers, coverage rates, and quantity formulas
// Prices based on 2026 Home Depot / Lowe's retail pricing

export type TradeType = 'painting' | 'plumbing' | 'electrical' | 'landscaping' | 'handyman' | 'flooring';

export type PriceTier = 'economy' | 'standard' | 'premium';

export interface Material {
  id: string;
  trade: TradeType;
  category: string;
  name: string;
  description: string;
  unit: string; // 'gallon', 'each', 'linear_ft', 'sq_ft', 'roll', 'box', 'bag', 'sheet'
  prices: Record<PriceTier, number>;
  coveragePerUnit?: number; // sq_ft covered per unit (for paint, stain, etc.)
  coverageUnit?: string; // what the coverage measures
  brands: Record<PriceTier, string>;
  notes?: string;
}

export interface EstimatorQuestion {
  id: string;
  label: string;
  type: 'number' | 'select' | 'checkbox' | 'dimensions';
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  unit?: string;
  helpText?: string;
  required?: boolean;
  showWhen?: { field: string; value: string | boolean }; // conditional display
}

export interface TradeEstimator {
  trade: TradeType;
  name: string;
  icon: string;
  description: string;
  questions: EstimatorQuestion[];
  calculate: (answers: Record<string, unknown>, tier: PriceTier) => EstimateResult;
}

export interface EstimateItem {
  materialId: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  brand: string;
  tier: PriceTier;
}

export interface EstimateResult {
  items: EstimateItem[];
  materialTotal: number;
  laborEstimate: number;
  laborHours: number;
  grandTotal: number;
  notes: string[];
}

// ============================================================
// PAINTING MATERIALS
// ============================================================
const PAINTING_MATERIALS: Material[] = [
  {
    id: 'paint-interior-flat',
    trade: 'painting', category: 'Paint', name: 'Interior Paint - Flat',
    description: 'Interior wall paint, flat/matte finish', unit: 'gallon',
    prices: { economy: 28, standard: 42, premium: 72 },
    coveragePerUnit: 400, coverageUnit: 'sq_ft',
    brands: { economy: 'Glidden Premium', standard: 'Behr Premium Plus', premium: 'Benjamin Moore Regal' },
  },
  {
    id: 'paint-interior-eggshell',
    trade: 'painting', category: 'Paint', name: 'Interior Paint - Eggshell',
    description: 'Interior wall paint, eggshell finish', unit: 'gallon',
    prices: { economy: 30, standard: 45, premium: 75 },
    coveragePerUnit: 400, coverageUnit: 'sq_ft',
    brands: { economy: 'Glidden Premium', standard: 'Behr Ultra', premium: 'Benjamin Moore Regal' },
  },
  {
    id: 'paint-interior-satin',
    trade: 'painting', category: 'Paint', name: 'Interior Paint - Satin',
    description: 'Interior wall paint, satin finish', unit: 'gallon',
    prices: { economy: 32, standard: 48, premium: 78 },
    coveragePerUnit: 400, coverageUnit: 'sq_ft',
    brands: { economy: 'Glidden Diamond', standard: 'Behr Ultra Scuff Defense', premium: 'Sherwin-Williams Duration' },
  },
  {
    id: 'paint-interior-semigloss',
    trade: 'painting', category: 'Paint', name: 'Interior Paint - Semi-Gloss',
    description: 'Interior paint, semi-gloss finish. Great for trim, doors, kitchens, bathrooms.', unit: 'gallon',
    prices: { economy: 34, standard: 50, premium: 80 },
    coveragePerUnit: 400, coverageUnit: 'sq_ft',
    brands: { economy: 'Glidden Diamond', standard: 'Behr Ultra', premium: 'Sherwin-Williams Emerald' },
  },
  {
    id: 'paint-exterior',
    trade: 'painting', category: 'Paint', name: 'Exterior Paint',
    description: 'Exterior house paint, flat or satin', unit: 'gallon',
    prices: { economy: 35, standard: 55, premium: 85 },
    coveragePerUnit: 350, coverageUnit: 'sq_ft',
    brands: { economy: 'Glidden Premium Exterior', standard: 'Behr Marquee Exterior', premium: 'Sherwin-Williams Duration Exterior' },
  },
  {
    id: 'primer-standard',
    trade: 'painting', category: 'Primer', name: 'Primer - Standard',
    description: 'Interior/exterior primer for new or previously painted surfaces', unit: 'gallon',
    prices: { economy: 18, standard: 28, premium: 45 },
    coveragePerUnit: 400, coverageUnit: 'sq_ft',
    brands: { economy: 'Glidden Gripper', standard: 'KILZ 2 All-Purpose', premium: 'Zinsser Bulls Eye 1-2-3 Plus' },
  },
  {
    id: 'primer-stainblock',
    trade: 'painting', category: 'Primer', name: 'Primer - Stain Blocking',
    description: 'Heavy-duty stain blocking primer for water stains, smoke, tannin bleed', unit: 'gallon',
    prices: { economy: 28, standard: 38, premium: 55 },
    coveragePerUnit: 300, coverageUnit: 'sq_ft',
    brands: { economy: 'KILZ Original', standard: 'KILZ 3 Premium', premium: 'Zinsser BIN Shellac' },
  },
  {
    id: 'tape-painters',
    trade: 'painting', category: 'Supplies', name: "Painter's Tape",
    description: '1.88in x 60yd blue painter\'s tape', unit: 'roll',
    prices: { economy: 5, standard: 8, premium: 12 },
    brands: { economy: 'HDX Blue Tape', standard: 'ScotchBlue Original', premium: 'FrogTape Multi-Surface' },
  },
  {
    id: 'dropcloth-plastic',
    trade: 'painting', category: 'Supplies', name: 'Drop Cloth - Plastic',
    description: '9ft x 12ft plastic drop cloth', unit: 'each',
    prices: { economy: 3, standard: 5, premium: 8 },
    brands: { economy: 'HDX Plastic', standard: 'HDX Heavy Duty', premium: 'Trimaco SuperTuff' },
  },
  {
    id: 'dropcloth-canvas',
    trade: 'painting', category: 'Supplies', name: 'Drop Cloth - Canvas',
    description: '9ft x 12ft canvas drop cloth, reusable', unit: 'each',
    prices: { economy: 15, standard: 25, premium: 40 },
    brands: { economy: 'HDX Canvas', standard: 'Trimaco Canvas', premium: 'Trimaco Premium Canvas' },
  },
  {
    id: 'roller-cover',
    trade: 'painting', category: 'Supplies', name: 'Roller Cover 9"',
    description: '9in roller cover, 3/8in nap (smooth surfaces) or 1/2in (textured)', unit: 'each',
    prices: { economy: 4, standard: 8, premium: 14 },
    brands: { economy: 'HDX Roller', standard: 'Wooster Pro/Doo-Z', premium: 'Purdy White Dove' },
  },
  {
    id: 'roller-frame',
    trade: 'painting', category: 'Supplies', name: 'Roller Frame 9"',
    description: '9in roller frame with threaded handle', unit: 'each',
    prices: { economy: 5, standard: 8, premium: 15 },
    brands: { economy: 'HDX Roller Frame', standard: 'Wooster Sherlock', premium: 'Purdy Revolution' },
  },
  {
    id: 'brush-angle',
    trade: 'painting', category: 'Supplies', name: 'Angled Brush 2.5"',
    description: '2.5in angled sash brush for cutting in and trim', unit: 'each',
    prices: { economy: 6, standard: 12, premium: 18 },
    brands: { economy: 'HDX Brush', standard: 'Wooster Silver Tip', premium: 'Purdy Clearcut Elite' },
  },
  {
    id: 'paint-tray',
    trade: 'painting', category: 'Supplies', name: 'Paint Tray + Liner',
    description: 'Metal paint tray with disposable liner', unit: 'each',
    prices: { economy: 4, standard: 6, premium: 10 },
    brands: { economy: 'HDX Tray', standard: 'Wooster Tray', premium: 'Purdy Tray' },
  },
  {
    id: 'caulk-paintable',
    trade: 'painting', category: 'Prep', name: 'Paintable Caulk',
    description: 'Paintable latex caulk for gaps and cracks, 10.1 oz tube', unit: 'each',
    prices: { economy: 4, standard: 6, premium: 9 },
    brands: { economy: 'HDX Painter\'s Caulk', standard: 'DAP Alex Plus', premium: 'DAP DynaFlex 230' },
  },
  {
    id: 'spackle',
    trade: 'painting', category: 'Prep', name: 'Spackle / Wall Patch',
    description: 'Lightweight spackle for nail holes and small dents, 8 oz', unit: 'each',
    prices: { economy: 5, standard: 8, premium: 12 },
    brands: { economy: 'DAP Fast N Final', standard: 'DAP DryDex', premium: '3M Patch Plus Primer' },
  },
  {
    id: 'sandpaper-pack',
    trade: 'painting', category: 'Prep', name: 'Sandpaper Multi-Pack',
    description: 'Assorted grit sandpaper (120/150/220), pack of 6 sheets', unit: 'pack',
    prices: { economy: 5, standard: 8, premium: 12 },
    brands: { economy: 'HDX Sandpaper', standard: '3M Pro Grade', premium: '3M SandBlaster' },
  },
];

// ============================================================
// PLUMBING MATERIALS
// ============================================================
const PLUMBING_MATERIALS: Material[] = [
  {
    id: 'toilet-standard',
    trade: 'plumbing', category: 'Fixtures', name: 'Toilet',
    description: 'Two-piece elongated toilet with seat', unit: 'each',
    prices: { economy: 130, standard: 250, premium: 450 },
    brands: { economy: 'Glacier Bay', standard: 'American Standard Cadet', premium: 'TOTO Drake / Kohler Cimarron' },
  },
  {
    id: 'faucet-kitchen',
    trade: 'plumbing', category: 'Fixtures', name: 'Kitchen Faucet',
    description: 'Single-handle kitchen faucet with pull-down sprayer', unit: 'each',
    prices: { economy: 70, standard: 180, premium: 350 },
    brands: { economy: 'Glacier Bay', standard: 'Moen Adler', premium: 'Delta Leland / Moen Arbor' },
  },
  {
    id: 'faucet-bath',
    trade: 'plumbing', category: 'Fixtures', name: 'Bathroom Faucet',
    description: 'Single or two-handle bathroom faucet', unit: 'each',
    prices: { economy: 45, standard: 120, premium: 280 },
    brands: { economy: 'Glacier Bay', standard: 'Moen Banbury', premium: 'Delta Cassidy / Kohler Purist' },
  },
  {
    id: 'garbage-disposal',
    trade: 'plumbing', category: 'Fixtures', name: 'Garbage Disposal',
    description: 'Kitchen garbage disposal unit', unit: 'each',
    prices: { economy: 80, standard: 150, premium: 300 },
    brands: { economy: 'InSinkErator Badger 5', standard: 'InSinkErator Evolution Compact', premium: 'InSinkErator Evolution Excel' },
  },
  {
    id: 'water-heater-tank',
    trade: 'plumbing', category: 'Water Heater', name: 'Water Heater - Tank (50 gal)',
    description: '50-gallon electric or gas tank water heater', unit: 'each',
    prices: { economy: 500, standard: 800, premium: 1400 },
    brands: { economy: 'Rheem Performance', standard: 'Rheem Performance Plus', premium: 'A.O. Smith Signature Premier' },
  },
  {
    id: 'pipe-pvc',
    trade: 'plumbing', category: 'Pipe', name: 'PVC Pipe 1/2"',
    description: '1/2" Schedule 40 PVC pipe', unit: 'linear_ft',
    prices: { economy: 0.50, standard: 0.65, premium: 0.85 },
    brands: { economy: 'Generic PVC', standard: 'Charlotte Pipe', premium: 'NIBCO' },
  },
  {
    id: 'pipe-pex',
    trade: 'plumbing', category: 'Pipe', name: 'PEX Pipe 1/2"',
    description: '1/2" PEX-A or PEX-B tubing', unit: 'linear_ft',
    prices: { economy: 0.45, standard: 0.75, premium: 1.10 },
    brands: { economy: 'SharkBite PEX-B', standard: 'Uponor AquaPEX', premium: 'Viega PureFlow' },
  },
  {
    id: 'shutoff-valve',
    trade: 'plumbing', category: 'Fittings', name: 'Shut-Off Valve',
    description: '1/2" quarter-turn shut-off valve', unit: 'each',
    prices: { economy: 8, standard: 14, premium: 22 },
    brands: { economy: 'Generic', standard: 'BrassCraft', premium: 'SharkBite Push-Fit' },
  },
  {
    id: 'supply-line',
    trade: 'plumbing', category: 'Fittings', name: 'Supply Line (braided)',
    description: 'Braided stainless steel supply line', unit: 'each',
    prices: { economy: 8, standard: 12, premium: 18 },
    brands: { economy: 'HDX', standard: 'BrassCraft', premium: 'Fluidmaster' },
  },
  {
    id: 'wax-ring',
    trade: 'plumbing', category: 'Fittings', name: 'Wax Ring',
    description: 'Toilet wax ring with flange', unit: 'each',
    prices: { economy: 4, standard: 7, premium: 12 },
    brands: { economy: 'HDX Wax Ring', standard: 'Oatey Johni-Ring', premium: 'Fluidmaster Better Than Wax' },
  },
];

// ============================================================
// ELECTRICAL MATERIALS
// ============================================================
const ELECTRICAL_MATERIALS: Material[] = [
  {
    id: 'wire-14awg',
    trade: 'electrical', category: 'Wire', name: 'Romex 14/2 Wire',
    description: '14/2 NM-B wire for 15-amp circuits (lighting)', unit: 'linear_ft',
    prices: { economy: 0.55, standard: 0.65, premium: 0.80 },
    brands: { economy: 'Southwire', standard: 'Southwire Romex', premium: 'Cerrowire' },
  },
  {
    id: 'wire-12awg',
    trade: 'electrical', category: 'Wire', name: 'Romex 12/2 Wire',
    description: '12/2 NM-B wire for 20-amp circuits (outlets, kitchen)', unit: 'linear_ft',
    prices: { economy: 0.75, standard: 0.90, premium: 1.10 },
    brands: { economy: 'Southwire', standard: 'Southwire Romex', premium: 'Cerrowire' },
  },
  {
    id: 'outlet-standard',
    trade: 'electrical', category: 'Devices', name: 'Outlet (Duplex)',
    description: 'Standard 15A duplex outlet', unit: 'each',
    prices: { economy: 1.50, standard: 3, premium: 6 },
    brands: { economy: 'Leviton Residential', standard: 'Leviton Decora', premium: 'Legrand radiant' },
  },
  {
    id: 'outlet-gfci',
    trade: 'electrical', category: 'Devices', name: 'GFCI Outlet',
    description: '15A or 20A GFCI outlet (required in kitchens, baths, outdoors)', unit: 'each',
    prices: { economy: 14, standard: 20, premium: 30 },
    brands: { economy: 'Leviton SmartlockPro', standard: 'Leviton Decora GFCI', premium: 'Legrand radiant GFCI' },
  },
  {
    id: 'switch-single',
    trade: 'electrical', category: 'Devices', name: 'Light Switch (Single Pole)',
    description: 'Single pole light switch', unit: 'each',
    prices: { economy: 1.50, standard: 3, premium: 8 },
    brands: { economy: 'Leviton Residential', standard: 'Leviton Decora', premium: 'Lutron Diva / Caseta' },
  },
  {
    id: 'switch-dimmer',
    trade: 'electrical', category: 'Devices', name: 'Dimmer Switch',
    description: 'Single pole dimmer switch for LED', unit: 'each',
    prices: { economy: 12, standard: 22, premium: 55 },
    brands: { economy: 'Leviton SureSlide', standard: 'Lutron Toggler', premium: 'Lutron Caseta Wireless' },
  },
  {
    id: 'breaker-20a',
    trade: 'electrical', category: 'Panel', name: 'Circuit Breaker 20A',
    description: '20A single-pole breaker', unit: 'each',
    prices: { economy: 8, standard: 12, premium: 18 },
    brands: { economy: 'Square D Homeline', standard: 'Eaton BR', premium: 'Square D QO' },
  },
  {
    id: 'electrical-box',
    trade: 'electrical', category: 'Boxes', name: 'Electrical Box (New Work)',
    description: 'Single-gang new work electrical box', unit: 'each',
    prices: { economy: 1.50, standard: 2.50, premium: 4 },
    brands: { economy: 'Carlon', standard: 'Madison Electric', premium: 'Steel City' },
  },
  {
    id: 'cover-plate',
    trade: 'electrical', category: 'Devices', name: 'Wall Plate / Cover',
    description: 'Single-gang wall plate', unit: 'each',
    prices: { economy: 0.75, standard: 2, premium: 5 },
    brands: { economy: 'Leviton Nylon', standard: 'Leviton Decora', premium: 'Legrand Adorne' },
  },
  {
    id: 'led-recessed',
    trade: 'electrical', category: 'Lighting', name: 'LED Recessed Light 6"',
    description: '6" LED recessed downlight, IC rated', unit: 'each',
    prices: { economy: 12, standard: 22, premium: 40 },
    brands: { economy: 'Commercial Electric', standard: 'Halo', premium: 'Lithonia / WAC Lighting' },
  },
  {
    id: 'ceiling-fan',
    trade: 'electrical', category: 'Lighting', name: 'Ceiling Fan with Light',
    description: '52" ceiling fan with integrated LED light', unit: 'each',
    prices: { economy: 80, standard: 180, premium: 350 },
    brands: { economy: 'Hampton Bay', standard: 'Hunter Original', premium: 'Minka-Aire / Modern Forms' },
  },
];

// ============================================================
// LANDSCAPING MATERIALS
// ============================================================
const LANDSCAPING_MATERIALS: Material[] = [
  {
    id: 'mulch-bulk',
    trade: 'landscaping', category: 'Ground Cover', name: 'Mulch (Bulk)',
    description: 'Hardwood or colored mulch', unit: 'cubic_yard',
    prices: { economy: 30, standard: 45, premium: 65 },
    brands: { economy: 'Natural Hardwood', standard: 'Colored Hardwood', premium: 'Premium Cedar / Cypress' },
    coveragePerUnit: 162, coverageUnit: 'sq_ft at 2" depth',
  },
  {
    id: 'mulch-bag',
    trade: 'landscaping', category: 'Ground Cover', name: 'Mulch (Bagged 2 cu ft)',
    description: 'Bagged mulch, 2 cubic feet', unit: 'bag',
    prices: { economy: 3.50, standard: 5, premium: 8 },
    brands: { economy: 'Vigoro', standard: 'Scotts Nature Scapes', premium: 'Timberline Cedar' },
    coveragePerUnit: 12, coverageUnit: 'sq_ft at 2" depth',
  },
  {
    id: 'sod',
    trade: 'landscaping', category: 'Lawn', name: 'Sod',
    description: 'Fresh-cut sod per square foot', unit: 'sq_ft',
    prices: { economy: 0.35, standard: 0.55, premium: 0.85 },
    brands: { economy: 'Bermuda / Fescue', standard: 'Kentucky Bluegrass', premium: 'Zoysia / St. Augustine' },
  },
  {
    id: 'topsoil',
    trade: 'landscaping', category: 'Soil', name: 'Topsoil (Bulk)',
    description: 'Screened topsoil', unit: 'cubic_yard',
    prices: { economy: 25, standard: 40, premium: 60 },
    brands: { economy: 'Unscreened Fill', standard: 'Screened Topsoil', premium: 'Premium Garden Blend' },
  },
  {
    id: 'pavers',
    trade: 'landscaping', category: 'Hardscape', name: 'Concrete Pavers',
    description: 'Standard concrete pavers', unit: 'sq_ft',
    prices: { economy: 2.50, standard: 5, premium: 10 },
    brands: { economy: 'Pavestone Holland', standard: 'Belgard Cambridge', premium: 'Tremron / Natural Stone' },
  },
  {
    id: 'gravel',
    trade: 'landscaping', category: 'Ground Cover', name: 'Gravel / Pea Gravel',
    description: 'Decorative gravel or pea gravel', unit: 'cubic_yard',
    prices: { economy: 35, standard: 55, premium: 85 },
    brands: { economy: 'Standard Gravel', standard: 'Pea Gravel', premium: 'River Rock / Mexican Beach' },
    coveragePerUnit: 108, coverageUnit: 'sq_ft at 3" depth',
  },
  {
    id: 'edging',
    trade: 'landscaping', category: 'Hardscape', name: 'Landscape Edging',
    description: 'Plastic or aluminum landscape edging', unit: 'linear_ft',
    prices: { economy: 1.50, standard: 3, premium: 6 },
    brands: { economy: 'EasyFlex Plastic', standard: 'Vigoro Steel', premium: 'DekoRRa Aluminum' },
  },
  {
    id: 'weed-barrier',
    trade: 'landscaping', category: 'Ground Cover', name: 'Weed Barrier Fabric',
    description: 'Landscape fabric, 3ft x 50ft roll', unit: 'roll',
    prices: { economy: 12, standard: 22, premium: 40 },
    coveragePerUnit: 150, coverageUnit: 'sq_ft',
    brands: { economy: 'HDX Weed Block', standard: 'DeWitt Weed Barrier', premium: 'DeWitt Pro-5' },
  },
];

// ============================================================
// HANDYMAN / GENERAL MATERIALS
// ============================================================
const HANDYMAN_MATERIALS: Material[] = [
  {
    id: 'drywall-sheet',
    trade: 'handyman', category: 'Drywall', name: 'Drywall Sheet 4x8',
    description: '1/2" x 4\' x 8\' standard drywall sheet', unit: 'sheet',
    prices: { economy: 12, standard: 15, premium: 22 },
    brands: { economy: 'Gold Bond', standard: 'USG Sheetrock', premium: 'USG Sheetrock Mold Tough' },
    coveragePerUnit: 32, coverageUnit: 'sq_ft',
  },
  {
    id: 'joint-compound',
    trade: 'handyman', category: 'Drywall', name: 'Joint Compound',
    description: 'All-purpose joint compound, 4.5 gal bucket', unit: 'bucket',
    prices: { economy: 12, standard: 18, premium: 28 },
    brands: { economy: 'Gold Bond', standard: 'USG Plus 3', premium: 'USG Sheetrock Dust Control' },
  },
  {
    id: 'drywall-tape',
    trade: 'handyman', category: 'Drywall', name: 'Drywall Tape',
    description: 'Paper drywall tape, 250ft roll', unit: 'roll',
    prices: { economy: 4, standard: 6, premium: 10 },
    brands: { economy: 'Generic Paper', standard: 'USG Sheetrock', premium: 'FibaTape Mesh' },
  },
  {
    id: 'screws-drywall',
    trade: 'handyman', category: 'Fasteners', name: 'Drywall Screws',
    description: '#6 x 1-1/4" drywall screws, box of 200', unit: 'box',
    prices: { economy: 8, standard: 12, premium: 16 },
    brands: { economy: 'Grip-Rite', standard: 'GRK', premium: 'SPAX' },
  },
  {
    id: 'caulk-silicone',
    trade: 'handyman', category: 'Sealants', name: 'Silicone Caulk',
    description: 'Kitchen/bath silicone sealant, 10.1 oz', unit: 'tube',
    prices: { economy: 5, standard: 8, premium: 12 },
    brands: { economy: 'HDX Silicone', standard: 'DAP 3.0', premium: 'GE Supreme Silicone' },
  },
];

// ============================================================
// FLOORING MATERIALS
// ============================================================
const FLOORING_MATERIALS: Material[] = [
  {
    id: 'lvp-flooring',
    trade: 'flooring', category: 'Flooring', name: 'Luxury Vinyl Plank (LVP)',
    description: 'Click-lock luxury vinyl plank flooring', unit: 'sq_ft',
    prices: { economy: 1.80, standard: 3.50, premium: 5.50 },
    brands: { economy: 'TrafficMaster', standard: 'LifeProof', premium: 'COREtec / Shaw Floorte' },
  },
  {
    id: 'laminate-flooring',
    trade: 'flooring', category: 'Flooring', name: 'Laminate Flooring',
    description: 'Click-lock laminate flooring', unit: 'sq_ft',
    prices: { economy: 1.20, standard: 2.50, premium: 4.00 },
    brands: { economy: 'TrafficMaster', standard: 'Pergo Outlast+', premium: 'Mohawk RevWood' },
  },
  {
    id: 'tile-ceramic',
    trade: 'flooring', category: 'Tile', name: 'Ceramic Tile',
    description: 'Ceramic floor tile', unit: 'sq_ft',
    prices: { economy: 1.50, standard: 4, premium: 8 },
    brands: { economy: 'MSI Generic', standard: 'Daltile', premium: 'Marazzi / Porcelain' },
  },
  {
    id: 'underlayment',
    trade: 'flooring', category: 'Supplies', name: 'Underlayment',
    description: 'Foam underlayment for floating floors, 100 sq ft roll', unit: 'roll',
    prices: { economy: 15, standard: 30, premium: 55 },
    coveragePerUnit: 100, coverageUnit: 'sq_ft',
    brands: { economy: 'TrafficMaster Foam', standard: 'QuietWalk', premium: 'FloorMuffler UltraSeal' },
  },
  {
    id: 'thinset-mortar',
    trade: 'flooring', category: 'Tile', name: 'Thinset Mortar (50 lb)',
    description: 'Modified thinset mortar for tile', unit: 'bag',
    prices: { economy: 12, standard: 22, premium: 35 },
    coveragePerUnit: 75, coverageUnit: 'sq_ft',
    brands: { economy: 'Custom Building Products', standard: 'Mapei Kerabond', premium: 'Laticrete 254 Platinum' },
  },
  {
    id: 'grout',
    trade: 'flooring', category: 'Tile', name: 'Grout (25 lb)',
    description: 'Sanded floor tile grout', unit: 'bag',
    prices: { economy: 14, standard: 22, premium: 35 },
    coveragePerUnit: 100, coverageUnit: 'sq_ft',
    brands: { economy: 'Custom Polyblend', standard: 'Mapei Keracolor', premium: 'Laticrete PermaColor Select' },
  },
  {
    id: 'transition-strip',
    trade: 'flooring', category: 'Supplies', name: 'Transition Strip',
    description: 'Floor transition strip, 36" length', unit: 'each',
    prices: { economy: 8, standard: 15, premium: 25 },
    brands: { economy: 'M-D Building Products', standard: 'TrafficMaster', premium: 'Schluter Reno-T' },
  },
];

// ============================================================
// COMBINED DATABASE
// ============================================================
export const ALL_MATERIALS: Material[] = [
  ...PAINTING_MATERIALS,
  ...PLUMBING_MATERIALS,
  ...ELECTRICAL_MATERIALS,
  ...LANDSCAPING_MATERIALS,
  ...HANDYMAN_MATERIALS,
  ...FLOORING_MATERIALS,
];

export function getMaterialsByTrade(trade: TradeType): Material[] {
  return ALL_MATERIALS.filter(m => m.trade === trade);
}

export function getMaterialById(id: string): Material | undefined {
  return ALL_MATERIALS.find(m => m.id === id);
}

export function getMaterialCategories(trade: TradeType): string[] {
  const materials = getMaterialsByTrade(trade);
  return [...new Set(materials.map(m => m.category))];
}
