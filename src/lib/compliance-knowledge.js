// Multi-State Compliance Knowledge Base
// Structured legal reference data injected into AI prompts for accuracy.
// Sources: state labor department websites, verified as of 2026-01.
//
// This module provides state-specific compliance knowledge that gets injected
// into Jenny AI prompts so the AI cites real codes, not hallucinated ones.
// It works alongside src/lib/state-compliance.ts which holds the structured rules.

// ============================================================
// STATE COMPLIANCE KNOWLEDGE — Authoritative Reference Data
// Each entry contains: labor codes, penalties, key rules with citations
// ============================================================

const STATE_KNOWLEDGE = {
  CA: {
    stateName: 'California',
    laborDept: 'Department of Industrial Relations (DIR) / DLSE',
    laborDeptUrl: 'https://www.dir.ca.gov/dlse/',

    mealBreaks: {
      rule: '30-minute unpaid meal break before end of 5th hour; second 30-minute break before end of 10th hour',
      waiver: 'First meal break waivable if shift ≤ 6 hours (mutual consent). Second waivable if shift ≤ 12 hours AND first was not waived.',
      penalty: '1 hour premium pay at regular rate per missed break per workday',
      code: 'Labor Code §512; IWC Wage Orders',
      caselaw: 'Brinker Restaurant Corp. v. Superior Court (2012) — employer must provide, not ensure breaks are taken',
    },

    restBreaks: {
      rule: '10-minute paid rest break per 4 hours worked (or major fraction thereof)',
      timing: 'Middle of each work period insofar as practicable',
      penalty: '1 hour premium pay at regular rate per missed break per workday',
      code: 'Labor Code §226.7; IWC Wage Orders',
    },

    overtime: {
      daily: '1.5x after 8 hours/day; 2x after 12 hours/day',
      weekly: '1.5x after 40 hours/week',
      seventhDay: '1.5x for first 8 hours on 7th consecutive day; 2x after 8 hours',
      code: 'Labor Code §510',
      note: 'California is one of few states with DAILY overtime — most states only have weekly',
    },

    minimumWage: {
      statewide: '$16.50/hour (2025)',
      localOverrides: [
        'San Francisco: $18.67',
        'Los Angeles: $17.28',
        'San Jose: $17.55',
        'Berkeley: $18.07',
        'Emeryville: $19.36',
      ],
      tipCredit: 'None — California does not allow tip credits',
      code: 'Labor Code §1182.12',
    },

    workerClassification: {
      test: 'ABC Test (AB5 — Assembly Bill 5)',
      prongs: [
        'A: Worker is free from control and direction (both contractually and in fact)',
        'B: Worker performs work outside the usual course of the hiring entity\'s business',
        'C: Worker is customarily engaged in an independently established trade/business',
      ],
      burden: 'ALL three prongs must be proven by the HIRING ENTITY to classify as 1099',
      penalty: '$5,000–$25,000 per willful misclassification; $10,000–$25,000 per pattern violation',
      code: 'Labor Code §2775 (AB5); Dynamex Operations West v. Superior Court (2018)',
      paga: 'PAGA allows employees to file representative actions for labor code violations — penalties of $100 per employee per pay period (first), $200 subsequent',
    },

    finalPay: {
      fired: 'Immediately — same day (Labor Code §201)',
      quitWithNotice: 'Last day of employment if 72+ hours notice (Labor Code §202)',
      quitWithoutNotice: 'Within 72 hours (Labor Code §202)',
      penalty: 'Waiting time penalty: 1 day of wages per day late, up to 30 days (Labor Code §203)',
      mustInclude: 'All earned wages, accrued unused vacation/PTO, commissions, expense reimbursements',
    },

    sickLeave: {
      minimum: '5 days / 40 hours per year (SB 616, effective 2024)',
      accrual: '1 hour per 30 hours worked, or frontload at start of year',
      usage: 'Available after 90 days of employment',
      code: 'Labor Code §245-249',
    },

    heatIllness: {
      rule: 'Outdoor workers: access to shade, water, rest when temp exceeds 80°F; high-heat procedures at 95°F',
      requirements: 'Written Heat Illness Prevention Plan required; training required',
      code: 'Cal/OSHA Title 8 §3395',
    },

    harassment: {
      training: 'Required for employers with 5+ employees: 2 hours for supervisors, 1 hour for non-supervisory (SB 1343)',
      frequency: 'Within 6 months of hire, then every 2 years',
      code: 'Government Code §12950.1',
    },
  },

  TX: {
    stateName: 'Texas',
    laborDept: 'Texas Workforce Commission (TWC)',
    laborDeptUrl: 'https://www.twc.texas.gov/',

    mealBreaks: {
      rule: 'No state requirement for meal or rest breaks for adult employees',
      note: 'Federal FLSA requires breaks under 20 minutes to be paid. Texas follows federal law only.',
      code: 'Texas follows FLSA — 29 U.S.C. §207',
    },

    restBreaks: {
      rule: 'No state requirement for rest breaks',
      note: 'Breaks of 20 minutes or less must be paid under FLSA',
    },

    overtime: {
      daily: 'None — Texas has no daily overtime',
      weekly: '1.5x after 40 hours/week (FLSA)',
      code: 'FLSA 29 U.S.C. §207; Texas Labor Code Ch. 62',
      note: 'Texas relies entirely on federal FLSA for overtime. No state-level overtime enhancements.',
    },

    minimumWage: {
      statewide: '$7.25/hour (federal minimum — Texas has no higher state minimum)',
      localOverrides: ['Texas preempts all local minimum wage ordinances (TX Gov Code §2258.0515)'],
      tipCredit: '$2.13/hour tipped minimum (must reach $7.25 with tips)',
      code: 'Texas Labor Code Ch. 62; FLSA §203(m)',
    },

    workerClassification: {
      test: 'Common Law Right-to-Control Test',
      factors: [
        'Right to control details of work performance',
        'Worker\'s investment in equipment/facilities',
        'Opportunity for profit or loss',
        'Right to discharge without breach',
        'Whether work is part of employer\'s regular business',
        'Permanency of the relationship',
      ],
      penalty: 'Up to $200/day per misclassified worker (TWC); federal tax penalties (IRS)',
      code: 'Texas Labor Code §201.041; TWC guidelines',
      note: 'No state income tax, but misclassification carries UI tax penalties and federal liability',
    },

    finalPay: {
      fired: 'Within 6 calendar days (Texas Payday Law)',
      quit: 'Next regularly scheduled payday',
      penalty: 'TWC can order payment of wages + penalties',
      code: 'Texas Labor Code §61.014, §61.015',
    },

    sickLeave: {
      minimum: 'No state requirement (some cities had ordinances but enforcement is preempted)',
      note: 'Austin, San Antonio, and Dallas passed sick leave ordinances but state preemption and court rulings have blocked enforcement',
      code: 'Texas Government Code §2258',
    },

    heatIllness: {
      rule: 'No state-specific standard (OSHA General Duty Clause applies)',
      note: 'Texas passed HB 2127 (2023) preempting local heat protection ordinances. Federal OSHA proposing heat standard.',
      code: 'OSHA General Duty Clause — 29 U.S.C. §654(a)(1)',
    },
  },

  FL: {
    stateName: 'Florida',
    laborDept: 'Florida Department of Economic Opportunity (DEO)',
    laborDeptUrl: 'https://www.floridajobs.org/',

    mealBreaks: {
      rule: 'No state requirement for meal breaks for adult employees',
      minors: 'Employees under 18 must receive a 30-minute break after 4 consecutive hours',
      code: 'Florida Statutes §450.081 (minors only)',
    },

    restBreaks: {
      rule: 'No state requirement for rest breaks',
    },

    overtime: {
      daily: 'None — Florida has no daily overtime',
      weekly: '1.5x after 40 hours/week (FLSA)',
      code: 'FLSA; Florida Constitution Art. X §24 (minimum wage only)',
      note: 'Florida relies on federal FLSA for overtime.',
    },

    minimumWage: {
      statewide: '$14.00/hour (effective September 30, 2025)',
      trajectory: '$15.00/hour effective September 30, 2026 — then indexed to CPI',
      localOverrides: ['Florida preempts local wage laws'],
      tipCredit: '$10.00/hour tipped minimum (must reach $14.00 with tips)',
      code: 'Florida Constitution Art. X §24 (Amendment 2, 2020)',
    },

    workerClassification: {
      test: 'Common Law + F.S. 440/443 Statutory Test',
      factors: [
        'Right to control manner and means of work',
        'Business independence and separate entity',
        'Permanence of the relationship',
        'Investment in tools/equipment',
        'Multiple clients vs. economic dependence',
      ],
      penalty: '$1,000 per misclassified worker + back wages + UI insurance',
      code: 'Florida Statutes §440.02, §443.036',
      note: 'SB 1718 (2023) requires E-Verify for employers with 25+ employees. Unlicensed contracting is a felony for jobs over $1,000.',
    },

    finalPay: {
      fired: 'Next regular payday',
      quit: 'Next regular payday',
      penalty: 'No waiting time penalty statute — pursue through FLSA or civil action',
      code: 'No state final pay statute — follow FLSA',
    },

    sickLeave: {
      minimum: 'No statewide paid sick leave requirement',
      note: 'Miami Beach passed a sick leave ordinance but it was struck down. No current local mandates in effect.',
    },

    heatIllness: {
      rule: 'No state-specific standard',
      note: 'Florida has no state OSHA plan. Federal OSHA General Duty Clause applies. Outdoor worker heat protections follow federal guidance.',
      code: 'OSHA General Duty Clause — 29 U.S.C. §654(a)(1)',
    },

    licensing: {
      note: 'Florida strictly enforces contractor licensing (DBPR). Unlicensed contracting for jobs over $1,000 is a third-degree felony. Hurricane-related repairs have additional scrutiny.',
      code: 'Florida Statutes §489',
    },
  },

  NY: {
    stateName: 'New York',
    laborDept: 'New York State Department of Labor (NYSDOL)',
    laborDeptUrl: 'https://dol.ny.gov/',

    mealBreaks: {
      rule: '30-minute meal break for shifts over 6 hours that extend over the noon period (11am-2pm)',
      additionalRules: 'Shifts starting before 11am and extending past 7pm: additional 20-minute break between 5pm-7pm. Shifts of 6+ hours starting between 1pm-6am: 45-minute break midway.',
      penalty: 'Violations under NY Labor Law §162',
      code: 'NY Labor Law §162',
    },

    restBreaks: {
      rule: 'No state requirement for rest breaks (only meal breaks)',
      note: 'One day of rest in seven is required for factory workers and certain other categories',
      code: 'NY Labor Law §161',
    },

    overtime: {
      daily: 'None — New York has no daily overtime',
      weekly: '1.5x after 40 hours/week',
      code: 'NY Labor Law §160; 12 NYCRR Part 142',
      note: 'NYC, Long Island, and Westchester may have industry-specific overtime orders',
    },

    minimumWage: {
      statewide: '$16.50/hour (2026)',
      localOverrides: [
        'NYC: $16.50 (unified with state as of 2026)',
        'Long Island (Nassau/Suffolk): $16.50',
        'Westchester: $16.50',
      ],
      tipCredit: '$11.00/hour tipped minimum',
      code: 'NY Labor Law §652',
    },

    workerClassification: {
      test: 'Hybrid: Common Law + ABC Test (for unemployment insurance)',
      factors: [
        'A: Direction & control over how work is performed',
        'B: Nature of work — is it core to the business?',
        'C: Independent enterprise — does the worker have their own business?',
      ],
      penalty: '$2,500 per worker (first offense); $5,000 per worker (subsequent)',
      code: 'NY Labor Law §862; Commercial Goods Transportation Industry Fair Play Act',
      note: 'Wage Theft Prevention Act requires written wage notices at hire and annually. Paid Family Leave applies to W-2 employees.',
    },

    finalPay: {
      fired: 'Next regular payday',
      quit: 'Next regular payday',
      penalty: 'Liquidated damages up to 100% of unpaid wages + attorney fees',
      code: 'NY Labor Law §191, §198',
    },

    sickLeave: {
      minimum: '5-15 employees or net income >$1M: 5 paid days. 100+ employees: 7 paid days. Under 5 employees (net income <$1M): 5 unpaid days.',
      code: 'NY Labor Law §196-b',
    },

    wageTheft: {
      notice: 'Written notice at hire with: rate of pay, overtime rate, pay day, employer info, allowances. Annual notice also required.',
      penalty: '$50 per day per employee for failure to provide notice (up to $5,000)',
      code: 'NY Labor Law §195 (Wage Theft Prevention Act)',
    },
  },

  IL: {
    stateName: 'Illinois',
    laborDept: 'Illinois Department of Labor (IDOL)',
    laborDeptUrl: 'https://labor.illinois.gov/',

    mealBreaks: {
      rule: '20-minute meal break no later than 5 hours after start of shift (for shifts of 7.5+ hours)',
      additionalRules: 'Hotel room attendants: additional break after 7 hours',
      code: '820 ILCS 140 (One Day Rest in Seven Act)',
    },

    restBreaks: {
      rule: 'No state-mandated rest breaks beyond the One Day Rest in Seven Act meal break',
      dayOfRest: 'Employees entitled to 24 consecutive hours of rest per calendar week',
      code: '820 ILCS 140',
    },

    overtime: {
      daily: 'None — Illinois has no daily overtime',
      weekly: '1.5x after 40 hours/week',
      code: '820 ILCS 105/4a (Illinois Minimum Wage Law)',
    },

    minimumWage: {
      statewide: '$15.00/hour (2025)',
      localOverrides: [
        'Chicago: $16.20 (2025)',
        'Cook County: $14.05 (2025)',
      ],
      tipCredit: '$9.00/hour tipped minimum (60% of state minimum)',
      code: '820 ILCS 105 (Illinois Minimum Wage Law)',
    },

    workerClassification: {
      test: 'ABC Test (Employee Classification Act)',
      prongs: [
        'A: Free from control and direction over work performance',
        'B: Service performed outside the usual course of employer\'s business',
        'C: Individual is customarily engaged in an independently established trade/business',
      ],
      penalty: '$1,500 per violation (first); $2,500 (subsequent); criminal penalties possible for construction',
      code: '820 ILCS 185 (Employee Classification Act)',
      note: 'Construction industry faces the strictest enforcement. Day and Temporary Labor Services Act (820 ILCS 175) has additional rules for temp workers.',
    },

    finalPay: {
      fired: 'Next regular payday',
      quit: 'Next regular payday',
      penalty: '2% per month on unpaid wages (no cap) + attorney fees',
      code: '820 ILCS 115 (Illinois Wage Payment and Collection Act)',
    },

    sickLeave: {
      minimum: '1 hour per 40 hours worked, up to 40 hours/year (Paid Leave for All Workers Act, 2024)',
      note: 'Chicago has its own ordinance: 5 paid sick days + 5 paid leave days per year',
      code: '820 ILCS 192 (Paid Leave for All Workers Act)',
    },

    harassment: {
      training: 'Annual sexual harassment prevention training required for all employees',
      restaurants: 'Restaurants/bars have additional requirements under SB 75',
      code: '775 ILCS 5/2-109 (Illinois Human Rights Act)',
    },
  },
};

