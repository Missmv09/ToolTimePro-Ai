// Material Estimator Database
// Trade-specific materials with pricing tiers, coverage rates, and quantity formulas
// Prices based on 2026 Home Depot / Lowe's retail pricing

export type TradeType = 'painting' | 'plumbing' | 'electrical' | 'landscaping' | 'handyman' | 'flooring' | 'lawn_care' | 'pool_service' | 'hvac' | 'roofing' | 'fencing' | 'concrete' | 'carpentry' | 'irrigation' | 'pressure_washing' | 'insulation' | 'siding' | 'drywall' | 'tree_service' | 'solar' | 'garage_door';

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
  placeholder?: string;
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
// LAWN CARE MATERIALS
// ============================================================
const LAWN_CARE_MATERIALS: Material[] = [
  {
    id: 'fertilizer-granular',
    trade: 'lawn_care', category: 'Fertilizer', name: 'Lawn Fertilizer (Granular)',
    description: 'All-purpose granular lawn fertilizer', unit: 'bag',
    prices: { economy: 18, standard: 30, premium: 48 },
    coveragePerUnit: 5000, coverageUnit: 'sq_ft',
    brands: { economy: 'Vigoro', standard: 'Scotts Turf Builder', premium: 'Milorganite Organic' },
  },
  {
    id: 'weed-feed',
    trade: 'lawn_care', category: 'Fertilizer', name: 'Weed & Feed',
    description: 'Combined fertilizer and weed killer', unit: 'bag',
    prices: { economy: 22, standard: 35, premium: 55 },
    coveragePerUnit: 5000, coverageUnit: 'sq_ft',
    brands: { economy: 'Vigoro Weed & Feed', standard: 'Scotts Turf Builder Weed & Feed', premium: 'BioAdvanced All-in-One' },
  },
  {
    id: 'grass-seed',
    trade: 'lawn_care', category: 'Seed', name: 'Grass Seed',
    description: 'Lawn grass seed blend', unit: 'bag',
    prices: { economy: 20, standard: 35, premium: 55 },
    coveragePerUnit: 2000, coverageUnit: 'sq_ft (overseeding)',
    brands: { economy: 'Vigoro Grass Seed', standard: 'Scotts Turf Builder Grass Seed', premium: 'Pennington Smart Seed' },
    notes: 'New lawn seeding uses 2-3x more seed than overseeding',
  },
  {
    id: 'pre-emergent',
    trade: 'lawn_care', category: 'Weed Control', name: 'Pre-Emergent Herbicide',
    description: 'Prevents crabgrass and weeds before they sprout', unit: 'bag',
    prices: { economy: 20, standard: 32, premium: 48 },
    coveragePerUnit: 5000, coverageUnit: 'sq_ft',
    brands: { economy: 'Vigoro Crabgrass Preventer', standard: 'Scotts Halts', premium: 'Dimension / Barricade Pro' },
  },
  {
    id: 'aeration-core',
    trade: 'lawn_care', category: 'Aeration', name: 'Core Aerator Rental',
    description: 'Core aerator machine rental (half day)', unit: 'each',
    prices: { economy: 75, standard: 95, premium: 120 },
    brands: { economy: 'Home Depot Rental', standard: 'Sunbelt Rentals', premium: 'Pro Aerator (full day)' },
  },
  {
    id: 'topsoil-lawn',
    trade: 'lawn_care', category: 'Soil', name: 'Lawn Topsoil / Topdressing',
    description: 'Screened topsoil for leveling and topdressing', unit: 'cubic_yard',
    prices: { economy: 25, standard: 40, premium: 60 },
    brands: { economy: 'Unscreened Fill', standard: 'Screened Topsoil', premium: 'Premium Lawn Mix' },
    coveragePerUnit: 324, coverageUnit: 'sq_ft at 1" depth',
  },
  {
    id: 'lime-pelletized',
    trade: 'lawn_care', category: 'Soil Amendment', name: 'Pelletized Lime',
    description: 'Raises soil pH for healthier lawns', unit: 'bag',
    prices: { economy: 5, standard: 8, premium: 14 },
    coveragePerUnit: 1000, coverageUnit: 'sq_ft',
    brands: { economy: 'Pennington Fast Acting', standard: 'Espoma Organic Lime', premium: 'Jonathan Green Mag-I-Cal' },
  },
];

