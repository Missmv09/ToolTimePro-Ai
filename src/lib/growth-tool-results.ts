/**
 * Free tool result emails — content assembly.
 *
 * The capture form promises "we'll email you this result", so the email has to
 * contain the actual numbers the visitor just saw, not a generic "thanks for
 * your interest". That means the result travels from the tool through the
 * capture form to the API, and this module turns it into structured content.
 *
 * Structure rather than HTML: the rendering lives in src/lib/email.ts with the
 * rest of the branded templates, and keeping the two apart means the content
 * rules (which numbers, what wording, which tools even get an email) are unit
 * testable without asserting on markup.
 *
 * Everything here treats its input as untrusted — the result payload is posted
 * by the browser, so values are coerced and bounded rather than believed.
 */

import type { LeadSource } from './growth-leads';

export interface ResultRow {
  label: string;
  value: string;
}

export interface ToolResultEmail {
  subject: string;
  heading: string;
  intro: string;
  rows: ResultRow[];
  /** Optional caveat shown under the result, e.g. a legal disclaimer. */
  note?: string;
  ctaText: string;
  ctaPath: string;
}

/** Coerce to a finite, non-negative number, or null. */
function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function money(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function plural(count: number, singular: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : `${singular}s`}`;
}

const LEGAL_NOTE =
  'This is an estimate for general information only and is not legal advice. ' +
  'Consult an employment attorney about your specific situation.';

/**
 * Build the email for a completed tool, or null when this source has no result
 * worth emailing.
 *
 * Returning null is meaningful: the API route uses it to decide whether to send
 * at all, so a lead captured from the pricing page never triggers a "here are
 * your results" email about results that don't exist.
 */
export function buildToolResultEmail(source: LeadSource, data: unknown): ToolResultEmail | null {
  const result = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  switch (source) {
    case 'tool_calculator':
      return buildCalculatorEmail(result);
    case 'tool_classification':
      return buildClassificationEmail(result);
    case 'tool_checklist':
      return buildChecklistEmail(result);
    case 'tool_final_wage':
      return buildFinalWageEmail();
    default:
      return null;
  }
}

function buildCalculatorEmail(result: Record<string, unknown>): ToolResultEmail | null {
  const penalty = num(result.penalty);
  const dailyWage = num(result.dailyWage);
  const effectiveDays = num(result.effectiveDays);

  // Without the penalty there is no result to report, and an email that says
  // "here is your result" followed by nothing is worse than no email.
  if (penalty === null || dailyWage === null || effectiveDays === null) return null;

  const daysEntered = num(result.daysEntered);
  const rows: ResultRow[] = [
    { label: 'Daily wage rate', value: `${money(dailyWage)} per day` },
  ];

  if (daysEntered !== null) {
    rows.push({ label: 'Days late', value: plural(Math.round(daysEntered), 'day') });
  }

  rows.push(
    {
      label: 'Waiting-time days applied',
      value: `${plural(Math.round(effectiveDays), 'day')} (capped at 30)`,
    },
    { label: 'Estimated penalty', value: money(penalty) }
  );

  return {
    subject: `Your waiting-time penalty estimate: ${money(penalty)}`,
    heading: 'Your final pay penalty estimate',
    intro:
      'Here is the estimate you ran on the Task Iguana waiting-time penalty calculator. ' +
      'California Labor Code section 203 penalties accrue at the daily wage rate for up to 30 days.',
    rows,
    note: LEGAL_NOTE,
    ctaText: 'Run another estimate',
    ctaPath: '/tools/calculator',
  };
}

function buildClassificationEmail(result: Record<string, unknown>): ToolResultEmail | null {
  const outcome = result.outcome === 'contractor' ? 'contractor' : 'employee';

  const rows: ResultRow[] = [
    {
      label: 'ABC test result',
      value:
        outcome === 'contractor'
          ? 'Likely an independent contractor'
          : 'Likely an employee',
    },
  ];

  return {
    subject:
      outcome === 'contractor'
        ? 'Your worker classification result: likely a contractor'
        : 'Your worker classification result: likely an employee',
    heading: 'Your worker classification result',
    intro:
      outcome === 'contractor'
        ? 'Based on your answers, this worker passes all three prongs of the ABC test. ' +
          'Keep documentation of each prong on file — the burden of proof sits with you, not the worker.'
        : 'Based on your answers, this worker fails at least one prong of the ABC test, ' +
          'which means they should most likely be classified as an employee. ' +
          'Misclassification penalties in California run from $5,000 to $25,000 per violation.',
    rows,
    note: LEGAL_NOTE,
    ctaText: 'Re-run the test',
    ctaPath: '/tools/classification',
  };
}

function buildChecklistEmail(result: Record<string, unknown>): ToolResultEmail | null {
  const completed = num(result.completed);
  const total = num(result.total);
  if (completed === null || total === null || total === 0) return null;

  const remaining = Math.max(0, Math.round(total) - Math.round(completed));
  const percent = Math.round((completed / total) * 100);

  return {
    subject: `Your compliance checklist: ${percent}% complete`,
    heading: 'Your compliance checklist progress',
    intro:
      'Here is where you left off on the AB5 compliance checklist. ' +
      'Open it again any time to pick up where you stopped.',
    rows: [
      { label: 'Completed', value: `${Math.round(completed)} of ${Math.round(total)} items` },
      { label: 'Progress', value: `${percent}%` },
      {
        label: 'Still to do',
        value: remaining === 0 ? 'Nothing — all items covered' : plural(remaining, 'item'),
      },
    ],
    note: LEGAL_NOTE,
    ctaText: 'Open the checklist',
    ctaPath: '/tools/checklist',
  };
}

function buildFinalWageEmail(): ToolResultEmail {
  // This page is a reference guide, not a calculator, so there is no per-visitor
  // result. The deadlines are the thing worth having in an inbox.
  return {
    subject: 'Your California final pay deadlines guide',
    heading: 'California final pay deadlines',
    intro:
      'Here are the final paycheck deadlines by termination type, so you have them ' +
      'on hand when you need them.',
    rows: [
      { label: 'Fired or laid off', value: 'Immediately, on the last day' },
      { label: 'Quit with no notice', value: 'Within 72 hours' },
      { label: 'Quit with 72+ hours notice', value: 'On the last day worked' },
      { label: 'Seasonal / job completion', value: 'Within 72 hours' },
      { label: 'Late payment penalty', value: 'Daily wage x days late, up to 30 days' },
    ],
    note: LEGAL_NOTE,
    ctaText: 'Estimate a penalty',
    ctaPath: '/tools/calculator',
  };
}
