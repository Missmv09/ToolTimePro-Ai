import { summarizeRoutes, SavedRouteRecord } from '@/lib/route-roi';

describe('summarizeRoutes', () => {
  it('returns zeros for no routes', () => {
    const s = summarizeRoutes([]);
    expect(s.routeCount).toBe(0);
    expect(s.totalMilesSaved).toBe(0);
    expect(s.avgPercentImprovement).toBe(0);
    expect(s.byMonth).toEqual([]);
  });

  it('sums savings across routes', () => {
    const records: SavedRouteRecord[] = [
      { route_date: '2026-06-01', route_data: { milesSaved: 10, fuelSaved: 4, timeSavedMinutes: 30, totalDistanceMiles: 50, percentImprovement: 20 } },
      { route_date: '2026-06-15', route_data: { milesSaved: 5, fuelSaved: 2, timeSavedMinutes: 30, totalDistanceMiles: 25, percentImprovement: 10 } },
    ];
    const s = summarizeRoutes(records);
    expect(s.routeCount).toBe(2);
    expect(s.totalMilesSaved).toBe(15);
    expect(s.totalFuelSaved).toBe(6);
    expect(s.totalHoursSaved).toBe(1); // 60 min
    expect(s.totalMilesDriven).toBe(75);
    expect(s.avgPercentImprovement).toBe(15);
  });

  it('estimates CO2 avoided from miles saved', () => {
    const s = summarizeRoutes([
      { route_date: '2026-06-01', route_data: { milesSaved: 100 } },
    ]);
    expect(s.totalCo2KgSaved).toBeCloseTo(40.4, 1);
  });

  it('groups by month, sorted ascending', () => {
    const records: SavedRouteRecord[] = [
      { route_date: '2026-07-02', route_data: { milesSaved: 3, timeSavedMinutes: 60 } },
      { route_date: '2026-06-10', route_data: { milesSaved: 7, timeSavedMinutes: 0 } },
      { route_date: '2026-06-20', route_data: { milesSaved: 1, timeSavedMinutes: 0 } },
    ];
    const s = summarizeRoutes(records);
    expect(s.byMonth.map((m) => m.month)).toEqual(['2026-06', '2026-07']);
    expect(s.byMonth[0].routeCount).toBe(2);
    expect(s.byMonth[0].milesSaved).toBe(8);
    expect(s.byMonth[1].hoursSaved).toBe(1);
  });

  it('tolerates missing/null route_data and percent fields', () => {
    const s = summarizeRoutes([
      { route_date: '2026-06-01', route_data: null },
      { route_date: '2026-06-02', route_data: { milesSaved: 5 } },
    ]);
    expect(s.routeCount).toBe(2);
    expect(s.totalMilesSaved).toBe(5);
    expect(s.avgPercentImprovement).toBe(0);
  });
});
