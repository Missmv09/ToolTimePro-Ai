export function calcDailyWage(input: {
  rateType: 'hourly'|'salary';
  hourlyRate?: number;
  avgHoursPerDay?: number; // default 8
  annualSalary?: number;
  workdaysPerWeek?: number; // default 5
}): number {
  const hours = input.avgHoursPerDay ?? 8;
  if (input.rateType === 'hourly') return (input.hourlyRate ?? 0) * hours;
  const perWeek = (input.annualSalary ?? 0) / 52;
  const workdays = input.workdaysPerWeek ?? 5;
  return perWeek / workdays;
}

export function calcPenalty(dailyWage: number, daysLate: number) {
  const d = Math.max(0, Math.min(30, Math.floor(daysLate)));
  const penalty = dailyWage * d;
  return { daysCounted: d, penalty, summary: `${d} days × $${dailyWage.toFixed(2)}/day = $${penalty.toFixed(2)}` };
}