// ============================================================
// POOL SERVICE MATERIALS
// ============================================================
const POOL_SERVICE_MATERIALS: Material[] = [
  {
    id: 'chlorine-tabs',
    trade: 'pool_service', category: 'Chemicals', name: 'Chlorine Tablets (3")',
    description: '3-inch stabilized chlorine tablets', unit: 'bucket',
    prices: { economy: 55, standard: 80, premium: 110 },
    brands: { economy: 'HDX Pool Chlorine', standard: 'In The Swim', premium: 'BioGuard Smart Sticks' },
    notes: '25 lb bucket; ~1 tab per 10,000 gal per week',
  },
  {
    id: 'chlorine-shock',
    trade: 'pool_service', category: 'Chemicals', name: 'Pool Shock (Cal-Hypo)',
    description: 'Calcium hypochlorite granular shock treatment', unit: 'bag',
    prices: { economy: 5, standard: 8, premium: 12 },
    brands: { economy: 'HDX Pool Shock', standard: 'In The Swim Super Shock', premium: 'BioGuard Burn Out 3' },
    notes: '1 lb bag treats 10,000 gallons',
  },
  {
    id: 'pool-algaecide',
    trade: 'pool_service', category: 'Chemicals', name: 'Algaecide',
    description: 'Pool algaecide preventative/treatment', unit: 'quart',
    prices: { economy: 10, standard: 18, premium: 28 },
    brands: { economy: 'HDX Algaecide', standard: 'In The Swim Algaecide 60', premium: 'BioGuard Banish' },
  },
  {
    id: 'pool-ph-down',
    trade: 'pool_service', category: 'Chemicals', name: 'pH Decreaser (Muriatic Acid)',
    description: 'Lowers pool pH; muriatic acid or dry acid', unit: 'gallon',
    prices: { economy: 8, standard: 12, premium: 18 },
    brands: { economy: 'HDX Muriatic Acid', standard: 'Clorox Pool pH Down', premium: 'BioGuard Lo-N-Slo (dry)' },
  },
  {
    id: 'pool-stabilizer',
    trade: 'pool_service', category: 'Chemicals', name: 'Cyanuric Acid (Stabilizer)',
    description: 'Protects chlorine from UV breakdown', unit: 'bag',
    prices: { economy: 15, standard: 22, premium: 35 },
    brands: { economy: 'In The Swim CYA', standard: 'Clorox Pool Stabilizer', premium: 'BioGuard Stabilizer 100' },
    notes: '4 lb bag; target 30-50 ppm',
  },
  {
    id: 'pool-filter-cartridge',
    trade: 'pool_service', category: 'Filters', name: 'Filter Cartridge',
    description: 'Replacement pool filter cartridge (standard size)', unit: 'each',
    prices: { economy: 25, standard: 50, premium: 90 },
    brands: { economy: 'Unicel Generic', standard: 'Pleatco Standard', premium: 'Pleatco Advanced / Filbur Pro' },
  },
  {
    id: 'pool-pump',
    trade: 'pool_service', category: 'Equipment', name: 'Pool Pump (Variable Speed)',
    description: 'Variable speed pool pump 1.5 HP', unit: 'each',
    prices: { economy: 400, standard: 750, premium: 1200 },
    brands: { economy: 'XtremepowerUS', standard: 'Hayward Super Pump VS', premium: 'Pentair IntelliFlo VSF' },
  },
  {
    id: 'pool-heater',
    trade: 'pool_service', category: 'Equipment', name: 'Pool Heater (Gas)',
    description: 'Natural gas or propane pool heater', unit: 'each',
    prices: { economy: 1500, standard: 2500, premium: 4000 },
    brands: { economy: 'Raypak Digital', standard: 'Hayward H-Series', premium: 'Pentair MasterTemp' },
  },
  {
    id: 'pool-salt',
    trade: 'pool_service', category: 'Chemicals', name: 'Pool Salt (40 lb)',
    description: 'Pool-grade salt for saltwater chlorine generators', unit: 'bag',
    prices: { economy: 6, standard: 8, premium: 12 },
    brands: { economy: 'Morton Pool Salt', standard: 'Clorox Pool Salt', premium: 'Aqua Salt Premium' },
    notes: 'New pool: ~200 lbs per 10,000 gal; maintenance: ~40 lbs/month',
  },
  {
    id: 'pool-test-kit',
    trade: 'pool_service', category: 'Testing', name: 'Pool Test Kit',
    description: 'Water test kit (pH, chlorine, alkalinity, CYA)', unit: 'each',
    prices: { economy: 12, standard: 28, premium: 55 },
    brands: { economy: 'AquaChek Test Strips', standard: 'Taylor K-2006', premium: 'LaMotte ColorQ Pro' },
  },
];

