// Material Estimator Calculation Engine
// Takes job specs from the UI wizard and returns complete material lists with costs

import { getMaterialById, getMaterialsByTrade, type PriceTier, type EstimateItem, type EstimateResult, type EstimatorQuestion, type TradeEstimator } from './materials-database';

// ============================================================
// PAINTING ESTIMATOR
// ============================================================
function calculatePainting(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const roomLength = Number(answers.roomLength) || 12;
  const roomWidth = Number(answers.roomWidth) || 12;
  const roomHeight = Number(answers.ceilingHeight) || 8;
  const finish = (answers.finish as string) || 'eggshell';
  const coats = Number(answers.coats) || 2;
  const includePrimer = answers.includePrimer !== false;
  const includeCeiling = answers.includeCeiling === true;
  const includeTrim = answers.includeTrim === true;
  const doors = Number(answers.doors) || 1;
  const windows = Number(answers.windows) || 2;
  const rooms = Number(answers.rooms) || 1;
  const isExterior = answers.isExterior === true;

  // Calculate wall area
  const perimeter = 2 * (roomLength + roomWidth);
  const wallArea = perimeter * roomHeight * rooms;
  const doorArea = doors * 21 * rooms; // ~21 sq ft per door
  const windowArea = windows * 15 * rooms; // ~15 sq ft per window
  const paintableWallArea = Math.max(0, wallArea - doorArea - windowArea);
  const ceilingArea = includeCeiling ? (roomLength * roomWidth * rooms) : 0;
  const trimLinearFt = includeTrim ? (perimeter * rooms) : 0;
  const trimArea = trimLinearFt * 0.5; // ~6 inches wide

  const totalPaintArea = (paintableWallArea + ceilingArea) * coats;
  const totalTrimArea = trimArea * coats;

  const items: EstimateItem[] = [];

  // Paint selection based on finish
  const paintMap: Record<string, string> = {
    flat: 'paint-interior-flat',
    eggshell: 'paint-interior-eggshell',
    satin: 'paint-interior-satin',
    semigloss: 'paint-interior-semigloss',
    gloss: 'paint-interior-semigloss', // closest match
  };
  const paintId = isExterior ? 'paint-exterior' : (paintMap[finish] || 'paint-interior-eggshell');
  const paint = getMaterialById(paintId);

  if (paint) {
    const coverage = paint.coveragePerUnit || 400;
    const gallons = Math.ceil(totalPaintArea / coverage);
    items.push({
      materialId: paint.id,
      name: paint.name,
      description: `${finish.charAt(0).toUpperCase() + finish.slice(1)} finish, ${coats} coat${coats > 1 ? 's' : ''}`,
      quantity: gallons,
      unit: 'gallon',
      unitPrice: paint.prices[tier],
      total: gallons * paint.prices[tier],
      brand: paint.brands[tier],
      tier,
    });
  }

  // Trim paint (always semi-gloss)
  if (includeTrim && totalTrimArea > 0) {
    const trimPaint = getMaterialById('paint-interior-semigloss');
    if (trimPaint) {
      const trimGallons = Math.ceil(totalTrimArea / (trimPaint.coveragePerUnit || 400));
      items.push({
        materialId: trimPaint.id,
        name: 'Trim Paint (Semi-Gloss)',
        description: 'Semi-gloss for baseboards, crown molding, and trim',
        quantity: Math.max(1, trimGallons),
        unit: 'gallon',
        unitPrice: trimPaint.prices[tier],
        total: Math.max(1, trimGallons) * trimPaint.prices[tier],
        brand: trimPaint.brands[tier],
        tier,
      });
    }
  }

  // Primer
  if (includePrimer) {
    const primer = getMaterialById('primer-standard');
    if (primer) {
      const primerArea = paintableWallArea + ceilingArea;
      const primerGallons = Math.ceil(primerArea / (primer.coveragePerUnit || 400));
      items.push({
        materialId: primer.id,
        name: primer.name,
        description: 'One coat primer for better adhesion and coverage',
        quantity: primerGallons,
        unit: 'gallon',
        unitPrice: primer.prices[tier],
        total: primerGallons * primer.prices[tier],
        brand: primer.brands[tier],
        tier,
      });
    }
  }

  // Supplies
  const tapeRolls = Math.ceil(perimeter * rooms / 60); // 60 yards per roll
  addItem(items, 'tape-painters', tapeRolls, tier);

  const dropCloths = Math.ceil(rooms / 2);
  addItem(items, tier === 'premium' ? 'dropcloth-canvas' : 'dropcloth-plastic', dropCloths, tier);

  const rollerCovers = Math.ceil(rooms / 2);
  addItem(items, 'roller-cover', rollerCovers, tier);
  addItem(items, 'roller-frame', 1, tier);
  addItem(items, 'brush-angle', Math.ceil(rooms / 3) || 1, tier);
  addItem(items, 'paint-tray', 1, tier);

  // Prep supplies
  addItem(items, 'caulk-paintable', Math.ceil(rooms / 2), tier);
  addItem(items, 'spackle', 1, tier);
  addItem(items, 'sandpaper-pack', 1, tier);

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);

  // Labor estimate: ~200 sq ft per hour for an experienced painter
  const totalArea = paintableWallArea + ceilingArea + trimArea;
  const laborHours = Math.ceil(totalArea / 150) * coats + (includePrimer ? Math.ceil(totalArea / 200) : 0);
  const laborRate = tier === 'premium' ? 65 : tier === 'standard' ? 50 : 40;
  const laborEstimate = laborHours * laborRate;

  const notes: string[] = [];
  if (coats >= 3) notes.push('3+ coats recommended for dramatic color changes (dark to light).');
  if (isExterior) notes.push('Exterior paint requires good weather: above 50°F, no rain for 24 hours.');
  if (includePrimer) notes.push('Primer recommended for: new drywall, stains, color changes, or glossy surfaces.');

  return { items, materialTotal, laborEstimate, laborHours, grandTotal: materialTotal + laborEstimate, notes };
}