// ============================================================
// FEDERAL COMPLIANCE KNOWLEDGE — Applies in ALL states
// These are the federal floor; state rules may exceed but not fall below
// ============================================================

const FEDERAL_BASELINE = {
  flsa: {
    name: 'Fair Labor Standards Act (FLSA)',
    code: '29 U.S.C. §201-219',
    minimumWage: '$7.25/hour (federal floor since 2009). State/local rates supersede if higher.',
    overtime: '1.5x regular rate after 40 hours/workweek. No daily overtime requirement.',
    exemptions: 'Executive, administrative, professional, outside sales, computer employees exempt if salary ≥ $43,888/year (2024 DOL rule) AND meet duties test.',
    tippedMinimum: '$2.13/hour federal tipped minimum (employer must make up difference if tips + wage < $7.25).',
    youth: '$4.25/hour for employees under 20 during first 90 days.',
    breaks: 'FLSA does not require meal or rest breaks. However, breaks under 20 minutes must be compensated. Meal periods of 30+ minutes may be unpaid if employee is completely relieved of duties.',
    recordKeeping: 'Employers must keep payroll records for 3 years. Time cards and wage computation records for 2 years.',
    penalties: 'Willful violations: up to $10,000 fine per violation and/or imprisonment. Back wages + equal amount in liquidated damages.',
  },

  fmla: {
    name: 'Family and Medical Leave Act (FMLA)',
    code: '29 U.S.C. §2601-2654',
    applies: 'Employers with 50+ employees within 75 miles',
    eligibility: 'Employee must have worked 12 months and 1,250 hours in prior 12 months',
    leave: '12 weeks unpaid leave per year for: birth/adoption, serious health condition (self or family member), military family leave',
    jobProtection: 'Employee must be restored to same or equivalent position',
    note: 'Many states (CA, NY, IL) have supplemental paid family leave laws with lower thresholds',
  },

  osha: {
    name: 'Occupational Safety and Health Act (OSHA)',
    code: '29 U.S.C. §651-678',
    generalDuty: 'Section 5(a)(1): Employer must furnish a place of employment free from recognized hazards causing or likely to cause death or serious harm.',
    reporting: 'Must report fatalities within 8 hours. Must report hospitalizations, amputations, or eye loss within 24 hours.',
    recordKeeping: 'Employers with 10+ employees must maintain OSHA 300 log of injuries/illnesses.',
    heat: 'No final federal heat standard yet (proposed rule pending). General Duty Clause applies. NIOSH recommends action at heat index 80°F.',
    penalties: 'Serious violations: up to $16,131/violation. Willful: up to $161,323/violation. Repeat: up to $161,323/violation.',
    construction: 'Construction industry has specific standards under 29 CFR 1926 (fall protection, scaffolding, excavation, etc.)',
  },

  ada: {
    name: 'Americans with Disabilities Act (ADA)',
    code: '42 U.S.C. §12101-12213',
    applies: 'Employers with 15+ employees',
    requirements: 'Must provide reasonable accommodations for qualified individuals with disabilities. Cannot discriminate in hiring, firing, promotion, or compensation.',
    interactiveProcess: 'Must engage in good-faith interactive process to determine reasonable accommodations.',
  },

  titleVII: {
    name: 'Title VII of the Civil Rights Act',
    code: '42 U.S.C. §2000e',
    applies: 'Employers with 15+ employees',
    protectedClasses: 'Race, color, religion, sex (including pregnancy, sexual orientation, gender identity), national origin',
    harassment: 'Sexual harassment and hostile work environment are violations of Title VII',
    penalties: '$50,000-$300,000 in compensatory/punitive damages depending on employer size',
  },

  taxes: {
    name: 'Federal Tax Obligations',
    classification: 'IRS uses 20-Factor Test / Common Law Test for worker classification. Three categories: behavioral control, financial control, type of relationship.',
    form1099: '1099-NEC required for contractor payments ≥ $600/year. Due January 31.',
    formW2: 'W-2 required for all employees. Due January 31.',
    withholding: 'Employers must withhold federal income tax, Social Security (6.2%), and Medicare (1.45%) for employees.',
    penaltyMisclass: 'IRS §3509: employer liable for employee\'s share of FICA + income tax withholding. 100% penalty tax for willful failure.',
    code: 'IRC §3509, §6721, §6722',
  },

  eVerify: {
    name: 'E-Verify / I-9 Requirements',
    i9: 'Form I-9 required for ALL employees within 3 business days of hire. Must be retained for 3 years after hire or 1 year after termination (whichever is later).',
    eVerify: 'E-Verify required for federal contractors. Some states mandate it for private employers.',
    penalties: '$272-$2,701 per I-9 violation (first offense). $544-$5,404 (knowing violations).',
    code: '8 U.S.C. §1324a (Immigration and Nationality Act)',
  },

  finalPay: {
    note: 'No federal law mandates a specific final pay deadline — state law governs timing.',
    wages: 'FLSA requires all earned wages to be paid. Failure to pay can result in back wages + liquidated damages.',
  },

  sickLeave: {
    note: 'No federal paid sick leave requirement for private employers.',
    fmla: 'FMLA provides up to 12 weeks UNPAID leave for qualifying conditions (50+ employee employers).',
  },
};