// ============================================================
// HVAC MATERIALS
// ============================================================
const HVAC_MATERIALS: Material[] = [
  {
    id: 'hvac-filter',
    trade: 'hvac', category: 'Filters', name: 'HVAC Air Filter (20x25x1)',
    description: 'Standard 1" HVAC filter, MERV 8-13', unit: 'each',
    prices: { economy: 5, standard: 12, premium: 22 },
    brands: { economy: 'HDX Basic MERV 8', standard: 'Filtrete 1200 MERV 11', premium: 'Filtrete 2200 MERV 13' },
    notes: 'Replace every 1-3 months',
  },
  {
    id: 'hvac-thermostat',
    trade: 'hvac', category: 'Controls', name: 'Thermostat',
    description: 'Programmable or smart thermostat', unit: 'each',
    prices: { economy: 25, standard: 130, premium: 250 },
    brands: { economy: 'Honeywell Home T1', standard: 'Google Nest Learning', premium: 'Ecobee Premium' },
  },
  {
    id: 'hvac-capacitor',
    trade: 'hvac', category: 'Parts', name: 'Run Capacitor',
    description: 'AC compressor/fan motor run capacitor', unit: 'each',
    prices: { economy: 10, standard: 18, premium: 30 },
    brands: { economy: 'TRANE Generic', standard: 'MARS Motor Run Cap', premium: 'American Standard OEM' },
    notes: 'Most common AC repair part',
  },
  {
    id: 'hvac-contactor',
    trade: 'hvac', category: 'Parts', name: 'AC Contactor',
    description: 'Contactor relay for outdoor AC unit', unit: 'each',
    prices: { economy: 12, standard: 22, premium: 35 },
    brands: { economy: 'Generic 2-Pole', standard: 'Packard / MARS', premium: 'Honeywell DP' },
  },
  {
    id: 'hvac-refrigerant-410a',
    trade: 'hvac', category: 'Refrigerant', name: 'R-410A Refrigerant',
    description: 'R-410A refrigerant (per pound, installed)', unit: 'lb',
    prices: { economy: 35, standard: 50, premium: 75 },
    brands: { economy: 'Generic 410A', standard: 'Chemours Genetron', premium: 'Honeywell Genetron' },
    notes: 'EPA Section 608 certification required to handle',
  },
  {
    id: 'hvac-condensate-pump',
    trade: 'hvac', category: 'Parts', name: 'Condensate Pump',
    description: 'Mini condensate removal pump for AC/furnace', unit: 'each',
    prices: { economy: 35, standard: 60, premium: 95 },
    brands: { economy: 'Little Giant VCMA-15', standard: 'Little Giant VCMA-20', premium: 'Diversitech IQP-120' },
  },
  {
    id: 'hvac-duct-tape',
    trade: 'hvac', category: 'Ductwork', name: 'HVAC Foil Tape',
    description: 'Aluminum foil duct tape (not cloth "duct tape")', unit: 'roll',
    prices: { economy: 6, standard: 10, premium: 16 },
    brands: { economy: 'HDX Foil Tape', standard: '3M 3340 Foil Tape', premium: 'Nashua 324A' },
  },
  {
    id: 'hvac-duct-insulation',
    trade: 'hvac', category: 'Ductwork', name: 'Duct Insulation Wrap',
    description: 'Fiberglass duct insulation wrap, R-6', unit: 'roll',
    prices: { economy: 25, standard: 40, premium: 60 },
    coveragePerUnit: 75, coverageUnit: 'sq_ft',
    brands: { economy: 'Johns Manville', standard: 'Owens Corning', premium: 'Knauf Insulation' },
  },
  {
    id: 'hvac-mini-split',
    trade: 'hvac', category: 'Equipment', name: 'Mini-Split AC System',
    description: 'Ductless mini-split heat pump, single zone', unit: 'each',
    prices: { economy: 700, standard: 1200, premium: 2200 },
    brands: { economy: 'Pioneer 12K BTU', standard: 'MRCOOL DIY 18K BTU', premium: 'Mitsubishi 12K BTU Hyper-Heat' },
  },
  {
    id: 'hvac-line-set',
    trade: 'hvac', category: 'Equipment', name: 'Refrigerant Line Set',
    description: 'Pre-charged copper line set for mini-split (25 ft)', unit: 'each',
    prices: { economy: 60, standard: 100, premium: 150 },
    brands: { economy: 'MRCOOL Line Set', standard: 'ICool Pre-Charged', premium: 'Carrier / Daikin OEM' },
  },
];

// ============================================================
// ROOFING MATERIALS
// ============================================================
const ROOFING_MATERIALS: Material[] = [
  { id: 'shingles-3tab', trade: 'roofing', category: 'Shingles', name: '3-Tab Shingles', description: 'Standard 3-tab asphalt shingles, bundle covers ~33 sq ft', unit: 'bundle', prices: { economy: 28, standard: 35, premium: 45 }, coveragePerUnit: 33, coverageUnit: 'sq_ft', brands: { economy: 'Tamko Heritage', standard: 'Owens Corning Supreme', premium: 'GAF Royal Sovereign' } },
  { id: 'shingles-arch', trade: 'roofing', category: 'Shingles', name: 'Architectural Shingles', description: 'Dimensional/architectural shingles, bundle covers ~33 sq ft', unit: 'bundle', prices: { economy: 35, standard: 45, premium: 60 }, coveragePerUnit: 33, coverageUnit: 'sq_ft', brands: { economy: 'Tamko Heritage', standard: 'Owens Corning Duration', premium: 'GAF Timberline HDZ' } },
  { id: 'roof-underlayment', trade: 'roofing', category: 'Underlayment', name: 'Synthetic Underlayment', description: 'Synthetic roof underlayment, 10 sq roll', unit: 'roll', prices: { economy: 55, standard: 85, premium: 130 }, coveragePerUnit: 1000, coverageUnit: 'sq_ft', brands: { economy: 'Grip-Rite ShingleLayment', standard: 'GAF FeltBuster', premium: 'GAF Tiger Paw' } },
  { id: 'ice-water-shield', trade: 'roofing', category: 'Underlayment', name: 'Ice & Water Shield', description: 'Self-adhering ice/water barrier for valleys and eaves', unit: 'roll', prices: { economy: 80, standard: 110, premium: 150 }, coveragePerUnit: 200, coverageUnit: 'sq_ft', brands: { economy: 'Grip-Rite', standard: 'GAF WeatherWatch', premium: 'Grace Ice & Water Shield' } },
  { id: 'drip-edge', trade: 'roofing', category: 'Flashing', name: 'Drip Edge', description: 'Aluminum drip edge, 10ft piece', unit: 'each', prices: { economy: 5, standard: 8, premium: 12 }, brands: { economy: 'Amerimax Aluminum', standard: 'Gibraltar Steel', premium: 'Amerimax T-Style' } },
  { id: 'roof-nails', trade: 'roofing', category: 'Fasteners', name: 'Roofing Nails (Coil)', description: '1-1/4" galvanized roofing nails, 7200 ct', unit: 'box', prices: { economy: 45, standard: 55, premium: 70 }, brands: { economy: 'Grip-Rite', standard: 'Maze Nails', premium: 'Bostitch Coil' } },
  { id: 'roof-vent', trade: 'roofing', category: 'Ventilation', name: 'Ridge Vent', description: 'Ridge vent, 4ft section', unit: 'each', prices: { economy: 12, standard: 20, premium: 30 }, brands: { economy: 'Air Vent Shingle-Over', standard: 'GAF Cobra', premium: 'Lomanco OmniRidge' } },
  { id: 'roof-starter', trade: 'roofing', category: 'Shingles', name: 'Starter Strip Shingles', description: 'Starter course for eaves and rakes', unit: 'bundle', prices: { economy: 22, standard: 30, premium: 40 }, coveragePerUnit: 105, coverageUnit: 'linear_ft', brands: { economy: 'Tamko', standard: 'Owens Corning Starter', premium: 'GAF Pro-Start' } },
];