// ============================================================
// PLUMBING ESTIMATOR
// ============================================================
function calculatePlumbing(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const jobType = (answers.jobType as string) || 'faucet';

  if (jobType === 'toilet') {
    addItem(items, 'toilet-standard', Number(answers.quantity) || 1, tier);
    addItem(items, 'wax-ring', Number(answers.quantity) || 1, tier);
    addItem(items, 'supply-line', Number(answers.quantity) || 1, tier);
    addItem(items, 'shutoff-valve', (Number(answers.quantity) || 1), tier);
  } else if (jobType === 'faucet-kitchen') {
    addItem(items, 'faucet-kitchen', Number(answers.quantity) || 1, tier);
    addItem(items, 'supply-line', (Number(answers.quantity) || 1) * 2, tier);
    addItem(items, 'shutoff-valve', (Number(answers.quantity) || 1) * 2, tier);
  } else if (jobType === 'faucet-bath') {
    addItem(items, 'faucet-bath', Number(answers.quantity) || 1, tier);
    addItem(items, 'supply-line', (Number(answers.quantity) || 1) * 2, tier);
  } else if (jobType === 'garbage-disposal') {
    addItem(items, 'garbage-disposal', 1, tier);
  } else if (jobType === 'water-heater') {
    addItem(items, 'water-heater-tank', 1, tier);
    addItem(items, 'supply-line', 2, tier);
    addItem(items, 'shutoff-valve', 2, tier);
  } else if (jobType === 'repipe') {
    const pipeType = (answers.pipeType as string) || 'pex';
    const length = Number(answers.pipeLength) || 50;
    addItem(items, pipeType === 'pex' ? 'pipe-pex' : 'pipe-pvc', length, tier);
    addItem(items, 'shutoff-valve', Math.ceil(length / 20), tier);
  }

  // Add caulk for fixture installs
  if (['toilet', 'faucet-kitchen', 'faucet-bath'].includes(jobType)) {
    addItem(items, 'caulk-silicone' as string, 1, tier, 'handyman');
  }

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);
  const laborHours = jobType === 'water-heater' ? 4 : jobType === 'repipe' ? 8 : jobType === 'toilet' ? 2 : 1.5;
  const laborRate = tier === 'premium' ? 95 : tier === 'standard' ? 75 : 60;

  return {
    items, materialTotal,
    laborEstimate: laborHours * laborRate * (Number(answers.quantity) || 1),
    laborHours: laborHours * (Number(answers.quantity) || 1),
    grandTotal: materialTotal + laborHours * laborRate * (Number(answers.quantity) || 1),
    notes: jobType === 'water-heater' ? ['Permit may be required. Check local codes.', 'Old unit disposal may incur additional fee.'] : [],
  };
}