/**
 * Build federal compliance context for AI prompts.
 * This is ALWAYS included alongside state-specific knowledge.
 * @returns {string}
 */
function getFederalKnowledge() {
  const sections = [];
  sections.push('=== FEDERAL LABOR LAW REFERENCE (applies in all states) ===');
  sections.push('');

  sections.push(`FLSA (${FEDERAL_BASELINE.flsa.code}):`);
  sections.push(`- Minimum wage: ${FEDERAL_BASELINE.flsa.minimumWage}`);
  sections.push(`- Overtime: ${FEDERAL_BASELINE.flsa.overtime}`);
  sections.push(`- Exemptions: ${FEDERAL_BASELINE.flsa.exemptions}`);
  sections.push(`- Breaks: ${FEDERAL_BASELINE.flsa.breaks}`);
  sections.push(`- Penalties: ${FEDERAL_BASELINE.flsa.penalties}`);
  sections.push('');

  sections.push(`FMLA (${FEDERAL_BASELINE.fmla.code}):`);
  sections.push(`- Applies to: ${FEDERAL_BASELINE.fmla.applies}`);
  sections.push(`- Leave: ${FEDERAL_BASELINE.fmla.leave}`);
  sections.push(`- Job protection: ${FEDERAL_BASELINE.fmla.jobProtection}`);
  sections.push('');

  sections.push(`OSHA (${FEDERAL_BASELINE.osha.code}):`);
  sections.push(`- General Duty: ${FEDERAL_BASELINE.osha.generalDuty}`);
  sections.push(`- Reporting: ${FEDERAL_BASELINE.osha.reporting}`);
  sections.push(`- Construction: ${FEDERAL_BASELINE.osha.construction}`);
  sections.push(`- Penalties: ${FEDERAL_BASELINE.osha.penalties}`);
  sections.push('');

  sections.push(`ADA (${FEDERAL_BASELINE.ada.code}):`);
  sections.push(`- Applies to: ${FEDERAL_BASELINE.ada.applies}`);
  sections.push(`- ${FEDERAL_BASELINE.ada.requirements}`);
  sections.push('');

  sections.push(`WORKER CLASSIFICATION (Federal):`);
  sections.push(`- ${FEDERAL_BASELINE.taxes.classification}`);
  sections.push(`- 1099-NEC: ${FEDERAL_BASELINE.taxes.form1099}`);
  sections.push(`- Misclassification penalty: ${FEDERAL_BASELINE.taxes.penaltyMisclass}`);
  sections.push('');

  sections.push(`E-VERIFY / I-9:`);
  sections.push(`- ${FEDERAL_BASELINE.eVerify.i9}`);
  sections.push(`- Penalties: ${FEDERAL_BASELINE.eVerify.penalties}`);
  sections.push('');

  return sections.join('\n');
}