// ============================================================
// FENCING MATERIALS
// ============================================================
const FENCING_MATERIALS: Material[] = [
  { id: 'fence-post-wood', trade: 'fencing', category: 'Posts', name: 'Fence Post (4x4x8 PT)', description: '4x4x8 pressure-treated wood fence post', unit: 'each', prices: { economy: 10, standard: 14, premium: 20 }, brands: { economy: 'Generic PT', standard: 'WeatherShield', premium: 'MicroPro Sienna' } },
  { id: 'fence-picket', trade: 'fencing', category: 'Boards', name: 'Fence Picket (1x6x6 PT)', description: '1x6x6 dog-ear or flat-top fence picket', unit: 'each', prices: { economy: 2.50, standard: 4, premium: 6 }, brands: { economy: 'Generic PT Pine', standard: 'WeatherShield Cedar Tone', premium: 'Western Red Cedar' } },
  { id: 'fence-rail', trade: 'fencing', category: 'Rails', name: 'Fence Rail (2x4x8 PT)', description: '2x4x8 pressure-treated horizontal rail', unit: 'each', prices: { economy: 6, standard: 9, premium: 14 }, brands: { economy: 'Generic PT', standard: 'WeatherShield', premium: 'MicroPro Sienna' } },
  { id: 'fence-concrete', trade: 'fencing', category: 'Foundation', name: 'Quick-Set Concrete (50 lb)', description: 'Fast-setting concrete for fence posts', unit: 'bag', prices: { economy: 5, standard: 7, premium: 9 }, brands: { economy: 'Sakrete', standard: 'Quikrete Fast-Setting', premium: 'Sika Fence Post Mix' } },
  { id: 'fence-screws', trade: 'fencing', category: 'Fasteners', name: 'Fence Screws (1 lb)', description: 'Exterior coated fence/deck screws', unit: 'box', prices: { economy: 8, standard: 12, premium: 18 }, brands: { economy: 'Grip-Rite', standard: 'GRK RT Composite', premium: 'SPAX PowerLag' } },
  { id: 'fence-gate-hardware', trade: 'fencing', category: 'Hardware', name: 'Gate Hardware Kit', description: 'Gate hinges, latch, and handle set', unit: 'each', prices: { economy: 18, standard: 35, premium: 60 }, brands: { economy: 'National Hardware', standard: 'Everbilt', premium: 'Boerboel Gate Solutions' } },
  { id: 'fence-vinyl-panel', trade: 'fencing', category: 'Panels', name: 'Vinyl Fence Panel (6x8)', description: '6ft x 8ft vinyl privacy fence panel', unit: 'each', prices: { economy: 65, standard: 100, premium: 150 }, brands: { economy: 'Outdoor Essentials', standard: 'Veranda', premium: 'ActiveYards / Bufftech' } },
];

// ============================================================
// CONCRETE & MASONRY MATERIALS
// ============================================================
const CONCRETE_MATERIALS: Material[] = [
  { id: 'concrete-bag', trade: 'concrete', category: 'Concrete', name: 'Concrete Mix (80 lb)', description: 'Standard concrete mix, 80 lb bag yields ~0.6 cu ft', unit: 'bag', prices: { economy: 5, standard: 7, premium: 9 }, brands: { economy: 'Sakrete', standard: 'Quikrete 5000', premium: 'Quikrete Countertop Mix' } },
  { id: 'concrete-rebar', trade: 'concrete', category: 'Reinforcement', name: 'Rebar #4 (1/2" x 10ft)', description: '#4 rebar, 1/2" diameter, 10ft length', unit: 'each', prices: { economy: 6, standard: 8, premium: 11 }, brands: { economy: 'Generic Rebar', standard: 'US Steel', premium: 'Epoxy-Coated' } },
  { id: 'concrete-mesh', trade: 'concrete', category: 'Reinforcement', name: 'Wire Mesh (5x10 ft)', description: '6x6 welded wire mesh sheet', unit: 'sheet', prices: { economy: 8, standard: 12, premium: 18 }, brands: { economy: 'Generic', standard: 'Red Brand', premium: 'Deacero Heavy Gauge' } },
  { id: 'concrete-form-lumber', trade: 'concrete', category: 'Forms', name: 'Form Lumber (2x4x8)', description: '2x4x8 lumber for concrete forms', unit: 'each', prices: { economy: 4, standard: 6, premium: 8 }, brands: { economy: 'Whitewood', standard: 'Premium Stud', premium: 'Douglas Fir' } },
  { id: 'mortar-mix', trade: 'concrete', category: 'Masonry', name: 'Mortar Mix (80 lb)', description: 'Type S mortar mix for block and brick', unit: 'bag', prices: { economy: 7, standard: 10, premium: 14 }, brands: { economy: 'Sakrete', standard: 'Quikrete Mason Mix', premium: 'Spec Mix' } },
  { id: 'cmu-block', trade: 'concrete', category: 'Masonry', name: 'CMU Block (8x8x16)', description: 'Standard concrete masonry unit', unit: 'each', prices: { economy: 1.80, standard: 2.50, premium: 4 }, brands: { economy: 'Standard Gray', standard: 'Precision Block', premium: 'Split-Face / Colored' } },
  { id: 'gravel-base', trade: 'concrete', category: 'Base', name: 'Crushed Gravel Base', description: 'Compactible crushed stone for sub-base', unit: 'cubic_yard', prices: { economy: 30, standard: 45, premium: 65 }, brands: { economy: '3/4" Crush', standard: 'Road Base', premium: 'Recycled Concrete Aggregate' } },
];

