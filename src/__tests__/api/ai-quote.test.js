/**
 * Tests for the ai-quote SERVICE_CATALOG keyword matching logic.
 *
 * We duplicate the catalog and matchServices helper here so we can unit-test
 * the matching without needing to spin up a Next.js server.
 */

// ---- Duplicated catalog (must stay in sync with route.ts) ----

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
    keywords: ['leaf', 'leaves', 'cleanup', 'clean up', 'clean-up', 'fall', 'debris'],
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
    keywords: ['window', 'windows', 'glass'],
    name: 'Window Cleaning',
  },
  {
    keywords: ['paint', 'painting', 'repaint', 'walls', 'exterior paint', 'interior paint', 'trim work', 'baseboard', 'molding', 'crown molding', 'cabinet paint', 'ceiling paint', 'drywall'],
    name: 'Painting',
  },
  {
    keywords: ['pressure wash', 'power wash', 'powerwash', 'pressure'],
    name: 'Pressure Washing',
  },
  {
    keywords: ['mulch', 'mulching'],
    name: 'Mulch Installation',
  },
  {
    keywords: ['irrigation', 'sprinkler', 'sprinklers', 'drip'],
    name: 'Irrigation System Service',
  },
  {
    keywords: ['fence', 'fencing', 'gate'],
    name: 'Fence Repair / Install',
  },
  {
    keywords: ['electric', 'electrical', 'wiring', 'outlet', 'light', 'lighting', 'fixture'],
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
    keywords: ['repair', 'fix', 'handyman', 'general'],
    name: 'General Repair',
  },
];

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

// ---- Helper ----
function matchedNames(description) {
  return matchServices(description).map((s) => s.name);
}

// ---- Tests ----

describe('ai-quote matchServices – painter scenarios', () => {
  test('painting description does NOT match Tree Trimming', () => {
    const names = matchedNames('I need to paint the trim and walls in 3 bedrooms');
    expect(names).toContain('Painting');
    expect(names).not.toContain('Tree Trimming');
  });

  test('"trim work" matches Painting, not Tree Trimming', () => {
    const names = matchedNames('Need trim work done in the kitchen');
    expect(names).toContain('Painting');
    expect(names).not.toContain('Tree Trimming');
  });

  test('"baseboard" matches Painting', () => {
    const names = matchedNames('Paint the baseboards in the hallway');
    expect(names).toContain('Painting');
  });

  test('"crown molding" matches Painting', () => {
    const names = matchedNames('Crown molding needs a fresh coat');
    expect(names).toContain('Painting');
  });

  test('"cabinet paint" matches Painting', () => {
    const names = matchedNames('Cabinet paint job for the kitchen');
    expect(names).toContain('Painting');
  });

  test('"drywall" matches Painting', () => {
    const names = matchedNames('Patch and paint drywall in bedroom');
    expect(names).toContain('Painting');
  });

  test('"interior paint" matches Painting only', () => {
    const names = matchedNames('Full interior paint for a 2-story home');
    expect(names).toContain('Painting');
    expect(names).not.toContain('Tree Trimming');
  });
});

describe('ai-quote matchServices – landscaper scenarios (no regressions)', () => {
  test('"tree trimming" still matches Tree Trimming', () => {
    const names = matchedNames('Need tree trimming in the back yard');
    expect(names).toContain('Tree Trimming');
  });

  test('"prune the trees" matches Tree Trimming', () => {
    const names = matchedNames('Prune the trees along the fence line');
    expect(names).toContain('Tree Trimming');
  });

  test('"trim the trees" matches Tree Trimming via "tree" keyword', () => {
    const names = matchedNames('Trim the trees out front');
    expect(names).toContain('Tree Trimming');
  });

  test('"tree trim" compound keyword matches Tree Trimming', () => {
    const names = matchedNames('I need a tree trim');
    expect(names).toContain('Tree Trimming');
  });

  test('"mow the lawn" still matches Lawn Mowing', () => {
    const names = matchedNames('Mow the lawn weekly');
    expect(names).toContain('Lawn Mowing');
  });

  test('"hedge trimming" matches Hedge Trimming, not Tree Trimming', () => {
    const names = matchedNames('Hedge trimming along the driveway');
    expect(names).toContain('Hedge Trimming');
    // "trimming" does NOT contain "tree trim" so Tree Trimming should not match
    expect(names).not.toContain('Tree Trimming');
  });
});

describe('ai-quote matchServices – mixed / edge cases', () => {
  test('standalone "trim" with no other context matches nothing specific (fallback)', () => {
    const names = matchedNames('trim');
    // "trim" is not a keyword for any service now
    expect(names).not.toContain('Tree Trimming');
    expect(names).not.toContain('Painting');
  });

  test('"paint and tree trimming" matches both Painting and Tree Trimming', () => {
    const names = matchedNames('Paint the house and do some tree trimming');
    expect(names).toContain('Painting');
    expect(names).toContain('Tree Trimming');
  });

  test('"pressure wash and paint" matches both', () => {
    const names = matchedNames('Pressure wash the deck then paint it');
    expect(names).toContain('Pressure Washing');
    expect(names).toContain('Painting');
  });
});
