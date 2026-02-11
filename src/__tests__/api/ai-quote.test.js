/**
 * Tests for the ai-quote SERVICE_CATALOG keyword matching logic.
 *
 * We duplicate the catalog and matchServices helper here so we can unit-test
 * the matching without needing to spin up a Next.js server.
 *
 * IMPORTANT: Keep this catalog in sync with route.ts whenever keywords change.
 */

// ---- Duplicated catalog (synced with route.ts) ----

const SERVICE_CATALOG = [
  {
    keywords: ['lawn', 'mow', 'mowing', 'grass', 'turf'],
    name: 'Lawn Mowing',
  },
  {
    keywords: ['hedge', 'hedges', 'shrub', 'shrubs', 'bush', 'bushes'],
    name: 'Hedge Trimming',
  },
  {
    keywords: ['tree', 'trees', 'tree trim', 'tree trimming', 'prune', 'pruning', 'branch', 'branches', 'limb'],
    name: 'Tree Trimming',
  },
  {
    keywords: ['leaf', 'leaves', 'leaf cleanup', 'leaf removal', 'yard debris', 'debris'],
    name: 'Leaf & Debris Cleanup',
  },
  {
    keywords: ['gutter', 'gutters'],
    name: 'Gutter Cleaning',
  },
  {
    keywords: ['pool', 'swimming', 'pool service', 'pool cleaning'],
    name: 'Pool Cleaning',
  },
  {
    keywords: ['window', 'windows', 'window cleaning', 'window wash'],
    name: 'Window Cleaning',
  },
  {
    keywords: ['paint', 'painting', 'repaint', 'exterior paint', 'interior paint', 'trim work', 'baseboard', 'molding', 'crown molding', 'cabinet paint', 'ceiling paint', 'drywall', 'paint the wall', 'paint walls'],
    name: 'Painting',
  },
  {
    keywords: ['pressure wash', 'power wash', 'powerwash', 'pressure washing'],
    name: 'Pressure Washing',
  },
  {
    keywords: ['mulch', 'mulching'],
    name: 'Mulch Installation',
  },
  {
    keywords: ['irrigation', 'sprinkler', 'sprinklers', 'drip system', 'drip line', 'drip irrigation'],
    name: 'Irrigation System Service',
  },
  {
    keywords: ['fence', 'fencing', 'gate'],
    name: 'Fence Repair / Install',
  },
  {
    keywords: ['electric', 'electrical', 'wiring', 'outlet', 'lighting', 'light fixture', 'light switch', 'recessed light', 'can light', 'ceiling fan', 'breaker', 'panel', 'circuit'],
    name: 'Electrical Work',
  },
  {
    keywords: ['plumb', 'plumbing', 'pipe', 'drain', 'faucet', 'toilet', 'leak'],
    name: 'Plumbing Service',
  },
  {
    keywords: ['sod', 'resod', 're-sod'],
    name: 'Sod Installation',
  },
  {
    keywords: ['aerat', 'aeration', 'core aeration'],
    name: 'Lawn Aeration',
  },
  {
    keywords: ['deck', 'patio', 'porch'],
    name: 'Deck / Patio Service',
  },
  {
    keywords: ['handyman', 'handyman service', 'odd job', 'general repair', 'general maintenance'],
    name: 'General Repair',
  },
];

// ---- Duplicated matchServices (must match route.ts logic) ----

