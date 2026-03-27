// State-by-State Compliance Configuration
// Data-driven rules that can be updated as laws change
// Each state has its own classification test, wage rules, and compliance requirements

export interface StateComplianceRules {
  stateCode: string;
  stateName: string;
  enabled: boolean;
  lastUpdated: string; // ISO date — when these rules were last verified
  sourceUrl: string; // Official state labor department URL
  effectiveDate: string; // When these rules took effect

  classification: {
    testType: 'abc_test' | 'common_law' | 'irs_20_factor' | 'economic_reality' | 'hybrid';
    testName: string;
    description: string;
    prongs: ClassificationProng[];
    defaultClassification: 'employee'; // Most states default to employee
    penaltyRange: string;
    notes: string;
  };

  wage: {
    minimumWage: number;
    minimumWageEffectiveDate: string;
    tippedMinimumWage: number | null;
    localMinimumWageOverrides: { locality: string; rate: number }[];
    overtimeThresholdDaily: number | null; // null = no daily OT (most states)
    overtimeThresholdWeekly: number;
    overtimeMultiplier: number;
    doubleTimeThresholdDaily: number | null; // Only CA and a few others
    doubleTimeMultiplier: number | null;
  };

  breaks: {
    mealBreakRequired: boolean;
    mealBreakAfterHours: number | null;
    mealBreakDurationMinutes: number | null;
    restBreakRequired: boolean;
    restBreakPerHours: number | null;
    restBreakDurationMinutes: number | null;
    breakWaiverAllowed: boolean;
    penaltyForMissedBreak: string | null;
  };

  contractor: {
    w9Required: boolean;
    writtenContractRequired: boolean;
    insuranceRequired: boolean;
    licensingNotes: string;
    paymentTermsNotes: string;
    annualReportingForm: string; // Usually 1099-NEC
    reportingThreshold: number; // Usually $600
  };

  finalPay: {
    terminationDeadline: string;
    quitWithNoticeDeadline: string;
    quitWithoutNoticeDeadline: string;
    waitingTimePenalty: boolean;
    waitingTimePenaltyMaxDays: number | null;
  };
}

export interface ClassificationProng {
  letter: string; // A, B, C or numbered
  title: string;
  description: string;
  employeeAnswer: string; // What answer = employee
  contractorAnswer: string; // What answer = contractor
}

// ============================================================
// STATE COMPLIANCE DATABASE
// Update these as laws change. Each entry includes lastUpdated
// so users know how current the rules are.
// ============================================================

