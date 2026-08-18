/**
 * Tests for free tool result email content.
 *
 * The capture form promises "we'll email you this result", so the cases that
 * matter are the ones where that promise could be broken quietly: an email
 * containing the wrong numbers, an email with no numbers at all, or an email
 * sent for a source that has no result to report.
 */

import { buildToolResultEmail } from '@/lib/growth-tool-results';

describe('calculator results', () => {
  const validResult = {
    dailyWage: 200,
    penalty: 6000,
    effectiveDays: 30,
    daysEntered: 45,
    rateType: 'hourly',
  };

  it('puts the actual penalty in the subject line', () => {
    const email = buildToolResultEmail('tool_calculator', validResult);
    expect(email.subject).toContain('$6,000.00');
  });

  it('reports every figure the visitor saw on screen', () => {
    const email = buildToolResultEmail('tool_calculator', validResult);
    const values = email.rows.map((r) => r.value);
    expect(values).toContain('$200.00 per day');
    expect(values).toContain('$6,000.00');
    expect(email.rows.some((r) => r.value.includes('45 days'))).toBe(true);
  });

  it('makes the 30-day statutory cap visible when it applied', () => {
    const email = buildToolResultEmail('tool_calculator', validResult);
    expect(email.rows.some((r) => r.value.includes('capped at 30'))).toBe(true);
  });

  it('formats cents rather than dropping them', () => {
    const email = buildToolResultEmail('tool_calculator', {
      dailyWage: 142.466,
      penalty: 1424.66,
      effectiveDays: 10,
    });
    expect(email.subject).toContain('$1,424.66');
  });

  // An email headed "here is your result" with no result is worse than none.
  it.each([
    ['no data at all', {}],
    ['a missing penalty', { dailyWage: 200, effectiveDays: 30 }],
    ['a non-numeric penalty', { dailyWage: 200, penalty: 'lots', effectiveDays: 30 }],
    ['a negative penalty', { dailyWage: 200, penalty: -5, effectiveDays: 30 }],
  ])('sends nothing given %s', (_label, data) => {
    expect(buildToolResultEmail('tool_calculator', data)).toBeNull();
  });

  it('still sends when only the optional days-entered field is missing', () => {
    const email = buildToolResultEmail('tool_calculator', {
      dailyWage: 200,
      penalty: 6000,
      effectiveDays: 30,
    });
    expect(email).not.toBeNull();
    expect(email.rows.length).toBeGreaterThan(0);
  });
});

describe('classification results', () => {
  it('reports a contractor outcome', () => {
    const email = buildToolResultEmail('tool_classification', { outcome: 'contractor' });
    expect(email.subject).toContain('contractor');
    expect(email.rows[0].value).toBe('Likely an independent contractor');
  });

  it('reports an employee outcome with the misclassification stakes', () => {
    const email = buildToolResultEmail('tool_classification', { outcome: 'employee' });
    expect(email.subject).toContain('employee');
    expect(email.intro).toContain('$5,000');
  });

  // Defaulting an unknown value to "contractor" would tell someone their worker
  // passed a test they never took. Employee is both the safer default and the
  // legal presumption under AB5.
  it.each([['missing', {}], ['unrecognized', { outcome: 'maybe' }], ['null', null]])(
    'defaults a %s outcome to employee',
    (_label, data) => {
      const email = buildToolResultEmail('tool_classification', data);
      expect(email.rows[0].value).toBe('Likely an employee');
    }
  );
});

describe('checklist results', () => {
  it('reports progress and what is left', () => {
    const email = buildToolResultEmail('tool_checklist', { completed: 4, total: 16 });
    expect(email.subject).toContain('25%');
    expect(email.rows.map((r) => r.value)).toContain('4 of 16 items');
    expect(email.rows.map((r) => r.value)).toContain('12 items');
  });

  it('says so plainly when everything is done', () => {
    const email = buildToolResultEmail('tool_checklist', { completed: 16, total: 16 });
    expect(email.subject).toContain('100%');
    expect(email.rows.map((r) => r.value)).toContain('Nothing — all items covered');
  });

  it('uses the singular for a single remaining item', () => {
    const email = buildToolResultEmail('tool_checklist', { completed: 15, total: 16 });
    expect(email.rows.map((r) => r.value)).toContain('1 item');
  });

  it('sends nothing rather than dividing by zero', () => {
    expect(buildToolResultEmail('tool_checklist', { completed: 0, total: 0 })).toBeNull();
    expect(buildToolResultEmail('tool_checklist', {})).toBeNull();
  });
});

describe('final wage guide', () => {
  it('sends the deadlines even though the page has no per-visitor result', () => {
    const email = buildToolResultEmail('tool_final_wage', null);
    expect(email).not.toBeNull();
    expect(email.rows.map((r) => r.label)).toContain('Fired or laid off');
    expect(email.rows.map((r) => r.value)).toContain('Within 72 hours');
  });
});

describe('sources with no result', () => {
  // These capture an email without producing anything to report, so they must
  // not trigger a "here are your results" email about nothing.
  it.each(['pricing', 'blog', 'compare', 'demo', 'newsletter'])(
    'sends nothing for %s',
    (source) => {
      expect(buildToolResultEmail(source, { penalty: 100 })).toBeNull();
    }
  );
});

describe('untrusted input', () => {
  it('ignores non-object payloads instead of throwing', () => {
    expect(() => buildToolResultEmail('tool_calculator', 'not an object')).not.toThrow();
    expect(buildToolResultEmail('tool_calculator', 'not an object')).toBeNull();
    expect(buildToolResultEmail('tool_calculator', [1, 2, 3])).toBeNull();
  });

  it('coerces numeric strings, since form values arrive as text', () => {
    const email = buildToolResultEmail('tool_calculator', {
      dailyWage: '200',
      penalty: '6000',
      effectiveDays: '30',
    });
    expect(email.subject).toContain('$6,000.00');
  });

  it('every tool email carries the legal disclaimer', () => {
    for (const source of [
      'tool_classification',
      'tool_final_wage',
    ]) {
      expect(buildToolResultEmail(source, {}).note).toContain('not legal advice');
    }
  });
});
