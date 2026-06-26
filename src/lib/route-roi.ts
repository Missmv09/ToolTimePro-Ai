/**
 * Aggregation for the Route Optimizer ROI dashboard.
 *
 * Pure functions (no DB/network) so they can be unit-tested and reused.
 * Operates on saved route records, each carrying the optimization result that
 * was stored when the route was saved.
 */

export interface SavedRouteData {
  milesSaved?: number;
  fuelSaved?: number;
  timeSavedMinutes?: number;
  totalDistanceMiles?: number;
  percentImprovement?: number;
}

export interface SavedRouteRecord {
  route_date: string; // YYYY-MM-DD
  route_data: SavedRouteData | null;
}

export interface RoiMonth {
  month: string; // YYYY-MM
  routeCount: number;
  milesSaved: number;
  fuelSaved: number;
  hoursSaved: number;
}

export interface RoiSummary {
  routeCount: number;
  totalMilesSaved: number;
  totalFuelSaved: number;
  totalHoursSaved: number;
  totalMilesDriven: number;
  avgPercentImprovement: number;
  /** Estimated CO2 avoided, kg. ~0.404 kg per car-mile (EPA average). */
  totalCo2KgSaved: number;
  /** Per-month breakdown, sorted ascending by month. */
  byMonth: RoiMonth[];
}

const CO2_KG_PER_MILE = 0.404;
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function summarizeRoutes(records: SavedRouteRecord[]): RoiSummary {
  let totalMilesSaved = 0;
  let totalFuelSaved = 0;
  let totalMinutesSaved = 0;
  let totalMilesDriven = 0;
  let percentSum = 0;
  let percentCount = 0;

  const months = new Map<string, RoiMonth>();

  for (const rec of records) {
    const d = rec.route_data || {};
    const milesSaved = d.milesSaved || 0;
    const fuelSaved = d.fuelSaved || 0;
    const minutesSaved = d.timeSavedMinutes || 0;

    totalMilesSaved += milesSaved;
    totalFuelSaved += fuelSaved;
    totalMinutesSaved += minutesSaved;
    totalMilesDriven += d.totalDistanceMiles || 0;

    if (typeof d.percentImprovement === 'number') {
      percentSum += d.percentImprovement;
      percentCount += 1;
    }

    const month = (rec.route_date || '').slice(0, 7) || 'unknown';
    const m = months.get(month) || { month, routeCount: 0, milesSaved: 0, fuelSaved: 0, hoursSaved: 0 };
    m.routeCount += 1;
    m.milesSaved += milesSaved;
    m.fuelSaved += fuelSaved;
    m.hoursSaved += minutesSaved / 60;
    months.set(month, m);
  }

  const byMonth = Array.from(months.values())
    .map((m) => ({
      month: m.month,
      routeCount: m.routeCount,
      milesSaved: round1(m.milesSaved),
      fuelSaved: round2(m.fuelSaved),
      hoursSaved: round1(m.hoursSaved),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    routeCount: records.length,
    totalMilesSaved: round1(totalMilesSaved),
    totalFuelSaved: round2(totalFuelSaved),
    totalHoursSaved: round1(totalMinutesSaved / 60),
    totalMilesDriven: round1(totalMilesDriven),
    avgPercentImprovement: percentCount > 0 ? Math.round(percentSum / percentCount) : 0,
    totalCo2KgSaved: round1(totalMilesSaved * CO2_KG_PER_MILE),
    byMonth,
  };
}