export const STATE_COMPLIANCE: Record<string, StateComplianceRules> = {
  CA: {
    stateCode: 'CA',
    stateName: 'California',
    enabled: true,
    lastUpdated: '2026-01-01',
    sourceUrl: 'https://www.dir.ca.gov/dlse/',
    effectiveDate: '2024-01-01',

    classification: {
      testType: 'abc_test',
      testName: 'ABC Test (AB5)',
      description: 'California presumes all workers are employees. The hiring entity must prove all three prongs of the ABC test to classify a worker as an independent contractor.',
      prongs: [
        {
          letter: 'A',
          title: 'Freedom from Control',
          description: 'The worker is free from the control and direction of the hiring entity in connection with the performance of the work, both under the contract and in fact.',
          employeeAnswer: 'The company controls when, where, or how the work is done',
          contractorAnswer: 'The worker controls their own methods, schedule, and processes',
        },
        {
          letter: 'B',
          title: 'Outside Usual Business',
          description: 'The worker performs work that is outside the usual course of the hiring entity\'s business.',
          employeeAnswer: 'The work is a core part of the company\'s business',
          contractorAnswer: 'The work is outside the company\'s usual business operations',
        },
        {
          letter: 'C',
          title: 'Independent Business',
          description: 'The worker is customarily engaged in an independently established trade, occupation, or business of the same nature as the work performed.',
          employeeAnswer: 'The worker does not have their own independent business',
          contractorAnswer: 'The worker has their own business, serves other clients, and markets their services',
        },
      ],
      defaultClassification: 'employee',
      penaltyRange: '$5,000–$25,000 per willful misclassification',
      notes: 'All three prongs (A, B, and C) must be satisfied to classify as 1099. Failure on any single prong = employee.',
    },

    wage: {
      minimumWage: 16.50,
      minimumWageEffectiveDate: '2026-01-01',
      tippedMinimumWage: null, // CA has no tip credit
      localMinimumWageOverrides: [
        { locality: 'San Francisco', rate: 18.67 },
        { locality: 'Los Angeles', rate: 17.28 },
        { locality: 'San Jose', rate: 17.55 },
        { locality: 'Berkeley', rate: 18.07 },
        { locality: 'Emeryville', rate: 19.36 },
      ],
      overtimeThresholdDaily: 8,
      overtimeThresholdWeekly: 40,
      overtimeMultiplier: 1.5,
      doubleTimeThresholdDaily: 12,
      doubleTimeMultiplier: 2.0,
    },

    breaks: {
      mealBreakRequired: true,
      mealBreakAfterHours: 5,
      mealBreakDurationMinutes: 30,
      restBreakRequired: true,
      restBreakPerHours: 4,
      restBreakDurationMinutes: 10,
      breakWaiverAllowed: true, // Only for shifts under 6 hours (meal)
      penaltyForMissedBreak: '1 hour of pay at regular rate per missed break',
    },

    contractor: {
      w9Required: true,
      writtenContractRequired: true,
      insuranceRequired: true,
      licensingNotes: 'CSLB license required for construction work over $500. Verify at cslb.ca.gov.',
      paymentTermsNotes: 'No state-mandated payment terms for contractors, but prompt payment recommended.',
      annualReportingForm: '1099-NEC',
      reportingThreshold: 600,
    },

    finalPay: {
      terminationDeadline: 'Immediately (same day)',
      quitWithNoticeDeadline: 'Last day of employment (if 72+ hours notice)',
      quitWithoutNoticeDeadline: 'Within 72 hours',
      waitingTimePenalty: true,
      waitingTimePenaltyMaxDays: 30,
    },
  },

  TX: {
    stateCode: 'TX',
    stateName: 'Texas',
    enabled: true,
    lastUpdated: '2026-01-01',
    sourceUrl: 'https://www.twc.texas.gov/',
    effectiveDate: '2024-01-01',

    classification: {
      testType: 'common_law',
      testName: 'Common Law (Right to Control) Test',
      description: 'Texas uses the common law right-to-control test. The key factor is whether the employer has the right to control not just what work is done, but how it is done.',
      prongs: [
        {
          letter: '1',
          title: 'Right to Control',
          description: 'Does the employer have the right to control the details of how the work is performed, not just the end result?',
          employeeAnswer: 'The employer controls the methods, tools, schedule, and process',
          contractorAnswer: 'The employer only controls the end result, not the process',
        },
        {
          letter: '2',
          title: 'Financial Control',
          description: 'Does the worker have a significant investment in equipment, unreimbursed expenses, and the opportunity for profit or loss?',
          employeeAnswer: 'The employer provides all tools and bears all financial risk',
          contractorAnswer: 'The worker has significant investment and risk of profit/loss',
        },
        {
          letter: '3',
          title: 'Relationship Type',
          description: 'Is there a written contract? Are there employee benefits? Is the relationship permanent or project-based?',
          employeeAnswer: 'Ongoing relationship with benefits and no written contractor agreement',
          contractorAnswer: 'Project-based with written contract and no employee benefits',
        },
      ],
      defaultClassification: 'employee',
      penaltyRange: 'Up to $200 per day per misclassified worker (TWC)',
      notes: 'Texas has no state income tax, but misclassification still carries TWC unemployment insurance penalties and federal tax liability.',
    },

    wage: {
      minimumWage: 7.25, // Federal minimum — Texas has no state minimum above federal
      minimumWageEffectiveDate: '2009-07-24',
      tippedMinimumWage: 2.13,
      localMinimumWageOverrides: [], // Texas preempts local wage laws
      overtimeThresholdDaily: null, // No daily OT in Texas
      overtimeThresholdWeekly: 40,
      overtimeMultiplier: 1.5,
      doubleTimeThresholdDaily: null,
      doubleTimeMultiplier: null,
    },

    breaks: {
      mealBreakRequired: false,
      mealBreakAfterHours: null,
      mealBreakDurationMinutes: null,
      restBreakRequired: false,
      restBreakPerHours: null,
      restBreakDurationMinutes: null,
      breakWaiverAllowed: true,
      penaltyForMissedBreak: null,
    },

    contractor: {
      w9Required: true,
      writtenContractRequired: false, // Recommended but not legally mandated
      insuranceRequired: false, // Depends on trade; required for licensed contractors
      licensingNotes: 'Texas does not have a general contractor license. Electrical, plumbing, and HVAC require state licenses. Some cities require local permits.',
      paymentTermsNotes: 'Texas Prompt Payment Act: government contracts must be paid within 30 days. Private contracts follow agreement terms.',
      annualReportingForm: '1099-NEC',
      reportingThreshold: 600,
    },

    finalPay: {
      terminationDeadline: 'Within 6 calendar days',
      quitWithNoticeDeadline: 'Next regular payday',
      quitWithoutNoticeDeadline: 'Next regular payday',
      waitingTimePenalty: false,
      waitingTimePenaltyMaxDays: null,
    },
  },

  FL: {
    stateCode: 'FL',
    stateName: 'Florida',
    enabled: true,
    lastUpdated: '2026-01-01',
    sourceUrl: 'https://www.myfloridalicense.com/',
    effectiveDate: '2024-09-30',

    classification: {
      testType: 'common_law',
      testName: 'Common Law + Statutory Test',
      description: 'Florida uses a hybrid approach: common law right-to-control for most purposes, with a statutory test for unemployment compensation (F.S. 440 and 443).',
      prongs: [
        {
          letter: '1',
          title: 'Right to Control',
          description: 'Does the employer control the manner and means of performing the work?',
          employeeAnswer: 'The employer directs how, when, and where work is performed',
          contractorAnswer: 'The worker controls their own methods and schedule',
        },
        {
          letter: '2',
          title: 'Business Independence',
          description: 'Does the worker operate an independent business? Do they have their own clients, tools, and liability?',
          employeeAnswer: 'The worker depends primarily on this one company for income',
          contractorAnswer: 'The worker has their own business entity, insurance, and multiple clients',
        },
        {
          letter: '3',
          title: 'Permanence',
          description: 'Is the working relationship ongoing and indefinite, or project-based with a defined scope?',
          employeeAnswer: 'Open-ended, ongoing relationship',
          contractorAnswer: 'Defined project scope with start and end dates',
        },
      ],
      defaultClassification: 'employee',
      penaltyRange: '$1,000 per misclassified worker + back wages + unemployment insurance',
      notes: 'Florida law (2023 SB 1718) requires E-Verify for employers with 25+ employees. Hurricane-related contractor licensing is strictly enforced.',
    },

    wage: {
      minimumWage: 14.00,
      minimumWageEffectiveDate: '2025-09-30',
      tippedMinimumWage: 10.00,
      localMinimumWageOverrides: [], // Florida preempts local wage laws
      overtimeThresholdDaily: null,
      overtimeThresholdWeekly: 40,
      overtimeMultiplier: 1.5,
      doubleTimeThresholdDaily: null,
      doubleTimeMultiplier: null,
    },

    breaks: {
      mealBreakRequired: false, // Only for minors
      mealBreakAfterHours: null,
      mealBreakDurationMinutes: null,
      restBreakRequired: false,
      restBreakPerHours: null,
      restBreakDurationMinutes: null,
      breakWaiverAllowed: true,
      penaltyForMissedBreak: null,
    },

    contractor: {
      w9Required: true,
      writtenContractRequired: false,
      insuranceRequired: true, // Required for licensed contractors
      licensingNotes: 'Florida requires state licensing for general, building, and specialty contractors (DBPR). Hurricane repair work requires additional certification. Unlicensed contracting is a felony for work over $1,000.',
      paymentTermsNotes: 'Florida Prompt Payment Act (F.S. 218.70): payment due within terms of contract. Interest accrues after due date.',
      annualReportingForm: '1099-NEC',
      reportingThreshold: 600,
    },

    finalPay: {
      terminationDeadline: 'Next regular payday',
      quitWithNoticeDeadline: 'Next regular payday',
      quitWithoutNoticeDeadline: 'Next regular payday',
      waitingTimePenalty: false,
      waitingTimePenaltyMaxDays: null,
    },
  },

  NY: {
    stateCode: 'NY',
    stateName: 'New York',
    enabled: true,
    lastUpdated: '2026-01-01',
    sourceUrl: 'https://dol.ny.gov/',
    effectiveDate: '2024-01-01',

    classification: {
      testType: 'hybrid',
      testName: 'Common Law + ABC Test (context-dependent)',
      description: 'New York uses different tests depending on context: the common law test for most employment purposes, and the ABC test specifically for unemployment insurance (Labor Law §862). The stricter test applies.',
      prongs: [
        {
          letter: 'A',
          title: 'Direction & Control',
          description: 'Does the employer direct and control the manner in which the work is performed? This includes control over schedule, methods, and work location.',
          employeeAnswer: 'The employer exercises significant control over how work is performed',
          contractorAnswer: 'The worker has meaningful autonomy over methods and schedule',
        },
        {
          letter: 'B',
          title: 'Nature of Work',
          description: 'Is the work performed a core part of the employer\'s business, or is it ancillary/incidental?',
          employeeAnswer: 'The work is integral to the employer\'s primary business',
          contractorAnswer: 'The work is outside the employer\'s core business operations',
        },
        {
          letter: 'C',
          title: 'Independent Enterprise',
          description: 'Does the worker have an independently established business that serves multiple clients?',
          employeeAnswer: 'The worker does not maintain a separate business',
          contractorAnswer: 'The worker operates their own established business with other clients',
        },
      ],
      defaultClassification: 'employee',
      penaltyRange: '$2,500 per misclassified worker (first offense), $5,000 per worker (subsequent)',
      notes: 'New York has aggressive wage theft enforcement. The Wage Theft Prevention Act requires written wage notices. Paid Family Leave applies to W-2 employees.',
    },

    wage: {
      minimumWage: 16.50,
      minimumWageEffectiveDate: '2026-01-01',
      tippedMinimumWage: 11.00,
      localMinimumWageOverrides: [
        { locality: 'New York City', rate: 16.50 },
        { locality: 'Long Island (Nassau/Suffolk)', rate: 16.50 },
        { locality: 'Westchester County', rate: 16.50 },
      ],
      overtimeThresholdDaily: null,
      overtimeThresholdWeekly: 40,
      overtimeMultiplier: 1.5,
      doubleTimeThresholdDaily: null,
      doubleTimeMultiplier: null,
    },

    breaks: {
      mealBreakRequired: true,
      mealBreakAfterHours: 6,
      mealBreakDurationMinutes: 30,
      restBreakRequired: false,
      restBreakPerHours: null,
      restBreakDurationMinutes: null,
      breakWaiverAllowed: false,
      penaltyForMissedBreak: 'Penalties under NY Labor Law §162',
    },

    contractor: {
      w9Required: true,
      writtenContractRequired: true, // Strongly recommended; required for certain trades
      insuranceRequired: true,
      licensingNotes: 'NYC requires Home Improvement Contractor (HIC) license. NY State has trade-specific licenses (electrical, plumbing). General contracting does not require a state license outside NYC.',
      paymentTermsNotes: 'NY Prompt Payment Act: private construction contracts must be paid within 30 days of invoice.',
      annualReportingForm: '1099-NEC',
      reportingThreshold: 600,
    },

    finalPay: {
      terminationDeadline: 'Next regular payday',
      quitWithNoticeDeadline: 'Next regular payday',
      quitWithoutNoticeDeadline: 'Next regular payday',
      waitingTimePenalty: false,
      waitingTimePenaltyMaxDays: null,
    },
  },

  IL: {
    stateCode: 'IL',
    stateName: 'Illinois',
    enabled: true,
    lastUpdated: '2026-01-01',
    sourceUrl: 'https://www.illinois.gov/idol/',
    effectiveDate: '2024-01-01',

    classification: {
      testType: 'abc_test',
      testName: 'ABC Test (Illinois Employee Classification Act)',
      description: 'Illinois uses the ABC test under the Employee Classification Act (820 ILCS 185). Construction industry is specifically targeted — contractors in construction face the strictest enforcement.',
      prongs: [
        {
          letter: 'A',
          title: 'Free from Control',
          description: 'The individual is free from control and direction over the performance of the work, both under contract and in fact.',
          employeeAnswer: 'The employer controls how, when, or where work is done',
          contractorAnswer: 'The worker exercises full control over their work methods and schedule',
        },
        {
          letter: 'B',
          title: 'Outside Usual Course of Business',
          description: 'The service is performed outside the usual course of business of the employer.',
          employeeAnswer: 'The work is part of the employer\'s core business',
          contractorAnswer: 'The work is ancillary to the employer\'s primary business',
        },
        {
          letter: 'C',
          title: 'Independently Established Trade',
          description: 'The individual is engaged in an independently established trade, occupation, profession, or business.',
          employeeAnswer: 'The worker does not operate their own independent business',
          contractorAnswer: 'The worker has an established independent business serving multiple clients',
        },
      ],
      defaultClassification: 'employee',
      penaltyRange: '$1,500 per violation (first offense), $2,500 per violation (subsequent) + criminal penalties possible',
      notes: 'The Day and Temporary Labor Services Act (820 ILCS 175) has additional rules for temporary workers. Construction industry is specifically covered by the Employee Classification Act.',
    },

    wage: {
      minimumWage: 15.00,
      minimumWageEffectiveDate: '2025-01-01',
      tippedMinimumWage: 9.00,
      localMinimumWageOverrides: [
        { locality: 'Chicago', rate: 16.20 },
        { locality: 'Cook County', rate: 14.05 },
      ],
      overtimeThresholdDaily: null,
      overtimeThresholdWeekly: 40,
      overtimeMultiplier: 1.5,
      doubleTimeThresholdDaily: null,
      doubleTimeMultiplier: null,
    },

    breaks: {
      mealBreakRequired: true,
      mealBreakAfterHours: 7.5,
      mealBreakDurationMinutes: 20,
      restBreakRequired: false,
      restBreakPerHours: null,
      restBreakDurationMinutes: null,
      breakWaiverAllowed: false,
      penaltyForMissedBreak: 'Penalties under One Day Rest in Seven Act',
    },

    contractor: {
      w9Required: true,
      writtenContractRequired: true,
      insuranceRequired: true,
      licensingNotes: 'Illinois requires licensing for roofing contractors statewide. Electrical, plumbing, and HVAC require local licenses in most jurisdictions. Chicago has its own licensing system.',
      paymentTermsNotes: 'Illinois Prompt Payment Act: commercial invoices due within 60 days unless contract specifies otherwise.',
      annualReportingForm: '1099-NEC',
      reportingThreshold: 600,
    },

    finalPay: {
      terminationDeadline: 'Next regular payday',
      quitWithNoticeDeadline: 'Next regular payday',
      quitWithoutNoticeDeadline: 'Next regular payday',
      waitingTimePenalty: true,
      waitingTimePenaltyMaxDays: null, // 2% penalty per month, no cap
    },
  },
};

// Helper: get rules for a state, with fallback to federal defaults
export function getStateRules(stateCode: string): StateComplianceRules | null {
  return STATE_COMPLIANCE[stateCode] || null;
}

// Helper: get all enabled states
export function getEnabledStates(): StateComplianceRules[] {
  return Object.values(STATE_COMPLIANCE).filter(s => s.enabled);
}

// Helper: check if state rules are stale (older than 6 months)
export function isRulesStale(stateCode: string): boolean {
  const rules = STATE_COMPLIANCE[stateCode];
  if (!rules) return true;
  const lastUpdated = new Date(rules.lastUpdated);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return lastUpdated < sixMonthsAgo;
}

// Helper: get classification test name for display
export function getTestDisplayName(stateCode: string): string {
  const rules = STATE_COMPLIANCE[stateCode];
  if (!rules) return 'Federal Common Law Test';
  return rules.classification.testName;
}