// ============================================================
// CARPENTRY MATERIALS
// ============================================================
const CARPENTRY_MATERIALS: Material[] = [
  { id: 'lumber-2x4', trade: 'carpentry', category: 'Framing', name: 'Stud 2x4x8 (SPF)', description: 'Spruce-Pine-Fir framing lumber', unit: 'each', prices: { economy: 3.50, standard: 5, premium: 7 }, brands: { economy: 'Whitewood', standard: 'Premium Stud', premium: 'Kiln-Dried Doug Fir' } },
  { id: 'lumber-2x6', trade: 'carpentry', category: 'Framing', name: 'Lumber 2x6x8 (SPF)', description: 'Structural framing lumber', unit: 'each', prices: { economy: 6, standard: 8, premium: 11 }, brands: { economy: 'Whitewood', standard: 'Premium', premium: 'Kiln-Dried Doug Fir' } },
  { id: 'plywood-sheathing', trade: 'carpentry', category: 'Sheathing', name: 'Plywood 4x8 (1/2" CDX)', description: '1/2" CDX plywood sheathing', unit: 'sheet', prices: { economy: 28, standard: 38, premium: 50 }, brands: { economy: 'Structural 1', standard: 'Georgia-Pacific', premium: 'Weyerhaeuser' }, coveragePerUnit: 32, coverageUnit: 'sq_ft' },
  { id: 'osb-sheathing', trade: 'carpentry', category: 'Sheathing', name: 'OSB 4x8 (7/16")', description: '7/16" OSB structural sheathing', unit: 'sheet', prices: { economy: 18, standard: 24, premium: 32 }, brands: { economy: 'Generic OSB', standard: 'LP SmartSide', premium: 'Weyerhaeuser Edge Gold' }, coveragePerUnit: 32, coverageUnit: 'sq_ft' },
  { id: 'deck-board-pt', trade: 'carpentry', category: 'Decking', name: 'Deck Board 5/4x6x8 PT', description: 'Pressure-treated decking board', unit: 'each', prices: { economy: 8, standard: 12, premium: 18 }, brands: { economy: 'Generic PT', standard: 'WeatherShield', premium: 'MicroPro Sienna' } },
  { id: 'deck-board-composite', trade: 'carpentry', category: 'Decking', name: 'Composite Deck Board (8ft)', description: 'Composite decking, 8ft board', unit: 'each', prices: { economy: 18, standard: 30, premium: 50 }, brands: { economy: 'Veranda Composite', standard: 'Trex Select', premium: 'Trex Transcend / TimberTech' } },
  { id: 'wood-screws', trade: 'carpentry', category: 'Fasteners', name: 'Construction Screws (1 lb)', description: 'Multi-purpose construction screws', unit: 'box', prices: { economy: 8, standard: 14, premium: 20 }, brands: { economy: 'Grip-Rite', standard: 'GRK R4', premium: 'SPAX Multi-Material' } },
  { id: 'joist-hanger', trade: 'carpentry', category: 'Hardware', name: 'Joist Hanger (2x6)', description: 'Galvanized joist hanger', unit: 'each', prices: { economy: 2, standard: 3.50, premium: 5 }, brands: { economy: 'USP', standard: 'Simpson Strong-Tie LUS26', premium: 'Simpson Strong-Tie?"' } },
];