// ============================================================
// ELECTRICAL ESTIMATOR
// ============================================================
function calculateElectrical(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const jobType = (answers.jobType as string) || 'outlet';

  if (jobType === 'outlet') {
    const qty = Number(answers.quantity) || 1;
    const isGfci = answers.isGfci === true;
    addItem(items, isGfci ? 'outlet-gfci' : 'outlet-standard', qty, tier);
    addItem(items, 'electrical-box', qty, tier);
    addItem(items, 'cover-plate', qty, tier);
    addItem(items, 'wire-12awg', qty * 15, tier); // ~15 ft wire per outlet
  } else if (jobType === 'switch') {
    const qty = Number(answers.quantity) || 1;
    const isDimmer = answers.isDimmer === true;
    addItem(items, isDimmer ? 'switch-dimmer' : 'switch-single', qty, tier);
    addItem(items, 'electrical-box', qty, tier);
    addItem(items, 'cover-plate', qty, tier);
    addItem(items, 'wire-14awg', qty * 15, tier);
  } else if (jobType === 'recessed-lights') {
    const qty = Number(answers.quantity) || 4;
    addItem(items, 'led-recessed', qty, tier);
    addItem(items, 'wire-14awg', qty * 10, tier);
    addItem(items, 'switch-dimmer', 1, tier);
    addItem(items, 'cover-plate', 1, tier);
  } else if (jobType === 'ceiling-fan') {
    const qty = Number(answers.quantity) || 1;
    addItem(items, 'ceiling-fan', qty, tier);
    addItem(items, 'electrical-box', qty, tier); // fan-rated box
  } else if (jobType === 'new-circuit') {
    addItem(items, 'breaker-20a', 1, tier);
    addItem(items, 'wire-12awg', Number(answers.wireLength) || 50, tier);
    addItem(items, 'outlet-standard', Number(answers.outlets) || 2, tier);
    addItem(items, 'electrical-box', Number(answers.outlets) || 2, tier);
    addItem(items, 'cover-plate', Number(answers.outlets) || 2, tier);
  }

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);
  const laborMap: Record<string, number> = {
    outlet: 1, switch: 0.75, 'recessed-lights': 0.75, 'ceiling-fan': 1.5, 'new-circuit': 4,
  };
  const perUnit = laborMap[jobType] || 1;
  const qty = Number(answers.quantity) || (jobType === 'new-circuit' ? 1 : 1);
  const laborHours = perUnit * qty;
  const laborRate = tier === 'premium' ? 95 : tier === 'standard' ? 75 : 60;

  return {
    items, materialTotal,
    laborEstimate: laborHours * laborRate,
    laborHours,
    grandTotal: materialTotal + laborHours * laborRate,
    notes: jobType === 'new-circuit' ? ['Permit typically required for new circuits. Check local codes.'] : [],
  };
}