function matchServices(description) {
  const lower = description.toLowerCase();
  const matched = [];
  const usedNames = new Set();

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

// ---- Helpers ----

function matchedNames(description) {
  return matchServices(description).map((s) => s.name);
}

// ====================================================================
// SECTION 1: Every industry matches its own keywords correctly
// ====================================================================

describe('Lawn Mowing – correct matches', () => {
  test.each([
    'Mow the lawn weekly',
    'Grass is getting tall, need mowing',
    'Turf maintenance for the backyard',
  ])('%s → Lawn Mowing', (desc) => {
    expect(matchedNames(desc)).toContain('Lawn Mowing');
  });
});

describe('Hedge Trimming – correct matches', () => {
  test.each([
    'Trim the hedges along the driveway',
    'Shrub shaping in the front yard',
    'Overgrown bushes need cutting back',
  ])('%s → Hedge Trimming', (desc) => {
    expect(matchedNames(desc)).toContain('Hedge Trimming');
  });
});

describe('Tree Trimming – correct matches', () => {
  test.each([
    'Need tree trimming in the back yard',
    'Prune the trees along the fence line',
    'Dead branches hanging over the roof',
    'Remove a limb from the oak tree',
    'I need a tree trim',
  ])('%s → Tree Trimming', (desc) => {
    expect(matchedNames(desc)).toContain('Tree Trimming');
  });
});

describe('Leaf & Debris Cleanup – correct matches', () => {
  test.each([
    'Leaves are piling up in the yard',
    'Leaf removal after the storm',
    'Yard debris from the hurricane',
    'Leaf cleanup needed this weekend',
  ])('%s → Leaf & Debris Cleanup', (desc) => {
    expect(matchedNames(desc)).toContain('Leaf & Debris Cleanup');
  });
});

describe('Gutter Cleaning – correct matches', () => {
  test.each([
    'Clean out the gutters',
    'Gutter is overflowing when it rains',
  ])('%s → Gutter Cleaning', (desc) => {
    expect(matchedNames(desc)).toContain('Gutter Cleaning');
  });
});

describe('Pool Cleaning – correct matches', () => {
  test.each([
    'Pool is turning green, need cleaning',
    'Weekly pool service',
    'Swimming pool chemical balancing',
  ])('%s → Pool Cleaning', (desc) => {
    expect(matchedNames(desc)).toContain('Pool Cleaning');
  });
});

describe('Window Cleaning – correct matches', () => {
  test.each([
    'Clean all the windows inside and out',
    'Window wash for a 2-story home',
    'Window cleaning for the office',
  ])('%s → Window Cleaning', (desc) => {
    expect(matchedNames(desc)).toContain('Window Cleaning');
  });
});

describe('Painting – correct matches', () => {
  test.each([
    'Paint the living room',
    'Exterior painting for the whole house',
    'Repaint the hallway',
    'Interior paint for a 2-story home',
    'Trim work in the kitchen',
    'Paint the baseboards',
    'Crown molding needs a fresh coat',
    'Cabinet paint job for the kitchen',
    'Ceiling paint in the master bedroom',
    'Patch and paint drywall in bedroom',
    'Paint walls in three rooms',
    'Paint the wall behind the TV',
  ])('%s → Painting', (desc) => {
    expect(matchedNames(desc)).toContain('Painting');
  });
});

describe('Pressure Washing – correct matches', () => {
  test.each([
    'Pressure wash the driveway',
    'Power wash the deck',
    'Powerwash the patio and sidewalk',
    'Need pressure washing for the house exterior',
  ])('%s → Pressure Washing', (desc) => {
    expect(matchedNames(desc)).toContain('Pressure Washing');
  });
});

describe('Mulch Installation – correct matches', () => {
  test.each([
    'Need 5 yards of mulch in the beds',
    'Mulching around the flower beds',
  ])('%s → Mulch Installation', (desc) => {
    expect(matchedNames(desc)).toContain('Mulch Installation');
  });
});

describe('Irrigation System Service – correct matches', () => {
  test.each([
    'Irrigation system not turning on',
    'Sprinkler head is broken in zone 3',
    'Install a drip system in the garden beds',
    'Drip irrigation for the vegetable garden',
    'Drip line needs replacing',
  ])('%s → Irrigation System Service', (desc) => {
    expect(matchedNames(desc)).toContain('Irrigation System Service');
  });
});

describe('Fence Repair / Install – correct matches', () => {
  test.each([
    'Fence is leaning and needs repair',
    'Install new fencing along the property',
    'Gate is not closing properly',
  ])('%s → Fence Repair / Install', (desc) => {
    expect(matchedNames(desc)).toContain('Fence Repair / Install');
  });
});

describe('Electrical Work – correct matches', () => {
  test.each([
    'Need an electrician for electrical work',
    'Install new wiring in the garage',
    'Add a new outlet in the kitchen',
    'Outdoor lighting installation',
    'Replace a light fixture in the bathroom',
    'Light switch is not working',
    'Install recessed lights in the living room',
    'Can light installation in the kitchen',
    'Ceiling fan installation in the bedroom',
    'Breaker keeps tripping',
    'Upgrade the electrical panel',
    'Circuit is overloaded',
  ])('%s → Electrical Work', (desc) => {
    expect(matchedNames(desc)).toContain('Electrical Work');
  });
});

describe('Plumbing Service – correct matches', () => {
  test.each([
    'Plumbing emergency in the bathroom',
    'Pipe burst under the sink',
    'Drain is clogged in the shower',
    'Faucet is dripping nonstop',
    'Toilet keeps running',
    'Leak under the kitchen sink',
  ])('%s → Plumbing Service', (desc) => {
    expect(matchedNames(desc)).toContain('Plumbing Service');
  });
});

describe('Sod Installation – correct matches', () => {
  test.each([
    'Need new sod in the front yard',
    'Resod the backyard after pool install',
    'Re-sod the side yard',
  ])('%s → Sod Installation', (desc) => {
    expect(matchedNames(desc)).toContain('Sod Installation');
  });
});

describe('Lawn Aeration – correct matches', () => {
  test.each([
    'Core aeration for the front lawn',
    'Lawn aeration this spring',
    'My yard needs aerating',
  ])('%s → Lawn Aeration', (desc) => {
    expect(matchedNames(desc)).toContain('Lawn Aeration');
  });
});

describe('Deck / Patio Service – correct matches', () => {
  test.each([
    'Stain the deck out back',
    'Patio pavers are uneven',
    'Screen in the porch',
  ])('%s → Deck / Patio Service', (desc) => {
    expect(matchedNames(desc)).toContain('Deck / Patio Service');
  });
});

describe('General Repair – correct matches', () => {
  test.each([
    'Need a handyman for a few things',
    'Handyman service for the rental unit',
    'Got a list of odd jobs around the house',
    'General repair needed on the property',
    'General maintenance for the rental',
  ])('%s → General Repair', (desc) => {
    expect(matchedNames(desc)).toContain('General Repair');
  });
});

// ====================================================================
// SECTION 2: Cross-industry collision tests (the main bug-fix area)
// ====================================================================

describe('FIXED: "light" no longer false-matches Electrical', () => {
  test('"light coat of paint" → Painting only, NOT Electrical', () => {
    const names = matchedNames('Need a light coat of paint in the bedroom');
    expect(names).toContain('Painting');
    expect(names).not.toContain('Electrical Work');
  });

  test('"light trimming of the hedges" → Hedge Trimming only', () => {
    const names = matchedNames('Light trimming of the hedges out front');
    expect(names).toContain('Hedge Trimming');
    expect(names).not.toContain('Electrical Work');
  });

  test('"light pressure wash" → Pressure Washing only', () => {
    const names = matchedNames('Light pressure wash on the sidewalk');
    expect(names).toContain('Pressure Washing');
    expect(names).not.toContain('Electrical Work');
  });
});

describe('FIXED: "fall" no longer false-matches Leaf Cleanup', () => {
  test('"fall hazard on the porch" → Deck/Patio only, NOT Leaf Cleanup', () => {
    const names = matchedNames('Fix the fall hazard on the porch');
    expect(names).toContain('Deck / Patio Service');
    expect(names).not.toContain('Leaf & Debris Cleanup');
  });

  test('"falling fence" → Fence only, NOT Leaf Cleanup', () => {
    const names = matchedNames('The fence is falling over');
    expect(names).toContain('Fence Repair / Install');
    expect(names).not.toContain('Leaf & Debris Cleanup');
  });
});

describe('FIXED: "pressure" no longer false-matches Pressure Washing', () => {
  test('"low water pressure" → NOT Pressure Washing (falls to fallback)', () => {
    const names = matchedNames('Low water pressure in the shower');
    // No plumbing keywords present either — this correctly falls to Custom Service fallback
    expect(names).not.toContain('Pressure Washing');
  });

  test('"low water pressure" with plumbing context → Plumbing only', () => {
    const names = matchedNames('Low water pressure, might be a pipe issue');
    expect(names).toContain('Plumbing Service');
    expect(names).not.toContain('Pressure Washing');
  });

  test('"pressure in the sprinkler lines" → Irrigation only, NOT Pressure Washing', () => {
    const names = matchedNames('Not enough pressure in the sprinkler lines');
    expect(names).toContain('Irrigation System Service');
    expect(names).not.toContain('Pressure Washing');
  });
});

describe('FIXED: "walls" no longer false-matches Painting', () => {
  test('"retaining walls" → does NOT match Painting', () => {
    const names = matchedNames('Build retaining walls in the back yard');
    expect(names).not.toContain('Painting');
  });

  test('"stone walls around the garden" → does NOT match Painting', () => {
    const names = matchedNames('Stone walls around the garden need repair');
    expect(names).not.toContain('Painting');
  });
});

describe('FIXED: "glass" no longer false-matches Window Cleaning', () => {
  test('"fiberglass deck" → Deck/Patio only, NOT Window Cleaning', () => {
    const names = matchedNames('Fiberglass deck needs refinishing');
    expect(names).toContain('Deck / Patio Service');
    expect(names).not.toContain('Window Cleaning');
  });

  test('"glass door repair" → does NOT match Window Cleaning', () => {
    const names = matchedNames('Sliding glass door track is broken');
    expect(names).not.toContain('Window Cleaning');
  });
});

describe('FIXED: "drip" no longer false-matches Irrigation', () => {
  test('"dripping faucet" → Plumbing only, NOT Irrigation', () => {
    const names = matchedNames('The faucet is dripping in the kitchen');
    expect(names).toContain('Plumbing Service');
    expect(names).not.toContain('Irrigation System Service');
  });

  test('"drip from the ceiling" → does NOT match Irrigation', () => {
    const names = matchedNames('There is a drip coming from the ceiling');
    expect(names).not.toContain('Irrigation System Service');
  });
});

describe('FIXED: "repair"/"fix" no longer double-match General Repair', () => {
  test('"fence repair" → Fence only, NOT also General Repair', () => {
    const names = matchedNames('I need fence repair in the back');
    expect(names).toContain('Fence Repair / Install');
    expect(names).not.toContain('General Repair');
  });

  test('"fix the toilet" → Plumbing only, NOT also General Repair', () => {
    const names = matchedNames('Fix the toilet in the guest bath');
    expect(names).toContain('Plumbing Service');
    expect(names).not.toContain('General Repair');
  });

  test('"fix the outlet" → Electrical only, NOT also General Repair', () => {
    const names = matchedNames('Fix the outlet in the bedroom');
    expect(names).toContain('Electrical Work');
    expect(names).not.toContain('General Repair');
  });
});

describe('FIXED: "cleanup"/"clean up" no longer false-matches Leaf Cleanup', () => {
  test('"clean up the pool" → Pool Cleaning only, NOT Leaf Cleanup', () => {
    const names = matchedNames('Clean up the pool area');
    expect(names).toContain('Pool Cleaning');
    expect(names).not.toContain('Leaf & Debris Cleanup');
  });

  test('"general cleanup of the garage" → does NOT match Leaf Cleanup', () => {
    const names = matchedNames('General cleanup of the garage');
    expect(names).not.toContain('Leaf & Debris Cleanup');
  });
});

describe('FIXED: "fixture" no longer false-matches Electrical', () => {
  test('"plumbing fixture" → Plumbing only, NOT Electrical', () => {
    const names = matchedNames('Replace the plumbing fixture in the bathroom');
    expect(names).toContain('Plumbing Service');
    expect(names).not.toContain('Electrical Work');
  });
});

describe('FIXED: Painting "trim" no longer hits Tree Trimming', () => {
  test('"paint the trim and walls" → Painting only, NOT Tree Trimming', () => {
    const names = matchedNames('I need to paint the trim and walls in 3 bedrooms');
    expect(names).toContain('Painting');
    expect(names).not.toContain('Tree Trimming');
  });

  test('"trim work in the kitchen" → Painting only', () => {
    const names = matchedNames('Need trim work done in the kitchen');
    expect(names).toContain('Painting');
    expect(names).not.toContain('Tree Trimming');
  });
});

// ====================================================================
// SECTION 3: Multi-service descriptions (should match multiple)
// ====================================================================

describe('Multi-service descriptions match correctly', () => {
  test('"paint the house and tree trimming" → both', () => {
    const names = matchedNames('Paint the house and do some tree trimming');
    expect(names).toContain('Painting');
    expect(names).toContain('Tree Trimming');
  });

  test('"pressure wash the deck then paint" → both', () => {
    const names = matchedNames('Pressure wash the deck then paint it');
    expect(names).toContain('Pressure Washing');
    expect(names).toContain('Painting');
  });

  test('"mow the lawn and clean the gutters" → both', () => {
    const names = matchedNames('Mow the lawn and clean the gutters');
    expect(names).toContain('Lawn Mowing');
    expect(names).toContain('Gutter Cleaning');
  });

  test('"fix the sprinkler and replace the faucet" → Irrigation + Plumbing', () => {
    const names = matchedNames('Fix the sprinkler and replace the faucet');
    expect(names).toContain('Irrigation System Service');
    expect(names).toContain('Plumbing Service');
  });

  test('"tree trimming, mulch, and sod" → all three', () => {
    const names = matchedNames('Tree trimming, spread mulch, and lay new sod');
    expect(names).toContain('Tree Trimming');
    expect(names).toContain('Mulch Installation');
    expect(names).toContain('Sod Installation');
  });

  test('"paint, light fixture, ceiling fan" → Painting + Electrical', () => {
    const names = matchedNames('Paint the living room and install a light fixture and ceiling fan');
    expect(names).toContain('Painting');
    expect(names).toContain('Electrical Work');
  });
});

// ====================================================================
// SECTION 4: Edge cases – vague / ambiguous descriptions
// ====================================================================

describe('Edge cases – vague or ambiguous input', () => {
  test('standalone "trim" matches nothing', () => {
    const names = matchedNames('trim');
    expect(names).not.toContain('Tree Trimming');
    expect(names).not.toContain('Painting');
  });

  test('standalone "fix" matches nothing (no longer General Repair)', () => {
    const names = matchedNames('fix');
    expect(names).toHaveLength(0);
  });

  test('standalone "repair" matches nothing (no longer General Repair)', () => {
    const names = matchedNames('repair');
    expect(names).toHaveLength(0);
  });

  test('standalone "clean" matches nothing', () => {
    const names = matchedNames('clean');
    expect(names).toHaveLength(0);
  });

  test('standalone "light" matches nothing (no longer Electrical)', () => {
    const names = matchedNames('light');
    expect(names).toHaveLength(0);
  });

  test('standalone "pressure" matches nothing (no longer Pressure Washing)', () => {
    const names = matchedNames('pressure');
    expect(names).toHaveLength(0);
  });

  test('empty string matches nothing', () => {
    const names = matchedNames('');
    expect(names).toHaveLength(0);
  });

  test('gibberish matches nothing', () => {
    const names = matchedNames('asdfghjkl zxcvbnm');
    expect(names).toHaveLength(0);
  });
});