// ============================================================
// IRRIGATION & SPRINKLER MATERIALS
// ============================================================
const IRRIGATION_MATERIALS: Material[] = [
  { id: 'sprinkler-head-popup', trade: 'irrigation', category: 'Sprinkler Heads', name: 'Pop-Up Spray Head', description: '4" pop-up spray sprinkler head', unit: 'each', prices: { economy: 3, standard: 6, premium: 12 }, brands: { economy: 'Orbit', standard: 'Rain Bird 1804', premium: 'Hunter Pro-Spray' } },
  { id: 'sprinkler-head-rotor', trade: 'irrigation', category: 'Sprinkler Heads', name: 'Rotor Head', description: 'Gear-driven rotor for large areas', unit: 'each', prices: { economy: 10, standard: 18, premium: 30 }, brands: { economy: 'Orbit Voyager II', standard: 'Rain Bird 5000', premium: 'Hunter PGP Ultra' } },
  { id: 'irrigation-pipe', trade: 'irrigation', category: 'Pipe', name: 'Irrigation Pipe (3/4" poly)', description: '3/4" polyethylene irrigation pipe, per 100ft', unit: 'roll', prices: { economy: 18, standard: 28, premium: 40 }, brands: { economy: 'Orbit Poly', standard: 'Rain Bird Poly', premium: 'Hunter Poly' } },
  { id: 'irrigation-valve', trade: 'irrigation', category: 'Valves', name: 'Irrigation Valve (1")', description: '1" electric irrigation zone valve', unit: 'each', prices: { economy: 12, standard: 22, premium: 35 }, brands: { economy: 'Orbit', standard: 'Rain Bird CP/DV', premium: 'Hunter PGV' } },
  { id: 'irrigation-controller', trade: 'irrigation', category: 'Controllers', name: 'Sprinkler Timer/Controller', description: 'Irrigation controller', unit: 'each', prices: { economy: 40, standard: 90, premium: 200 }, brands: { economy: 'Orbit B-Hyve 4-Zone', standard: 'Rain Bird ESP-TM2 6-Zone', premium: 'Rachio 3 Smart 8-Zone' } },
  { id: 'drip-tubing', trade: 'irrigation', category: 'Drip', name: 'Drip Tubing (1/2" x 100ft)', description: '1/2" drip irrigation tubing', unit: 'roll', prices: { economy: 12, standard: 18, premium: 28 }, brands: { economy: 'DIG', standard: 'Rain Bird', premium: 'Netafim' } },
  { id: 'valve-box', trade: 'irrigation', category: 'Accessories', name: 'Valve Box (Standard)', description: 'Rectangular valve box with cover', unit: 'each', prices: { economy: 8, standard: 14, premium: 22 }, brands: { economy: 'NDS', standard: 'Rain Bird VB', premium: 'Carson Industries' } },
];

// ============================================================
// PRESSURE WASHING MATERIALS
// ============================================================
const PRESSURE_WASHING_MATERIALS: Material[] = [
  { id: 'pw-detergent', trade: 'pressure_washing', category: 'Chemicals', name: 'Pressure Washer Detergent (1 gal)', description: 'All-purpose pressure washer detergent concentrate', unit: 'gallon', prices: { economy: 10, standard: 18, premium: 30 }, brands: { economy: 'Sun Joe', standard: 'Simple Green', premium: 'F9 Groundskeeper' } },
  { id: 'pw-bleach', trade: 'pressure_washing', category: 'Chemicals', name: 'Sodium Hypochlorite (12.5%)', description: 'Professional-grade bleach for soft wash, 5 gal', unit: 'bucket', prices: { economy: 18, standard: 25, premium: 35 }, brands: { economy: 'Pool Chlorine', standard: 'SH 12.5%', premium: 'Southside Equipment SH' } },
  { id: 'pw-surfactant', trade: 'pressure_washing', category: 'Chemicals', name: 'Surfactant / Soap', description: 'Surfactant for soft wash cling, 1 gal', unit: 'gallon', prices: { economy: 15, standard: 28, premium: 45 }, brands: { economy: 'Gain Dish Soap', standard: 'Elemonator', premium: 'Pressure Tek Eliminator' } },
  { id: 'pw-surface-cleaner', trade: 'pressure_washing', category: 'Equipment', name: 'Surface Cleaner Attachment', description: 'Flat surface cleaner for driveways/patios', unit: 'each', prices: { economy: 45, standard: 120, premium: 250 }, brands: { economy: 'Tool Daily 15"', standard: 'Simpson 15"', premium: 'Whisper Wash Classic 19"' } },
  { id: 'pw-tips', trade: 'pressure_washing', category: 'Equipment', name: 'Spray Tips (5-pack)', description: 'Quick-connect nozzle tip set (0°/15°/25°/40°/65°)', unit: 'pack', prices: { economy: 10, standard: 18, premium: 30 }, brands: { economy: 'Tool Daily', standard: 'Simpson', premium: 'General Pump' } },
];

// ============================================================
// INSULATION MATERIALS
// ============================================================
const INSULATION_MATERIALS: Material[] = [
  { id: 'insulation-batt-r13', trade: 'insulation', category: 'Batt', name: 'Fiberglass Batt R-13 (3.5")', description: 'R-13 faced fiberglass batt for 2x4 walls', unit: 'bag', prices: { economy: 35, standard: 50, premium: 70 }, coveragePerUnit: 106, coverageUnit: 'sq_ft', brands: { economy: 'Johns Manville', standard: 'Owens Corning EcoTouch', premium: 'CertainTeed Sustainable' } },
  { id: 'insulation-batt-r19', trade: 'insulation', category: 'Batt', name: 'Fiberglass Batt R-19 (6.25")', description: 'R-19 faced fiberglass batt for 2x6 walls/floors', unit: 'bag', prices: { economy: 45, standard: 60, premium: 80 }, coveragePerUnit: 75, coverageUnit: 'sq_ft', brands: { economy: 'Johns Manville', standard: 'Owens Corning EcoTouch', premium: 'CertainTeed Sustainable' } },
  { id: 'insulation-batt-r30', trade: 'insulation', category: 'Batt', name: 'Fiberglass Batt R-30 (9.5")', description: 'R-30 unfaced batt for attic floors', unit: 'bag', prices: { economy: 50, standard: 65, premium: 85 }, coveragePerUnit: 58, coverageUnit: 'sq_ft', brands: { economy: 'Johns Manville', standard: 'Owens Corning EcoTouch', premium: 'CertainTeed Sustainable' } },
  { id: 'insulation-blown', trade: 'insulation', category: 'Blown-In', name: 'Blown-In Cellulose (19 lb)', description: 'Cellulose blown-in insulation bag', unit: 'bag', prices: { economy: 10, standard: 14, premium: 20 }, coveragePerUnit: 40, coverageUnit: 'sq_ft at R-30', brands: { economy: 'GreenFiber', standard: 'Applegate Cellulose', premium: 'Nu-Wool Premium' } },
  { id: 'insulation-foam-board', trade: 'insulation', category: 'Rigid', name: 'Foam Board (4x8, 1" R-5)', description: '1" extruded polystyrene foam board', unit: 'sheet', prices: { economy: 18, standard: 28, premium: 40 }, coveragePerUnit: 32, coverageUnit: 'sq_ft', brands: { economy: 'Insulfoam', standard: 'Owens Corning Foamular 150', premium: 'Dow Thermax' } },
  { id: 'vapor-barrier', trade: 'insulation', category: 'Accessories', name: 'Vapor Barrier (6 mil, 10x100)', description: '6 mil polyethylene sheeting', unit: 'roll', prices: { economy: 28, standard: 40, premium: 60 }, coveragePerUnit: 1000, coverageUnit: 'sq_ft', brands: { economy: 'HDX Poly', standard: 'Husky Contractor', premium: 'Stego Wrap' } },
];