// ============================================================
// LANDSCAPING ESTIMATOR
// ============================================================
function calculateLandscaping(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const jobType = (answers.jobType as string) || 'mulch';

  if (jobType === 'mulch') {
    const sqft = Number(answers.areaSqFt) || 200;
    const depth = Number(answers.depthInches) || 2;
    const cubicYards = (sqft * (depth / 12)) / 27;
    const useBags = sqft < 100;

    if (useBags) {
      const bags = Math.ceil(sqft / 12);
      addItem(items, 'mulch-bag', bags, tier);
    } else {
      addItem(items, 'mulch-bulk', Math.ceil(cubicYards * 10) / 10, tier);
    }

    if (answers.includeWeedBarrier) {
      const rolls = Math.ceil(sqft / 150);
      addItem(items, 'weed-barrier', rolls, tier);
    }
    if (answers.includeEdging) {
      const edgeFt = Number(answers.edgingFt) || Math.sqrt(sqft) * 4;
      addItem(items, 'edging', Math.ceil(edgeFt), tier);
    }
  } else if (jobType === 'sod') {
    const sqft = Number(answers.areaSqFt) || 500;
    addItem(items, 'sod', Math.ceil(sqft * 1.05), tier); // 5% waste factor
    addItem(items, 'topsoil', Math.ceil((sqft * (1 / 12)) / 27 * 10) / 10, tier); // 1" topsoil
  } else if (jobType === 'pavers') {
    const sqft = Number(answers.areaSqFt) || 100;
    addItem(items, 'pavers', Math.ceil(sqft * 1.1), tier); // 10% waste
    addItem(items, 'gravel', Math.ceil((sqft * (4 / 12)) / 27 * 10) / 10, tier); // 4" gravel base
  }

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);
  const laborMap: Record<string, number> = { mulch: 0.02, sod: 0.015, pavers: 0.05 }; // hours per sq ft
  const sqft = Number(answers.areaSqFt) || 200;
  const laborHours = Math.ceil(sqft * (laborMap[jobType] || 0.02));
  const laborRate = tier === 'premium' ? 55 : tier === 'standard' ? 45 : 35;

  return {
    items, materialTotal,
    laborEstimate: laborHours * laborRate,
    laborHours,
    grandTotal: materialTotal + laborHours * laborRate,
    notes: jobType === 'sod' ? ['Water new sod heavily for first 2 weeks. Best installed in spring or fall.'] : [],
  };
}

// ============================================================
// FLOORING ESTIMATOR
// ============================================================
function calculateFlooring(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const floorType = (answers.floorType as string) || 'lvp';
  const sqft = Number(answers.areaSqFt) || 200;
  const wasteFactor = 1.10; // 10% waste

  if (floorType === 'lvp') {
    addItem(items, 'lvp-flooring', Math.ceil(sqft * wasteFactor), tier);
    const underlaymentRolls = Math.ceil(sqft / 100);
    addItem(items, 'underlayment', underlaymentRolls, tier);
  } else if (floorType === 'laminate') {
    addItem(items, 'laminate-flooring', Math.ceil(sqft * wasteFactor), tier);
    const underlaymentRolls = Math.ceil(sqft / 100);
    addItem(items, 'underlayment', underlaymentRolls, tier);
  } else if (floorType === 'tile') {
    addItem(items, 'tile-ceramic', Math.ceil(sqft * wasteFactor), tier);
    const thinsetBags = Math.ceil(sqft / 75);
    addItem(items, 'thinset-mortar', thinsetBags, tier);
    const groutBags = Math.ceil(sqft / 100);
    addItem(items, 'grout', groutBags, tier);
  }

  // Transition strips
  const transitions = Number(answers.transitions) || 1;
  addItem(items, 'transition-strip', transitions, tier);

  const materialTotal = items.reduce((sum, item) => sum + item.total, 0);
  const laborPerSqFt: Record<string, number> = { lvp: 0.03, laminate: 0.03, tile: 0.06 };
  const laborHours = Math.ceil(sqft * (laborPerSqFt[floorType] || 0.03));
  const laborRate = tier === 'premium' ? 65 : tier === 'standard' ? 50 : 40;

  return {
    items, materialTotal,
    laborEstimate: laborHours * laborRate,
    laborHours,
    grandTotal: materialTotal + laborHours * laborRate,
    notes: floorType === 'lvp' ? ['Acclimate flooring in room for 48 hours before installation.'] : [],
  };
}

// ============================================================
// HELPER: Add material item to list
// ============================================================
function addItem(items: EstimateItem[], materialId: string, quantity: number, tier: PriceTier, tradeFallback?: string): void {
  const material = getMaterialById(materialId);
  if (!material) return;

  items.push({
    materialId: material.id,
    name: material.name,
    description: material.description,
    quantity: Math.max(1, Math.round(quantity * 100) / 100),
    unit: material.unit,
    unitPrice: material.prices[tier],
    total: Math.round(Math.max(1, quantity) * material.prices[tier] * 100) / 100,
    brand: material.brands[tier],
    tier,
  });
}

