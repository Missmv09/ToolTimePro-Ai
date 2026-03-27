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
// ROOFING CALCULATOR
// ============================================================
function calculateRoofing(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const sqft = Number(answers.roofSqFt) || 1500;
  const shingleType = answers.shingleType || 'architectural';
  const laborRate = Number(answers.laborRate) || 55;

  // Shingles: 3 bundles per 100 sq ft (1 square)
  const bundlesNeeded = Math.ceil(sqft / 33 * 1.1); // 10% waste
  addItem(items, shingleType === '3tab' ? 'shingles-3tab' : 'shingles-arch', bundlesNeeded, tier);

  // Starter strip: perimeter in linear ft
  const perimeterFt = Math.sqrt(sqft) * 4;
  addItem(items, 'roof-starter', Math.ceil(perimeterFt / 105), tier);

  // Underlayment
  addItem(items, 'roof-underlayment', Math.ceil(sqft / 1000), tier);

  // Ice & water shield (valleys + eaves, ~20% of roof)
  if (answers.hasValleys === 'yes' || tier !== 'economy') {
    addItem(items, 'ice-water-shield', Math.ceil(sqft * 0.2 / 200), tier);
  }

  // Drip edge: perimeter
  addItem(items, 'drip-edge', Math.ceil(perimeterFt / 10), tier);

  // Roofing nails
  addItem(items, 'roof-nails', Math.ceil(sqft / 2000), tier);

  // Ridge vent
  const ridgeFt = Math.sqrt(sqft) / 2;
  addItem(items, 'roof-vent', Math.ceil(ridgeFt / 4), tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(sqft / 25); // ~25 sq ft per hour per person

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Price does not include tear-off of existing roof.', 'Add 10-15% for steep pitch or complex roof lines.'] };
}

// ============================================================
// FENCING CALCULATOR
// ============================================================
function calculateFencing(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const linearFt = Number(answers.linearFeet) || 100;
  const fenceType = answers.fenceType || 'wood_privacy';
  const fenceHeight = Number(answers.height) || 6;
  const gates = Number(answers.gates) || 1;
  const laborRate = Number(answers.laborRate) || 45;

  if (fenceType === 'vinyl') {
    const panels = Math.ceil(linearFt / 8);
    addItem(items, 'fence-vinyl-panel', panels, tier);
  } else {
    // Wood fence
    const postSpacing = 8;
    const posts = Math.ceil(linearFt / postSpacing) + 1;
    addItem(items, 'fence-post-wood', posts, tier);

    const rails = posts * (fenceHeight > 4 ? 3 : 2);
    addItem(items, 'fence-rail', rails, tier);

    const pickets = Math.ceil(linearFt / 0.5); // ~2 pickets per foot
    addItem(items, 'fence-picket', pickets, tier);

    addItem(items, 'fence-screws', Math.ceil(pickets / 50), tier);
  }

  // Concrete for posts
  const postCount = Math.ceil(linearFt / 8) + 1;
  addItem(items, 'fence-concrete', postCount * 2, tier); // 2 bags per post

  // Gate hardware
  addItem(items, 'fence-gate-hardware', gates, tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(linearFt * 0.4);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Call 811 before digging to locate underground utilities.'] };
}

// ============================================================
// CONCRETE & MASONRY CALCULATOR
// ============================================================
function calculateConcrete(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const jobType = answers.jobType || 'slab';
  const laborRate = Number(answers.laborRate) || 50;

  if (jobType === 'slab' || jobType === 'patio' || jobType === 'driveway') {
    const sqft = Number(answers.areaSqFt) || 200;
    const thickness = Number(answers.thicknessInches) || 4;
    const cubicFt = sqft * (thickness / 12);
    const bags80 = Math.ceil(cubicFt / 0.6 * 1.1); // 0.6 cu ft per bag + 10% waste

    addItem(items, 'concrete-bag', bags80, tier);
    addItem(items, 'concrete-mesh', Math.ceil(sqft / 50), tier);
    addItem(items, 'concrete-form-lumber', Math.ceil(Math.sqrt(sqft) * 4 / 8), tier);

    if (thickness >= 4) {
      addItem(items, 'concrete-rebar', Math.ceil(sqft / 16), tier); // 16" grid
    }

    addItem(items, 'gravel-base', Math.ceil(sqft * (2 / 12) / 27), tier); // 2" base

    const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
    const laborHours = Math.ceil(sqft * 0.15);

    return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: bags80 > 50 ? ['For jobs over 50 bags, consider ordering ready-mix concrete delivery (~$150/yard).'] : [] };
  }

  // Block wall
  const wallLengthFt = Number(answers.wallLengthFt) || 20;
  const wallHeightFt = Number(answers.wallHeightFt) || 4;
  const blockCount = Math.ceil((wallLengthFt * wallHeightFt) / 0.89); // 0.89 sq ft per block

  addItem(items, 'cmu-block', blockCount, tier);
  addItem(items, 'mortar-mix', Math.ceil(blockCount / 12), tier); // ~12 blocks per bag
  addItem(items, 'concrete-rebar', Math.ceil(wallHeightFt * wallLengthFt / 32), tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(blockCount * 0.15);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: [] };
}

// ============================================================
// CARPENTRY CALCULATOR
// ============================================================
function calculateCarpentry(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const jobType = answers.jobType || 'deck';
  const laborRate = Number(answers.laborRate) || 50;

  if (jobType === 'deck') {
    const sqft = Number(answers.deckSqFt) || 200;
    const deckMaterial = answers.deckMaterial || 'pressure_treated';

    // Decking boards (5.5" wide covers ~0.46 sq ft per linear foot)
    const boardsFt = Math.ceil(sqft / 0.46);
    const boards8ft = Math.ceil(boardsFt / 8 * 1.1);

    if (deckMaterial === 'composite') {
      addItem(items, 'deck-board-composite', boards8ft, tier);
    } else {
      addItem(items, 'deck-board-pt', boards8ft, tier);
    }

    // Joists (2x6, 16" on center)
    const joists = Math.ceil(Math.sqrt(sqft) / 1.33) + 1;
    addItem(items, 'lumber-2x6', joists * 2, tier);

    // Posts (one per 6ft of perimeter)
    const posts = Math.ceil(Math.sqrt(sqft) * 4 / 6);
    addItem(items, 'fence-post-wood', posts, tier);

    addItem(items, 'wood-screws', Math.ceil(sqft / 20), tier);
    addItem(items, 'joist-hanger', joists, tier);
    addItem(items, 'fence-concrete', posts * 2, tier);

    const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
    const laborHours = Math.ceil(sqft * 0.2);

    return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Permits may be required for decks over 30" above grade.'] };
  }

  // Framing
  const wallLf = Number(answers.wallLinearFt) || 20;
  const studs = Math.ceil(wallLf / 1.33) + 2;

  addItem(items, 'lumber-2x4', studs, tier);
  addItem(items, 'plywood-sheathing', Math.ceil(wallLf * 8 / 32), tier);
  addItem(items, 'wood-screws', Math.ceil(studs / 20), tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(wallLf * 0.5);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: [] };
}

// ============================================================
// IRRIGATION CALCULATOR
// ============================================================
function calculateIrrigation(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const zones = Number(answers.zones) || 4;
  const sqft = Number(answers.yardSqFt) || 3000;
  const hasDrip = answers.dripZones === 'yes';
  const laborRate = Number(answers.laborRate) || 45;

  // Controller
  addItem(items, 'irrigation-controller', 1, tier);

  // Valves (one per zone)
  addItem(items, 'irrigation-valve', zones, tier);

  // Valve boxes
  addItem(items, 'valve-box', Math.ceil(zones / 2), tier);

  // Spray zones: pop-up heads
  const sprayZones = hasDrip ? Math.ceil(zones * 0.6) : zones;
  const headsPerZone = Math.ceil(sqft / zones / 200); // 1 head per 200 sq ft
  addItem(items, 'sprinkler-head-popup', sprayZones * headsPerZone, tier);

  // Rotors for large areas
  if (sqft > 4000) {
    addItem(items, 'sprinkler-head-rotor', Math.ceil(zones * 0.3) * 3, tier);
  }

  // Pipe (100ft rolls, ~1 roll per zone)
  addItem(items, 'irrigation-pipe', zones, tier);

  // Drip zones
  if (hasDrip) {
    addItem(items, 'drip-tubing', Math.ceil(zones * 0.4), tier);
  }

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(zones * 4);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Call 811 before digging.', 'Backflow preventer may be required by local code (not included).'] };
}

// ============================================================
// PRESSURE WASHING CALCULATOR
// ============================================================
function calculatePressureWashing(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const sqft = Number(answers.areaSqFt) || 500;
  const surface = answers.surfaceType || 'concrete';
  const laborRate = Number(answers.laborRate) || 50;

  // Detergent (1 gal covers ~200 sq ft diluted)
  addItem(items, 'pw-detergent', Math.ceil(sqft / 200), tier);

  if (surface === 'house' || surface === 'siding') {
    // Soft wash: bleach + surfactant
    addItem(items, 'pw-bleach', Math.ceil(sqft / 500), tier);
    addItem(items, 'pw-surfactant', Math.ceil(sqft / 1000), tier);
  }

  // Tips (one set per job)
  addItem(items, 'pw-tips', 1, tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(sqft / 200);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Test detergent on inconspicuous area first.'] };
}

// ============================================================
// INSULATION CALCULATOR
// ============================================================
function calculateInsulation(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const sqft = Number(answers.areaSqFt) || 1000;
  const insType = String(answers.insulationType || 'batt_r13');
  const laborRate = Number(answers.laborRate) || 40;

  if (insType.startsWith('batt')) {
    const materialId = insType === 'batt_r30' ? 'insulation-batt-r30' : insType === 'batt_r19' ? 'insulation-batt-r19' : 'insulation-batt-r13';
    const coverage = insType === 'batt_r30' ? 58 : insType === 'batt_r19' ? 75 : 106;
    addItem(items, materialId, Math.ceil(sqft / coverage), tier);
  } else if (insType === 'blown_in') {
    addItem(items, 'insulation-blown', Math.ceil(sqft / 40), tier);
  } else {
    addItem(items, 'insulation-foam-board', Math.ceil(sqft / 32), tier);
  }

  // Vapor barrier for walls
  if (answers.needsVaporBarrier === 'yes') {
    addItem(items, 'vapor-barrier', Math.ceil(sqft / 1000), tier);
  }

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(sqft * 0.03);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: insType === 'blown_in' ? ['Blower machine rental ~$50/day from Home Depot (free with 20+ bag purchase).'] : [] };
}

// ============================================================
// SIDING CALCULATOR
// ============================================================
function calculateSiding(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const sqft = Number(answers.wallSqFt) || 1500;
  const sidingType = answers.sidingType || 'vinyl';
  const laborRate = Number(answers.laborRate) || 50;

  if (sidingType === 'fiber_cement') {
    addItem(items, 'siding-fiber-cement', Math.ceil(sqft * 1.1), tier); // 10% waste
  } else {
    addItem(items, 'siding-vinyl', Math.ceil(sqft * 1.1), tier);
  }

  // House wrap
  addItem(items, 'house-wrap', Math.ceil(sqft / 1350), tier);

  // Trim
  const trimFt = Number(answers.trimLinearFt) || Math.ceil(Math.sqrt(sqft) * 3);
  addItem(items, 'siding-trim', Math.ceil(trimFt / 8), tier);

  // J-channel
  const jChannelFt = Number(answers.windowDoorTrimFt) || Math.ceil(sqft / 100) * 12;
  addItem(items, 'siding-jchannel', Math.ceil(jChannelFt / 12), tier);

  // Nails
  addItem(items, 'siding-nails', Math.ceil(sqft / 100), tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = Math.ceil(sqft * 0.06);

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Remove existing siding cost not included.'] };
}

// ============================================================
// TREE SERVICE CALCULATOR
// ============================================================
function calculateTreeService(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const jobType = answers.jobType || 'removal';
  const treeCount = Number(answers.treeCount) || 1;
  const needsStumpGrinding = answers.stumpGrinding === 'yes';
  const laborRate = Number(answers.laborRate) || 55;

  addItem(items, 'chainsaw-chain', Math.ceil(treeCount / 3), tier);
  addItem(items, 'chainsaw-bar-oil', Math.ceil(treeCount / 2), tier);
  addItem(items, 'tree-wound-seal', treeCount, tier);

  if (needsStumpGrinding) {
    addItem(items, 'stump-grinder-rental', 1, tier);
  }

  if (jobType === 'removal') {
    addItem(items, 'wood-chipper-rental', 1, tier);
  }

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = jobType === 'removal' ? treeCount * 4 : treeCount * 2;

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Check for power lines before cutting. May need city permit for large trees.'] };
}

// ============================================================
// SOLAR INSTALLATION CALCULATOR
// ============================================================
function calculateSolar(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const systemKw = Number(answers.systemSizeKw) || 6;
  const panelWatts = 400;
  const panelCount = Math.ceil(systemKw * 1000 / panelWatts);
  const laborRate = Number(answers.laborRate) || 60;

  addItem(items, 'solar-panel', panelCount, tier);
  addItem(items, 'solar-inverter-string', 1, tier);
  addItem(items, 'solar-racking', panelCount, tier);
  addItem(items, 'solar-wire', Math.ceil(panelCount / 3), tier);
  addItem(items, 'solar-disconnect', 1, tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = panelCount * 3;

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Requires licensed electrical contractor.', 'Utility interconnection application and building permit required.', 'Federal tax credit (30% ITC) may apply.'] };
}

// ============================================================
// GARAGE DOOR CALCULATOR
// ============================================================
function calculateGarageDoor(answers: Record<string, unknown>, tier: PriceTier): EstimateResult {
  const items: EstimateItem[] = [];
  const doorSize = answers.doorSize || 'single';
  const needsOpener = answers.needsOpener !== 'no';
  const needsSprings = answers.needsSprings !== 'no';
  const laborRate = Number(answers.laborRate) || 50;

  addItem(items, doorSize === 'double' ? 'garage-door-double' : 'garage-door-single', 1, tier);

  if (needsOpener) {
    addItem(items, 'garage-opener', 1, tier);
  }

  if (needsSprings) {
    addItem(items, 'garage-spring-torsion', 1, tier);
  }

  addItem(items, 'garage-rollers', 1, tier);
  addItem(items, 'garage-weatherstrip', 1, tier);

  const materialTotal = items.reduce((sum, i) => sum + i.total, 0);
  const laborHours = doorSize === 'double' ? 6 : 4;

  return { items, materialTotal, laborEstimate: laborHours * laborRate, laborHours, grandTotal: materialTotal + laborHours * laborRate, notes: ['Torsion spring replacement is dangerous — hire a professional.'] };
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
  {
    trade: 'roofing', name: 'Roofing', icon: 'Home', description: 'Shingle replacement, underlayment, flashing, ventilation',
    questions: [
      { id: 'roofSqFt', label: 'Roof area (sq ft)', type: 'number', placeholder: '1500', required: true, helpText: 'Total roof surface area. A 1,500 sq ft home is typically 1,800-2,000 sq ft of roof.' },
      { id: 'shingleType', label: 'Shingle type', type: 'select', options: [{ value: '3tab', label: '3-Tab (basic)' }, { value: 'architectural', label: 'Architectural (dimensional)' }], required: true },
      { id: 'hasValleys', label: 'Roof has valleys?', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '55' },
    ],
    calculate: calculateRoofing,
  },
  {
    trade: 'fencing', name: 'Fencing', icon: 'Fence', description: 'Wood privacy, vinyl, posts, gates',
    questions: [
      { id: 'linearFeet', label: 'Fence length (linear ft)', type: 'number', placeholder: '100', required: true },
      { id: 'fenceType', label: 'Fence type', type: 'select', options: [{ value: 'wood_privacy', label: 'Wood Privacy (6ft)' }, { value: 'vinyl', label: 'Vinyl Privacy (6ft)' }], required: true },
      { id: 'height', label: 'Fence height (ft)', type: 'select', options: [{ value: '4', label: '4 ft' }, { value: '6', label: '6 ft' }, { value: '8', label: '8 ft' }] },
      { id: 'gates', label: 'Number of gates', type: 'number', placeholder: '1' },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '45' },
    ],
    calculate: calculateFencing,
  },
  {
    trade: 'concrete', name: 'Concrete & Masonry', icon: 'Square', description: 'Slabs, patios, driveways, block walls',
    questions: [
      { id: 'jobType', label: 'Job type', type: 'select', options: [{ value: 'slab', label: 'Concrete Slab' }, { value: 'patio', label: 'Patio' }, { value: 'driveway', label: 'Driveway' }, { value: 'block_wall', label: 'Block Wall' }], required: true },
      { id: 'areaSqFt', label: 'Area (sq ft)', type: 'number', placeholder: '200', required: true, helpText: 'For block walls, enter length x height below instead.' },
      { id: 'thicknessInches', label: 'Thickness (inches)', type: 'select', options: [{ value: '4', label: '4" (standard patio/slab)' }, { value: '6', label: '6" (driveway/heavy load)' }] },
      { id: 'wallLengthFt', label: 'Wall length (ft, block walls only)', type: 'number', placeholder: '20' },
      { id: 'wallHeightFt', label: 'Wall height (ft, block walls only)', type: 'number', placeholder: '4' },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '50' },
    ],
    calculate: calculateConcrete,
  },
  {
    trade: 'carpentry', name: 'Carpentry', icon: 'Hammer', description: 'Decks, framing, structural work',
    questions: [
      { id: 'jobType', label: 'Job type', type: 'select', options: [{ value: 'deck', label: 'Deck Build' }, { value: 'framing', label: 'Wall Framing' }], required: true },
      { id: 'deckSqFt', label: 'Deck size (sq ft)', type: 'number', placeholder: '200', helpText: 'For deck builds' },
      { id: 'deckMaterial', label: 'Decking material', type: 'select', options: [{ value: 'pressure_treated', label: 'Pressure-Treated Wood' }, { value: 'composite', label: 'Composite (Trex/TimberTech)' }] },
      { id: 'wallLinearFt', label: 'Wall length (linear ft)', type: 'number', placeholder: '20', helpText: 'For framing' },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '50' },
    ],
    calculate: calculateCarpentry,
  },
  {
    trade: 'irrigation', name: 'Irrigation & Sprinkler', icon: 'Droplets', description: 'Sprinkler systems, drip irrigation, controllers',
    questions: [
      { id: 'yardSqFt', label: 'Yard/lawn area (sq ft)', type: 'number', placeholder: '3000', required: true },
      { id: 'zones', label: 'Number of zones', type: 'select', options: [{ value: '2', label: '2 zones (small yard)' }, { value: '4', label: '4 zones (medium)' }, { value: '6', label: '6 zones (large)' }, { value: '8', label: '8 zones (extra large)' }] },
      { id: 'dripZones', label: 'Include drip irrigation for beds?', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '45' },
    ],
    calculate: calculateIrrigation,
  },
  {
    trade: 'pressure_washing', name: 'Pressure Washing', icon: 'Waves', description: 'Driveways, patios, house siding, decks',
    questions: [
      { id: 'areaSqFt', label: 'Area to clean (sq ft)', type: 'number', placeholder: '500', required: true },
      { id: 'surfaceType', label: 'Surface type', type: 'select', options: [{ value: 'concrete', label: 'Concrete (driveway/patio)' }, { value: 'house', label: 'House Siding (soft wash)' }, { value: 'deck', label: 'Wood Deck' }, { value: 'fence', label: 'Fence' }], required: true },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '50' },
    ],
    calculate: calculatePressureWashing,
  },
  {
    trade: 'insulation', name: 'Insulation', icon: 'Thermometer', description: 'Batt, blown-in, foam board for walls and attics',
    questions: [
      { id: 'areaSqFt', label: 'Area to insulate (sq ft)', type: 'number', placeholder: '1000', required: true },
      { id: 'insulationType', label: 'Insulation type', type: 'select', options: [{ value: 'batt_r13', label: 'Fiberglass Batt R-13 (2x4 walls)' }, { value: 'batt_r19', label: 'Fiberglass Batt R-19 (2x6 walls)' }, { value: 'batt_r30', label: 'Fiberglass Batt R-30 (attic)' }, { value: 'blown_in', label: 'Blown-In Cellulose (attic)' }, { value: 'foam_board', label: 'Rigid Foam Board' }], required: true },
      { id: 'needsVaporBarrier', label: 'Needs vapor barrier?', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '40' },
    ],
    calculate: calculateInsulation,
  },
  {
    trade: 'siding', name: 'Siding', icon: 'Layers', description: 'Vinyl, fiber cement, house wrap, trim',
    questions: [
      { id: 'wallSqFt', label: 'Wall area (sq ft)', type: 'number', placeholder: '1500', required: true, helpText: 'Total exterior wall area minus windows/doors' },
      { id: 'sidingType', label: 'Siding type', type: 'select', options: [{ value: 'vinyl', label: 'Vinyl Siding' }, { value: 'fiber_cement', label: 'Fiber Cement (HardiePlank)' }], required: true },
      { id: 'trimLinearFt', label: 'Trim needed (linear ft)', type: 'number', placeholder: '100' },
      { id: 'windowDoorTrimFt', label: 'Window/door trim (linear ft)', type: 'number', placeholder: '80' },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '50' },
    ],
    calculate: calculateSiding,
  },
  {
    trade: 'tree_service', name: 'Tree Service', icon: 'TreePine', description: 'Tree removal, trimming, stump grinding',
    questions: [
      { id: 'jobType', label: 'Job type', type: 'select', options: [{ value: 'removal', label: 'Tree Removal' }, { value: 'trimming', label: 'Tree Trimming/Pruning' }], required: true },
      { id: 'treeCount', label: 'Number of trees', type: 'number', placeholder: '1', required: true },
      { id: 'stumpGrinding', label: 'Include stump grinding?', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '55' },
    ],
    calculate: calculateTreeService,
  },
  {
    trade: 'solar', name: 'Solar Installation', icon: 'Sun', description: 'Solar panels, inverters, racking, wiring',
    questions: [
      { id: 'systemSizeKw', label: 'System size (kW)', type: 'select', options: [{ value: '4', label: '4 kW (small home)' }, { value: '6', label: '6 kW (average home)' }, { value: '8', label: '8 kW (large home)' }, { value: '10', label: '10 kW (large + EV)' }, { value: '12', label: '12 kW (very large)' }], required: true },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '60' },
    ],
    calculate: calculateSolar,
  },
  {
    trade: 'garage_door', name: 'Garage Door', icon: 'DoorOpen', description: 'Doors, openers, springs, hardware',
    questions: [
      { id: 'doorSize', label: 'Door size', type: 'select', options: [{ value: 'single', label: 'Single (8x7)' }, { value: 'double', label: 'Double (16x7)' }], required: true },
      { id: 'needsOpener', label: 'Include opener?', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No (door only)' }] },
      { id: 'needsSprings', label: 'Replace springs?', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
      { id: 'laborRate', label: 'Labor rate ($/hr)', type: 'number', placeholder: '50' },
    ],
    calculate: calculateGarageDoor,
  },
];

export function getEstimatorByTrade(trade: string): TradeEstimator | undefined {
  return TRADE_ESTIMATORS.find(e => e.trade === trade);
}
