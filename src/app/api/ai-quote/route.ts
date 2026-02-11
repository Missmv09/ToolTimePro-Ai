import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Keyword-based service catalog used for matching descriptions to services.
// Each entry defines a keyword trigger, suggested service details, a market
// price range, upsell opportunities, and a human-readable reason.
// ---------------------------------------------------------------------------

interface ServiceMatch {
  keywords: string[];
  name: string;
  description: string;
  price: number;
  unit: 'each' | 'hour' | 'sqft' | 'linear_ft' | 'cubic_yard';
  quantity: number;
  marketRange: { min: number; max: number };
  reason: string;
  upsells: { name: string; description: string; price: number; value: string }[];
}

const SERVICE_CATALOG: ServiceMatch[] = [
  {
    keywords: ['lawn', 'mow', 'mowing', 'grass', 'turf'],
    name: 'Lawn Mowing',
    description: 'Professional lawn mowing and edging',
    price: 45,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 35, max: 65 },
    reason: 'Standard residential lawn mowing rate for average-sized yard',
    upsells: [
      { name: 'Lawn Fertilization', description: 'Seasonal fertilizer application for a healthier lawn', price: 60, value: 'Promotes thick, green growth' },
      { name: 'Weed Treatment', description: 'Pre-emergent and post-emergent weed control', price: 45, value: 'Reduces weeds by up to 90%' },
    ],
  },
  {
    keywords: ['hedge', 'hedges', 'shrub', 'shrubs', 'bush', 'bushes'],
    name: 'Hedge Trimming',
    description: 'Hedge and shrub trimming and shaping',
    price: 75,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 55, max: 120 },
    reason: 'Typical price for residential hedge row trimming',
    upsells: [
      { name: 'Shrub Fertilization', description: 'Nutrient application for healthy shrub growth', price: 35, value: 'Extends trimming interval' },
    ],
  },
  {
    keywords: ['tree', 'trees', 'tree trim', 'tree trimming', 'prune', 'pruning', 'branch', 'branches', 'limb'],
    name: 'Tree Trimming',
    description: 'Tree pruning and dead branch removal',
    price: 150,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 100, max: 350 },
    reason: 'Price varies by tree height and complexity; this covers medium trees',
    upsells: [
      { name: 'Stump Grinding', description: 'Grind existing tree stumps below grade', price: 125, value: 'Eliminates tripping hazards and improves curb appeal' },
      { name: 'Deep Root Feeding', description: 'Subsurface nutrient injection for tree health', price: 85, value: 'Promotes strong root systems' },
    ],
  },
  {
    keywords: ['leaf', 'leaves', 'cleanup', 'clean up', 'clean-up', 'fall', 'debris'],
    name: 'Leaf & Debris Cleanup',
    description: 'Full property leaf removal and debris cleanup',
    price: 85,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 65, max: 150 },
    reason: 'Standard residential cleanup with hauling',
    upsells: [
      { name: 'Gutter Cleaning', description: 'Remove leaves and debris from gutters', price: 95, value: 'Prevents water damage' },
    ],
  },
  {
    keywords: ['gutter', 'gutters'],
    name: 'Gutter Cleaning',
    description: 'Full gutter cleanout and downspout flush',
    price: 95,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 75, max: 150 },
    reason: 'Average single-story home gutter cleaning rate',
    upsells: [
      { name: 'Gutter Guards', description: 'Install mesh gutter guards to prevent future buildup', price: 450, value: 'Reduces maintenance by 80%' },
    ],
  },
  {
    keywords: ['pool', 'swimming', 'pool service', 'pool cleaning'],
    name: 'Pool Cleaning',
    description: 'Full pool cleaning, chemical balancing, and skimming',
    price: 95,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 80, max: 140 },
    reason: 'Standard weekly pool service visit',
    upsells: [
      { name: 'Pool Filter Service', description: 'Deep clean or replace pool filter cartridge', price: 75, value: 'Improves water clarity and pump efficiency' },
      { name: 'Acid Wash', description: 'Pool surface acid wash for stain removal', price: 350, value: 'Restores pool surface appearance' },
    ],
  },
  {
    keywords: ['window', 'windows', 'glass'],
    name: 'Window Cleaning',
    description: 'Interior and exterior window cleaning',
    price: 8,
    unit: 'each',
    quantity: 10,
    marketRange: { min: 5, max: 12 },
    reason: 'Per-window rate; quantity estimated at 10 windows',
    upsells: [
      { name: 'Screen Cleaning', description: 'Remove, clean, and reinstall window screens', price: 3, value: 'Complete clean look inside and out' },
    ],
  },
  {
    keywords: ['paint', 'painting', 'repaint', 'walls', 'exterior paint', 'interior paint', 'trim work', 'baseboard', 'molding', 'crown molding', 'cabinet paint', 'ceiling paint', 'drywall'],
    name: 'Painting',
    description: 'Surface preparation and painting',
    price: 3,
    unit: 'sqft',
    quantity: 200,
    marketRange: { min: 2, max: 5 },
    reason: 'Per sq ft rate; area estimated at 200 sqft',
    upsells: [
      { name: 'Primer Application', description: 'Apply primer coat before painting', price: 1, value: 'Better coverage and longer-lasting finish' },
      { name: 'Power Washing', description: 'Power wash surfaces before painting', price: 150, value: 'Paint adheres better to clean surfaces' },
    ],
  },
  {
    keywords: ['pressure wash', 'power wash', 'powerwash', 'pressure'],
    name: 'Pressure Washing',
    description: 'Pressure washing of driveways, walkways, and patios',
    price: 175,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 125, max: 300 },
    reason: 'Standard residential driveway and patio pressure wash',
    upsells: [
      { name: 'Sealing', description: 'Apply protective sealant after pressure washing', price: 200, value: 'Extends the clean look for years' },
    ],
  },
  {
    keywords: ['mulch', 'mulching'],
    name: 'Mulch Installation',
    description: 'Mulch delivery and installation in beds',
    price: 65,
    unit: 'cubic_yard',
    quantity: 3,
    marketRange: { min: 50, max: 85 },
    reason: 'Per cubic yard price including material and labor',
    upsells: [
      { name: 'Bed Edging', description: 'Clean-cut landscape bed edging', price: 2, value: 'Creates a polished, defined look' },
      { name: 'Weed Barrier', description: 'Install weed barrier fabric under mulch', price: 0.5, value: 'Dramatically reduces weed growth' },
    ],
  },
  {
    keywords: ['irrigation', 'sprinkler', 'sprinklers', 'drip'],
    name: 'Irrigation System Service',
    description: 'Inspection, adjustment, and repair of irrigation system',
    price: 95,
    unit: 'hour',
    quantity: 2,
    marketRange: { min: 75, max: 125 },
    reason: 'Hourly rate for irrigation technician; 2 hours estimated',
    upsells: [
      { name: 'Smart Controller', description: 'Install WiFi-enabled smart irrigation controller', price: 250, value: 'Saves up to 30% on water bills' },
    ],
  },
  {
    keywords: ['fence', 'fencing', 'gate'],
    name: 'Fence Repair / Install',
    description: 'Fence repair or new section installation',
    price: 30,
    unit: 'linear_ft',
    quantity: 20,
    marketRange: { min: 20, max: 50 },
    reason: 'Per linear foot for standard wood fence; 20 ft estimated',
    upsells: [
      { name: 'Fence Staining', description: 'Apply protective stain to fence', price: 5, value: 'Extends fence lifespan by 5+ years' },
    ],
  },
  {
    keywords: ['electric', 'electrical', 'wiring', 'outlet', 'light', 'lighting', 'fixture'],
    name: 'Electrical Work',
    description: 'General electrical repair and installation',
    price: 95,
    unit: 'hour',
    quantity: 2,
    marketRange: { min: 80, max: 130 },
    reason: 'Standard electrician hourly rate; 2 hours estimated',
    upsells: [
      { name: 'Landscape Lighting', description: 'Install low-voltage landscape lighting', price: 350, value: 'Enhances curb appeal and security' },
    ],
  },
  {
    keywords: ['plumb', 'plumbing', 'pipe', 'drain', 'faucet', 'toilet', 'leak'],
    name: 'Plumbing Service',
    description: 'General plumbing repair and maintenance',
    price: 110,
    unit: 'hour',
    quantity: 1,
    marketRange: { min: 85, max: 150 },
    reason: 'Standard plumbing service call rate',
    upsells: [
      { name: 'Drain Camera Inspection', description: 'Video inspection of drain lines', price: 200, value: 'Identifies hidden problems before they escalate' },
    ],
  },
  {
    keywords: ['sod', 'resod', 're-sod'],
    name: 'Sod Installation',
    description: 'Remove old turf and install fresh sod',
    price: 2,
    unit: 'sqft',
    quantity: 500,
    marketRange: { min: 1.5, max: 3 },
    reason: 'Per sq ft for sod including prep; 500 sqft estimated',
    upsells: [
      { name: 'Soil Amendment', description: 'Add topsoil and nutrients before sodding', price: 150, value: 'Ensures rapid root establishment' },
    ],
  },
  {
    keywords: ['aerat', 'aeration', 'core aeration'],
    name: 'Lawn Aeration',
    description: 'Core aeration to reduce compaction and improve growth',
    price: 120,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 80, max: 175 },
    reason: 'Standard residential lawn aeration service',
    upsells: [
      { name: 'Overseeding', description: 'Spread premium grass seed after aeration', price: 75, value: 'Fills thin spots for a lush lawn' },
    ],
  },
  {
    keywords: ['deck', 'patio', 'porch'],
    name: 'Deck / Patio Service',
    description: 'Deck or patio cleaning, staining, or minor repair',
    price: 250,
    unit: 'each',
    quantity: 1,
    marketRange: { min: 150, max: 400 },
    reason: 'Average deck/patio service for a standard residential area',
    upsells: [
      { name: 'Deck Sealing', description: 'Apply waterproof sealant to deck surface', price: 200, value: 'Protects against weather damage' },
    ],
  },
  {
    keywords: ['repair', 'fix', 'handyman', 'general'],
    name: 'General Repair',
    description: 'General handyman repair work',
    price: 85,
    unit: 'hour',
    quantity: 1,
    marketRange: { min: 65, max: 110 },
    reason: 'Standard handyman hourly rate',
    upsells: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchServices(description: string): ServiceMatch[] {
  const lower = description.toLowerCase();
  const matched: ServiceMatch[] = [];
  const usedNames = new Set<string>();

  for (const service of SERVICE_CATALOG) {
    if (usedNames.has(service.name)) continue;
    for (const keyword of service.keywords) {
      if (lower.includes(keyword)) {
        matched.push(service);
        usedNames.add(service.name);
        break;
      }
    }
  }

  return matched;
}

function extractQuantityHint(description: string, serviceName: string): number | null {
  // Try to find numbers near the service keywords
  const patterns = [
    /(\d+)\s*(?:acre|acres)/i,
    /(\d+)\s*(?:tree|trees)/i,
    /(\d+)\s*(?:window|windows)/i,
    /(\d+)\s*(?:feet|ft|foot|linear)/i,
    /(\d+)\s*(?:sq\s*ft|sqft|square\s*feet)/i,
    /(\d+)\s*(?:yard|yards|cubic)/i,
    /(\d+)\s*(?:hour|hours|hr|hrs)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  // Check for qualitative hints
  if (/half[- ]acre/i.test(description)) return serviceName.includes('Lawn') ? 1 : null;
  if (/large|big/i.test(description)) return null; // Keep default but could bump later
  if (/small|tiny/i.test(description)) return null;

  return null;
}

function buildTiers(services: ServiceMatch[], subtotal: number) {
  return {
    good: {
      name: 'Good',
      description: 'Essential services only',
      services: services.map(s => s.name),
      multiplier: 1.0,
      extras: ['Core services included', 'Standard scheduling', 'Basic cleanup'],
    },
    better: {
      name: 'Better',
      description: 'Standard service with extras',
      services: services.map(s => s.name),
      multiplier: 1.35,
      extras: [
        'Everything in Good',
        'Priority scheduling',
        'Detailed cleanup and hauling',
        'Post-service yard inspection',
      ],
    },
    best: {
      name: 'Best',
      description: 'Premium full-service package',
      services: services.map(s => s.name),
      multiplier: 1.7,
      extras: [
        'Everything in Better',
        'Same-day / next-day availability',
        'Before & after photos sent to you',
        'Satisfaction guarantee with free follow-up',
        'Seasonal maintenance recommendations',
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      jobDescription = '',
      inputType = 'text',
      businessType = '',
      customerAddress = '',
      generateTiers = false,
      existingItems = [],
    } = body;

    if (!jobDescription || typeof jobDescription !== 'string') {
      return NextResponse.json(
        { error: 'jobDescription is required' },
        { status: 400 },
      );
    }

    // Match services from the description
    const matched = matchServices(jobDescription);

    // If nothing matched, provide a sensible fallback
    if (matched.length === 0) {
      const fallbackServices = [
        {
          name: 'Custom Service',
          description: jobDescription.slice(0, 120),
          quantity: 1,
          unit: 'each' as const,
          price: 85,
          marketRange: { min: 65, max: 150 },
          reason: 'No exact match found. Price set to an average service call rate -- please adjust as needed.',
        },
      ];

      return NextResponse.json({
        services: fallbackServices,
        upsells: [],
        tiers: generateTiers
          ? buildTiers([], 85)
          : undefined,
        notes: 'We could not auto-detect specific services from the description. A generic line item has been added -- feel free to edit the description and price.',
        warnings: ['Tip: Include keywords like "lawn mowing", "tree trimming", or "pool cleaning" for more accurate AI suggestions.'],
      });
    }

    // Build service response objects
    const services = matched.map((m) => {
      const qtyHint = extractQuantityHint(jobDescription, m.name);
      const quantity = qtyHint ?? m.quantity;
      return {
        name: m.name,
        description: m.description,
        quantity,
        unit: m.unit,
        price: m.price,
        marketRange: m.marketRange,
        reason: m.reason,
      };
    });

    // Collect unique upsells from matched services
    const seenUpsells = new Set<string>();
    const upsells: { name: string; description: string; price: number; value: string }[] = [];
    for (const m of matched) {
      for (const u of m.upsells) {
        if (!seenUpsells.has(u.name)) {
          seenUpsells.add(u.name);
          upsells.push(u);
        }
      }
    }
    // Limit to top 4 upsells
    const topUpsells = upsells.slice(0, 4);

    // Calculate subtotal for tier generation
    const subtotal = services.reduce((sum, s) => sum + s.quantity * s.price, 0);

    // Notes and warnings
    const notes = services.length > 1
      ? `We identified ${services.length} services from your description. Review each line item and adjust quantities or prices to match the specific job requirements.`
      : `We identified 1 service from your description. Adjust the quantity and price to match the specific job.`;

    const warnings: string[] = [];
    if (customerAddress) {
      warnings.push('Pricing does not yet factor in travel distance. Consider adding a trip charge for far locations.');
    }

    // Build response
    const responseData: Record<string, unknown> = {
      services,
      upsells: topUpsells,
      notes,
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    if (generateTiers) {
      responseData.tiers = buildTiers(matched, subtotal);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('ai-quote API error:', error);
    return NextResponse.json(
      { error: 'Failed to process quote request' },
      { status: 500 },
    );
  }
}
