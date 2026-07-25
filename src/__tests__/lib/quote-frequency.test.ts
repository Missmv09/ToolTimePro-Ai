import {
  normalizeFrequency,
  frequencyLabel,
  frequencySuffix,
  isRecurringFrequency,
  QUOTE_FREQUENCIES,
  DEFAULT_QUOTE_FREQUENCY,
} from '@/lib/quote-frequency';

describe('quote-frequency helpers', () => {
  test('normalizeFrequency accepts known values', () => {
    expect(normalizeFrequency('weekly')).toBe('weekly');
    expect(normalizeFrequency('MONTHLY')).toBe('monthly');
    expect(normalizeFrequency('biweekly')).toBe('biweekly');
    expect(normalizeFrequency('one_time')).toBe('one_time');
  });

  test('normalizeFrequency falls back to default for unknown/empty', () => {
    expect(normalizeFrequency(null)).toBe(DEFAULT_QUOTE_FREQUENCY);
    expect(normalizeFrequency(undefined)).toBe(DEFAULT_QUOTE_FREQUENCY);
    expect(normalizeFrequency('')).toBe(DEFAULT_QUOTE_FREQUENCY);
    expect(normalizeFrequency('yearly')).toBe(DEFAULT_QUOTE_FREQUENCY);
  });

  test('frequencyLabel returns a human label', () => {
    expect(frequencyLabel('weekly')).toBe('Weekly');
    expect(frequencyLabel('one_time')).toBe('One-time');
    expect(frequencyLabel('nonsense')).toBe('One-time');
  });

  test('frequencySuffix is empty for one-time and set for recurring', () => {
    expect(frequencySuffix('one_time')).toBe('');
    expect(frequencySuffix(null)).toBe('');
    expect(frequencySuffix('weekly')).toBe('/ week');
    expect(frequencySuffix('monthly')).toBe('/ month');
    expect(frequencySuffix('biweekly')).toBe('/ 2 weeks');
  });

  test('isRecurringFrequency distinguishes one-time from recurring', () => {
    expect(isRecurringFrequency('one_time')).toBe(false);
    expect(isRecurringFrequency(null)).toBe(false);
    expect(isRecurringFrequency('weekly')).toBe(true);
    expect(isRecurringFrequency('monthly')).toBe(true);
  });

  test('every option has a label and a defined suffix', () => {
    for (const opt of QUOTE_FREQUENCIES) {
      expect(opt.label.length).toBeGreaterThan(0);
      expect(typeof opt.suffix).toBe('string');
    }
    // one-time is the only option with no suffix
    expect(QUOTE_FREQUENCIES.filter((o) => o.suffix === '')).toHaveLength(1);
  });
});