/**
 * Build compliance context for AI prompts based on user's state.
 * Returns BOTH federal AND state-specific knowledge for injection into AI prompts.
 *
 * @param {string} stateCode - Two-letter state code (e.g., 'CA', 'TX')
 * @returns {string} Formatted compliance knowledge for AI prompt injection
 */
function getComplianceKnowledge(stateCode) {
  // Always start with federal knowledge
  let knowledge = getFederalKnowledge() + '\n';

  const state = STATE_KNOWLEDGE[stateCode];

  if (!state) {
    return knowledge + `\nNo state-specific compliance data available for "${stateCode}".

IMPORTANT: Clearly tell the user that state-specific rules for ${stateCode} are not yet in our database. Use the federal rules above as a baseline, but recommend they consult their state labor department or an employment attorney for state-specific requirements.
Supported states: ${Object.keys(STATE_KNOWLEDGE).join(', ')}`;
  }

  const sections = [];

  sections.push(`=== ${state.stateName} LABOR LAW REFERENCE ===`);
  sections.push(`Source: ${state.laborDept} (${state.laborDeptUrl})`);
  sections.push('');

  if (state.minimumWage) {
    sections.push('MINIMUM WAGE:');
    sections.push(`- Statewide: ${state.minimumWage.statewide}`);
    if (state.minimumWage.localOverrides?.length > 0) {
      sections.push(`- Local rates: ${state.minimumWage.localOverrides.join('; ')}`);
    }
    sections.push(`- Tip credit: ${state.minimumWage.tipCredit}`);
    sections.push(`- Citation: ${state.minimumWage.code}`);
    sections.push('');
  }

  if (state.overtime) {
    sections.push('OVERTIME:');
    if (state.overtime.daily) sections.push(`- Daily: ${state.overtime.daily}`);
    sections.push(`- Weekly: ${state.overtime.weekly}`);
    if (state.overtime.seventhDay) sections.push(`- 7th day: ${state.overtime.seventhDay}`);
    sections.push(`- Citation: ${state.overtime.code}`);
    if (state.overtime.note) sections.push(`- Note: ${state.overtime.note}`);
    sections.push('');
  }

  if (state.mealBreaks) {
    sections.push('MEAL BREAKS:');
    sections.push(`- Rule: ${state.mealBreaks.rule}`);
    if (state.mealBreaks.waiver) sections.push(`- Waiver: ${state.mealBreaks.waiver}`);
    if (state.mealBreaks.penalty) sections.push(`- Penalty: ${state.mealBreaks.penalty}`);
    if (state.mealBreaks.code) sections.push(`- Citation: ${state.mealBreaks.code}`);
    if (state.mealBreaks.caselaw) sections.push(`- Key case: ${state.mealBreaks.caselaw}`);
    sections.push('');
  }

  if (state.restBreaks) {
    sections.push('REST BREAKS:');
    sections.push(`- Rule: ${state.restBreaks.rule}`);
    if (state.restBreaks.penalty) sections.push(`- Penalty: ${state.restBreaks.penalty}`);
    if (state.restBreaks.code) sections.push(`- Citation: ${state.restBreaks.code}`);
    sections.push('');
  }

  if (state.workerClassification) {
    sections.push('WORKER CLASSIFICATION:');
    sections.push(`- Test: ${state.workerClassification.test}`);
    const items = state.workerClassification.prongs || state.workerClassification.factors || [];
    items.forEach((item) => sections.push(`  ${item}`));
    if (state.workerClassification.burden) sections.push(`- Burden: ${state.workerClassification.burden}`);
    sections.push(`- Penalty: ${state.workerClassification.penalty}`);
    sections.push(`- Citation: ${state.workerClassification.code}`);
    if (state.workerClassification.paga) sections.push(`- PAGA: ${state.workerClassification.paga}`);
    if (state.workerClassification.note) sections.push(`- Note: ${state.workerClassification.note}`);
    sections.push('');
  }

  if (state.finalPay) {
    sections.push('FINAL PAY:');
    sections.push(`- Fired: ${state.finalPay.fired}`);
    sections.push(`- Quit: ${state.finalPay.quit || state.finalPay.quitWithNotice || 'Next regular payday'}`);
    sections.push(`- Penalty: ${state.finalPay.penalty}`);
    sections.push(`- Citation: ${state.finalPay.code}`);
    if (state.finalPay.mustInclude) sections.push(`- Must include: ${state.finalPay.mustInclude}`);
    sections.push('');
  }

  if (state.sickLeave) {
    sections.push('PAID SICK LEAVE:');
    sections.push(`- Minimum: ${state.sickLeave.minimum}`);
    if (state.sickLeave.accrual) sections.push(`- Accrual: ${state.sickLeave.accrual}`);
    if (state.sickLeave.code) sections.push(`- Citation: ${state.sickLeave.code}`);
    if (state.sickLeave.note) sections.push(`- Note: ${state.sickLeave.note}`);
    sections.push('');
  }

  if (state.heatIllness) {
    sections.push('HEAT ILLNESS PREVENTION:');
    sections.push(`- Rule: ${state.heatIllness.rule}`);
    if (state.heatIllness.requirements) sections.push(`- Requirements: ${state.heatIllness.requirements}`);
    sections.push(`- Citation: ${state.heatIllness.code}`);
    sections.push('');
  }

  if (state.harassment) {
    sections.push('HARASSMENT TRAINING:');
    sections.push(`- Requirement: ${state.harassment.training}`);
    if (state.harassment.frequency) sections.push(`- Frequency: ${state.harassment.frequency}`);
    sections.push(`- Citation: ${state.harassment.code}`);
    sections.push('');
  }

  if (state.wageTheft) {
    sections.push('WAGE THEFT PREVENTION:');
    sections.push(`- Notice: ${state.wageTheft.notice}`);
    sections.push(`- Penalty: ${state.wageTheft.penalty}`);
    sections.push(`- Citation: ${state.wageTheft.code}`);
    sections.push('');
  }

  if (state.licensing) {
    sections.push('CONTRACTOR LICENSING:');
    sections.push(`- ${state.licensing.note}`);
    sections.push(`- Citation: ${state.licensing.code}`);
    sections.push('');
  }

  sections.push('INSTRUCTIONS FOR AI:');
  sections.push('- ALWAYS cite the specific code section when answering compliance questions');
  sections.push('- If a question falls outside the data above, say so and recommend consulting a licensed attorney');
  sections.push('- Never guess at penalty amounts — use only the figures provided above');
  sections.push('- When the user\'s state is not supported, clearly state that and provide federal baseline guidance');
  sections.push(`- Include the disclaimer: "This is general information based on ${state.stateName} law, not legal advice. Consult an employment attorney for your specific situation."`);

  return sections.join('\n');
}

/**
 * Get list of supported state codes.
 * @returns {string[]}
 */
function getSupportedStates() {
  return Object.keys(STATE_KNOWLEDGE);
}

/**
 * Check if a state is supported.
 * @param {string} stateCode
 * @returns {boolean}
 */
function isStateSupported(stateCode) {
  return stateCode in STATE_KNOWLEDGE;
}

module.exports = {
  getComplianceKnowledge,
  getFederalKnowledge,
  getSupportedStates,
  isStateSupported,
  STATE_KNOWLEDGE,
  FEDERAL_BASELINE,
};