// ============================================================
// SIDING MATERIALS
// ============================================================
const SIDING_MATERIALS: Material[] = [
  { id: 'siding-vinyl', trade: 'siding', category: 'Siding', name: 'Vinyl Siding Panel', description: 'Double 4" vinyl siding panel', unit: 'sq_ft', prices: { economy: 1.50, standard: 3, premium: 5 }, brands: { economy: 'Georgia-Pacific Vinyl', standard: 'CertainTeed Monogram', premium: 'CertainTeed Cedar Impressions' } },
  { id: 'siding-fiber-cement', trade: 'siding', category: 'Siding', name: 'Fiber Cement Lap Siding', description: 'HardiePlank or equivalent, per sq ft', unit: 'sq_ft', prices: { economy: 2, standard: 3.50, premium: 5.50 }, brands: { economy: 'Allura', standard: 'James Hardie HardiePlank', premium: 'James Hardie Artisan' } },
  { id: 'house-wrap', trade: 'siding', category: 'Wrap', name: 'House Wrap (9x150)', description: 'Weather-resistant barrier', unit: 'roll', prices: { economy: 80, standard: 130, premium: 200 }, coveragePerUnit: 1350, coverageUnit: 'sq_ft', brands: { economy: 'Barricade', standard: 'Tyvek HomeWrap', premium: 'Tyvek DrainWrap' } },
  { id: 'siding-trim', trade: 'siding', category: 'Trim', name: 'PVC Trim Board (1x4x8)', description: 'Cellular PVC trim board, rot-proof', unit: 'each', prices: { economy: 8, standard: 14, premium: 22 }, brands: { economy: 'Versatex', standard: 'Royal Building Products', premium: 'AZEK Trim' } },
  { id: 'siding-nails', trade: 'siding', category: 'Fasteners', name: 'Siding Nails (1 lb)', description: 'Ring-shank stainless or galvanized siding nails', unit: 'box', prices: { economy: 6, standard: 10, premium: 16 }, brands: { economy: 'Grip-Rite Galv', standard: 'Maze Ring-Shank', premium: 'Maze Stainless' } },
  { id: 'siding-jchannel', trade: 'siding', category: 'Trim', name: 'J-Channel (12ft)', description: 'Vinyl J-channel for window/door trim', unit: 'each', prices: { economy: 4, standard: 7, premium: 12 }, brands: { economy: 'Generic Vinyl', standard: 'CertainTeed', premium: 'Royal Building Products' } },
];

// ============================================================
// TREE SERVICE MATERIALS
// ============================================================
const TREE_SERVICE_MATERIALS: Material[] = [
  { id: 'chainsaw-chain', trade: 'tree_service', category: 'Equipment', name: 'Chainsaw Chain', description: 'Replacement chainsaw chain (16-20")', unit: 'each', prices: { economy: 12, standard: 22, premium: 35 }, brands: { economy: 'Oregon S-Series', standard: 'Oregon AdvanceCut', premium: 'Stihl Oilomatic' } },
  { id: 'chainsaw-bar-oil', trade: 'tree_service', category: 'Supplies', name: 'Bar & Chain Oil (1 gal)', description: 'Chainsaw bar and chain lubricant', unit: 'gallon', prices: { economy: 10, standard: 16, premium: 24 }, brands: { economy: 'Poulan Pro', standard: 'Husqvarna', premium: 'Stihl BioPlus' } },
  { id: 'stump-grinder-rental', trade: 'tree_service', category: 'Equipment Rental', name: 'Stump Grinder Rental (day)', description: 'Stump grinder machine rental, full day', unit: 'each', prices: { economy: 200, standard: 300, premium: 450 }, brands: { economy: 'Home Depot Rental', standard: 'Sunbelt Rentals', premium: 'Pro Unit (self-propelled)' } },
  { id: 'wood-chipper-rental', trade: 'tree_service', category: 'Equipment Rental', name: 'Wood Chipper Rental (day)', description: 'Brush chipper rental, full day', unit: 'each', prices: { economy: 250, standard: 400, premium: 600 }, brands: { economy: 'Home Depot 6" Chipper', standard: 'Sunbelt 9" Chipper', premium: 'Vermeer BC700XL' } },
  { id: 'tree-wound-seal', trade: 'tree_service', category: 'Supplies', name: 'Tree Wound Sealer', description: 'Pruning sealer for large cuts', unit: 'each', prices: { economy: 6, standard: 10, premium: 16 }, brands: { economy: 'Spectracide Pruning Seal', standard: 'Bonide Tree Wound', premium: 'Tanglefoot Tree Wound' } },
];

