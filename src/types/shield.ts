export interface ShieldCalcInput {
  rateType: 'hourly' | 'salary';
  hourlyRate?: number;
  daysLate: number;
}