// ============================================================
// TRADE ESTIMATOR DEFINITIONS (Questions + Calculate)
// ============================================================
export const TRADE_ESTIMATORS: TradeEstimator[] = [
  {
    trade: 'painting',
    name: 'Painting',
    icon: 'Paintbrush',
    description: 'Interior & exterior painting — walls, ceilings, trim',
    questions: [
      { id: 'isExterior', label: 'Is this exterior painting?', type: 'checkbox', defaultValue: false },
      { id: 'rooms', label: 'Number of rooms', type: 'number', defaultValue: 1, unit: 'rooms', required: true },
      { id: 'roomLength', label: 'Room length', type: 'number', defaultValue: 12, unit: 'feet', required: true },
      { id: 'roomWidth', label: 'Room width', type: 'number', defaultValue: 12, unit: 'feet', required: true },
      { id: 'ceilingHeight', label: 'Ceiling height', type: 'number', defaultValue: 8, unit: 'feet' },
      { id: 'finish', label: 'Paint finish', type: 'select', defaultValue: 'eggshell', options: [
        { value: 'flat', label: 'Flat / Matte — hides imperfections, low sheen' },
        { value: 'eggshell', label: 'Eggshell — slight sheen, easy to clean (most popular)' },
        { value: 'satin', label: 'Satin — smooth sheen, great for high-traffic areas' },
        { value: 'semigloss', label: 'Semi-Gloss — shiny, moisture-resistant (kitchens/baths)' },
        { value: 'gloss', label: 'Gloss — highest sheen, very durable (trim/doors)' },
      ]},
      { id: 'coats', label: 'Number of coats', type: 'select', defaultValue: '2', options: [
        { value: '1', label: '1 coat — touch-up or same color refresh' },
        { value: '2', label: '2 coats — standard (recommended)' },
        { value: '3', label: '3 coats — dark to light color change' },
      ]},
      { id: 'includePrimer', label: 'Include primer?', type: 'checkbox', defaultValue: true, helpText: 'Recommended for new drywall, stains, or major color changes' },
      { id: 'includeCeiling', label: 'Paint ceiling too?', type: 'checkbox', defaultValue: false },
      { id: 'includeTrim', label: 'Paint trim/baseboards?', type: 'checkbox', defaultValue: false },
      { id: 'doors', label: 'Number of doors', type: 'number', defaultValue: 1, unit: 'doors' },
      { id: 'windows', label: 'Number of windows', type: 'number', defaultValue: 2, unit: 'windows' },
    ],
    calculate: calculatePainting,
  },
  {
    trade: 'plumbing',
    name: 'Plumbing',
    icon: 'Wrench',
    description: 'Fixture installs, repairs, and repiping',
    questions: [
      { id: 'jobType', label: 'What type of plumbing work?', type: 'select', required: true, options: [
        { value: 'toilet', label: 'Toilet install / replace' },
        { value: 'faucet-kitchen', label: 'Kitchen faucet install / replace' },
        { value: 'faucet-bath', label: 'Bathroom faucet install / replace' },
        { value: 'garbage-disposal', label: 'Garbage disposal install' },
        { value: 'water-heater', label: 'Water heater replacement (tank)' },
        { value: 'repipe', label: 'Repiping (new supply lines)' },
      ]},
      { id: 'quantity', label: 'How many?', type: 'number', defaultValue: 1, showWhen: { field: 'jobType', value: 'toilet' } },
      { id: 'quantity', label: 'How many?', type: 'number', defaultValue: 1, showWhen: { field: 'jobType', value: 'faucet-kitchen' } },
      { id: 'pipeType', label: 'Pipe material', type: 'select', defaultValue: 'pex', showWhen: { field: 'jobType', value: 'repipe' }, options: [
        { value: 'pex', label: 'PEX (flexible, modern — recommended)' },
        { value: 'pvc', label: 'PVC (rigid, for drain lines)' },
      ]},
      { id: 'pipeLength', label: 'Estimated pipe length', type: 'number', defaultValue: 50, unit: 'feet', showWhen: { field: 'jobType', value: 'repipe' } },
    ],
    calculate: calculatePlumbing,
  },
  {
    trade: 'electrical',
    name: 'Electrical',
    icon: 'Zap',
    description: 'Outlets, switches, lighting, and circuits',
    questions: [
      { id: 'jobType', label: 'What type of electrical work?', type: 'select', required: true, options: [
        { value: 'outlet', label: 'Add / replace outlets' },
        { value: 'switch', label: 'Add / replace light switches' },
        { value: 'recessed-lights', label: 'Install recessed (can) lights' },
        { value: 'ceiling-fan', label: 'Install ceiling fan' },
        { value: 'new-circuit', label: 'Add new circuit from panel' },
      ]},
      { id: 'quantity', label: 'How many?', type: 'number', defaultValue: 1, required: true },
      { id: 'isGfci', label: 'GFCI outlets? (required for kitchens, baths, outdoors)', type: 'checkbox', defaultValue: false, showWhen: { field: 'jobType', value: 'outlet' } },
      { id: 'isDimmer', label: 'Dimmer switches?', type: 'checkbox', defaultValue: false, showWhen: { field: 'jobType', value: 'switch' } },
      { id: 'wireLength', label: 'Wire run length (panel to first outlet)', type: 'number', defaultValue: 50, unit: 'feet', showWhen: { field: 'jobType', value: 'new-circuit' } },
      { id: 'outlets', label: 'Outlets on circuit', type: 'number', defaultValue: 2, showWhen: { field: 'jobType', value: 'new-circuit' } },
    ],
    calculate: calculateElectrical,
  },
  {
    trade: 'landscaping',
    name: 'Landscaping',
    icon: 'TreePine',
    description: 'Mulch, sod, pavers, and ground cover',
    questions: [
      { id: 'jobType', label: 'What type of landscaping?', type: 'select', required: true, options: [
        { value: 'mulch', label: 'Mulch install / refresh' },
        { value: 'sod', label: 'Sod installation (new lawn)' },
        { value: 'pavers', label: 'Paver patio / walkway' },
      ]},
      { id: 'areaSqFt', label: 'Area size', type: 'number', required: true, unit: 'sq ft', helpText: 'Length × Width. Not sure? Measure or estimate.' },
      { id: 'depthInches', label: 'Mulch depth', type: 'select', defaultValue: '2', showWhen: { field: 'jobType', value: 'mulch' }, options: [
        { value: '2', label: '2 inches (standard refresh)' },
        { value: '3', label: '3 inches (new bed or heavy coverage)' },
        { value: '4', label: '4 inches (weed suppression)' },
      ]},
      { id: 'includeWeedBarrier', label: 'Include weed barrier fabric?', type: 'checkbox', defaultValue: false, showWhen: { field: 'jobType', value: 'mulch' } },
      { id: 'includeEdging', label: 'Include landscape edging?', type: 'checkbox', defaultValue: false, showWhen: { field: 'jobType', value: 'mulch' } },
      { id: 'edgingFt', label: 'Edging length', type: 'number', unit: 'feet', showWhen: { field: 'includeEdging', value: true } },
    ],
    calculate: calculateLandscaping,
  },
  {
    trade: 'flooring',
    name: 'Flooring',
    icon: 'Layers',
    description: 'LVP, laminate, and tile installation',
    questions: [
      { id: 'floorType', label: 'Flooring type', type: 'select', required: true, options: [
        { value: 'lvp', label: 'Luxury Vinyl Plank (LVP) — waterproof, durable, easy install' },
        { value: 'laminate', label: 'Laminate — budget-friendly, wood look' },
        { value: 'tile', label: 'Ceramic / Porcelain Tile' },
      ]},
      { id: 'areaSqFt', label: 'Room area', type: 'number', required: true, unit: 'sq ft', helpText: 'Length × Width of the room' },
      { id: 'transitions', label: 'Number of doorway transitions', type: 'number', defaultValue: 1 },
    ],
    calculate: calculateFlooring,
  },
];

export function getEstimatorByTrade(trade: string): TradeEstimator | undefined {
  return TRADE_ESTIMATORS.find(e => e.trade === trade);
}