// ============================================================
// SOLAR INSTALLATION MATERIALS
// ============================================================
const SOLAR_MATERIALS: Material[] = [
  { id: 'solar-panel', trade: 'solar', category: 'Panels', name: 'Solar Panel (400W)', description: '400W monocrystalline solar panel', unit: 'each', prices: { economy: 200, standard: 300, premium: 450 }, brands: { economy: 'Rich Solar', standard: 'Canadian Solar HiKu', premium: 'LG NeON / REC Alpha' } },
  { id: 'solar-inverter-string', trade: 'solar', category: 'Inverters', name: 'String Inverter', description: 'Grid-tied string inverter 5-7kW', unit: 'each', prices: { economy: 800, standard: 1300, premium: 2000 }, brands: { economy: 'Growatt', standard: 'SolarEdge SE5000H', premium: 'Enphase IQ8+ (micro, per panel)' } },
  { id: 'solar-racking', trade: 'solar', category: 'Mounting', name: 'Roof Racking Kit (per panel)', description: 'Mounting rails, clamps, and flashing per panel', unit: 'each', prices: { economy: 40, standard: 65, premium: 100 }, brands: { economy: 'Renogy', standard: 'IronRidge XR100', premium: 'Unirac SolarMount' } },
  { id: 'solar-wire', trade: 'solar', category: 'Wiring', name: 'Solar Wire 10 AWG (100ft)', description: 'PV wire, UV resistant, per 100ft', unit: 'roll', prices: { economy: 45, standard: 65, premium: 90 }, brands: { economy: 'WindyNation', standard: 'Renogy PV Wire', premium: 'Southwire PV Wire' } },
  { id: 'solar-disconnect', trade: 'solar', category: 'Electrical', name: 'AC Disconnect Box', description: 'Fused AC disconnect for solar', unit: 'each', prices: { economy: 25, standard: 40, premium: 60 }, brands: { economy: 'Siemens', standard: 'Eaton', premium: 'Square D' } },
];

// ============================================================
// GARAGE DOOR MATERIALS
// ============================================================
const GARAGE_DOOR_MATERIALS: Material[] = [
  { id: 'garage-door-single', trade: 'garage_door', category: 'Doors', name: 'Garage Door (Single 8x7)', description: 'Single car garage door 8x7, non-insulated or insulated', unit: 'each', prices: { economy: 400, standard: 800, premium: 1500 }, brands: { economy: 'Clopay Classic', standard: 'Clopay Gallery', premium: 'Clopay Canyon Ridge / Wayne Dalton' } },
  { id: 'garage-door-double', trade: 'garage_door', category: 'Doors', name: 'Garage Door (Double 16x7)', description: 'Double/two-car garage door 16x7', unit: 'each', prices: { economy: 700, standard: 1200, premium: 2500 }, brands: { economy: 'Clopay Value Plus', standard: 'Clopay Gallery', premium: 'Clopay Coachman / Avante' } },
  { id: 'garage-opener', trade: 'garage_door', category: 'Openers', name: 'Garage Door Opener', description: 'Belt or chain drive garage door opener', unit: 'each', prices: { economy: 180, standard: 280, premium: 450 }, brands: { economy: 'Chamberlain Chain Drive', standard: 'Chamberlain Belt Drive', premium: 'LiftMaster 8500W / myQ' } },
  { id: 'garage-spring-torsion', trade: 'garage_door', category: 'Springs', name: 'Torsion Spring (pair)', description: 'Torsion spring set for standard door', unit: 'pair', prices: { economy: 40, standard: 65, premium: 100 }, brands: { economy: 'Generic 25K Cycle', standard: 'DASMA Rated 30K', premium: 'Premium 50K+ Cycle' } },
  { id: 'garage-rollers', trade: 'garage_door', category: 'Hardware', name: 'Garage Door Rollers (10-pack)', description: 'Nylon or steel garage door rollers', unit: 'pack', prices: { economy: 15, standard: 30, premium: 50 }, brands: { economy: 'Steel Rollers', standard: 'Nylon 13-Ball', premium: 'Sealed Bearing Nylon' } },
  { id: 'garage-weatherstrip', trade: 'garage_door', category: 'Weatherproofing', name: 'Bottom Seal (16ft)', description: 'Garage door bottom weather seal', unit: 'each', prices: { economy: 15, standard: 25, premium: 40 }, brands: { economy: 'M-D Building Products', standard: 'Clopay Seal', premium: 'Auto Care Products Park Smart' } },
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
  ...LAWN_CARE_MATERIALS,
  ...POOL_SERVICE_MATERIALS,
  ...HVAC_MATERIALS,
  ...ROOFING_MATERIALS,
  ...FENCING_MATERIALS,
  ...CONCRETE_MATERIALS,
  ...CARPENTRY_MATERIALS,
  ...IRRIGATION_MATERIALS,
  ...PRESSURE_WASHING_MATERIALS,
  ...INSULATION_MATERIALS,
  ...SIDING_MATERIALS,
  ...TREE_SERVICE_MATERIALS,
  ...SOLAR_MATERIALS,
  ...GARAGE_DOOR_MATERIALS,
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
