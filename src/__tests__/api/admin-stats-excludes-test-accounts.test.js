/**
 * Every companies query in the funnel-reporting routes must exclude test
 * accounts.
 *
 * This is a source-level check rather than a behavioural one on purpose. The
 * regression it guards against is someone adding a tenth `.from('companies')`
 * query without the filter — which no behavioural test would catch, because
 * the new query would work correctly in every respect except that it silently
 * counts accounts nobody created for real.
 *
 * That failure already happened once. The growth agent planner's first run
 * read a snapshot built from seven hand-made accounts, believed there were 4
 * trials and 3 paying customers, and planned a week of work around a funnel
 * that did not exist.
 */

const fs = require('fs');
const path = require('path');

const ROUTES = [
  'src/app/api/admin/stats/route.ts',
  'src/app/api/growth/metrics/route.ts',
];

describe.each(ROUTES)('%s', (relativePath) => {
  const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

  it('filters every companies query on is_test', () => {
    const queries = source.match(/\.from\('companies'\)/g) || [];
    const filters = source.match(/\.eq\('is_test', false\)/g) || [];

    expect(queries.length).toBeGreaterThan(0);
    expect(filters.length).toBe(queries.length);
  });

  it('never filters to only test accounts', () => {
    // `.eq('is_test', true)` in a reporting route would invert the meaning of
    // every number on the page.
    expect(source).not.toMatch(/\.eq\('is_test', true\)/);
  });
});
