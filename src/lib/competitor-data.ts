// Competitor comparison data for SEO landing pages
// Each competitor has pricing, features, and positioning data
//
// Task Iguana's own prices, seat limits and plan availability are NOT typed
// here: they come from compare-pricing.ts, which reads plan-features.ts.
// Only the competitor's side and the prose are maintained by hand.

import {
  EXTRA_USER_LABEL,
  addonPrice,
  availability,
  planLabel,
  savingsRange,
  schedulingLabel,
  yearlyCost,
} from './compare-pricing';

export interface CompetitorPlan {
  name: string;
  tooltime: string;
  competitor: string;
}

export interface FeatureRow {
  name: string;
  tooltime: string;
  competitor: string;
  tooltimeIncluded: boolean;
  competitorIncluded: boolean | 'partial' | 'addon';
}

export interface CostExample {
  scenario: string;
  tooltime: number;
  competitor: number;
}

/** Hand-maintained fields. `savingsRange` is computed from `costExamples`. */
export interface CompetitorSource {
  slug: string;
  name: string;
  tagline: string;
  heroSubtitle: string;
  painPoints: string[];
  plans: CompetitorPlan[];
  features: FeatureRow[];
  costExamples: CostExample[];
  switchReasons: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
  /**
   * Month the competitor's own prices and features were last checked against
   * their public site, as 'YYYY-MM'. Unset until a check has been done.
   */
  lastVerified?: string;
}

export interface CompetitorData extends CompetitorSource {
  /** e.g. "$480-$2,040/year" */
  savingsRange: string;
}

const COMPETITOR_SOURCE: Record<string, CompetitorSource> = {
  'housecall-pro': {
    slug: 'housecall-pro',
    name: 'Housecall Pro',
    tagline: 'Task Iguana vs Housecall Pro',
    heroSubtitle: 'Same powerful scheduling and dispatch — plus AI quoting, compliance tools, and bilingual support. All at a lower price.',
    painPoints: [
      'Housecall Pro starts at $79/mo (just raised prices in Feb 2026)',
      'No compliance tools — you need a separate system for labor law',
      'AI call answering (CSR AI) is a paid add-on',
      'No bilingual support for Spanish-speaking crews',
    ],
    plans: [
      { name: 'Starter / Solo', tooltime: planLabel('starter'), competitor: '$79/mo (1 user)' },
      { name: 'Small Team', tooltime: planLabel('pro'), competitor: '$189/mo (1-5 users)' },
      { name: 'Growing Team', tooltime: planLabel('elite'), competitor: '$399/mo (1-15 users)' },
      { name: 'Extra Users', tooltime: EXTRA_USER_LABEL, competitor: '$35/user/mo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Online Booking', tooltime: availability('booking'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'SMS Notifications', tooltime: availability('sms_notifications'), competitor: 'Essential+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'AI Team (call answering extra)', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Automated Review Requests', tooltime: availability('reviews'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Worker Mobile App', tooltime: availability('worker_app'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Available', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'QuickBooks Integration', tooltime: availability('quickbooks_sync'), competitor: 'Essential+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: yearlyCost('starter'), competitor: 948 },
      { scenario: '5-Person Team', tooltime: yearlyCost('pro'), competitor: 2268 },
      { scenario: '15-Person Team', tooltime: yearlyCost('pro'), competitor: 4788 },
    ],
    switchReasons: [
      { title: 'AI That Runs Your Back Office', description: 'Jenny auto-dispatches crews, follows up on cold leads, alerts you about overdue invoices, and calculates job profitability — all on autopilot, on every plan. HCP\'s AI Team leans on insights and coaching, and its call answering is a paid add-on.' },
      { title: 'Compliance Built In', description: 'Shield Iguana protects you from misclassification lawsuits, tracks break compliance, and covers 5 states. HCP has nothing like this.' },
      { title: '75% Less Per User', description: 'Add team members for $7/mo vs $35/mo. A 10-person team saves over $3,000/year on user fees alone.' },
      { title: 'Material Estimator', description: '"Paint a 12x14 room" → instant material list with quantities, brands, and costs across 21 trades. No competitor has this.' },
    ],
    faqs: [
      { question: 'Can I migrate from Housecall Pro?', answer: 'Yes! We offer free data migration assistance. Our team imports your customers, job history, and settings. Most migrations complete in under 48 hours.' },
      { question: 'Does Task Iguana have a mobile app?', answer: 'Yes — our Worker App (Pro and Elite) works on any phone (iOS/Android) and even works offline. Clock in/out, view jobs, take photos, and sync when you\'re back online.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges. We earn your business every month.' },
      { question: 'What about the AI features?', answer: 'Jenny AI is included in every plan — auto-dispatch, lead follow-up, cash flow alerts, and job costing. No add-on fees, no premium tier required.' },
    ],
  },

  'servicetitan': {
    slug: 'servicetitan',
    name: 'ServiceTitan',
    tagline: 'Task Iguana vs ServiceTitan',
    heroSubtitle: 'Enterprise-grade features without the enterprise price tag. No contracts, no $15K termination fees, no hidden costs.',
    painPoints: [
      'ServiceTitan costs $245-$398+ per technician per month',
      '12-month contracts with $15,000+ termination fees',
      'Hidden pricing — won\'t show costs until sales demo',
      '6-month implementation timeline',
      'Requires dedicated admin staff to manage',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '$245/tech/mo (minimum)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '$398/tech/mo (Pro tier)' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: 'Custom (Enterprise)' },
      { name: 'Contracts', tooltime: 'None — cancel anytime', competitor: '12-month minimum' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Titan Intelligence (extra)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Pricebook (limited)', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Titan Intelligence ($$$)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Automated Review Requests', tooltime: availability('reviews'), competitor: 'Marketing Pro add-on', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Available', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'No Contracts', tooltime: 'Cancel anytime', competitor: '12-month lock-in', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Transparent Pricing', tooltime: 'Published online', competitor: 'Hidden until demo', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Same-Day Setup', tooltime: 'Sign up and go', competitor: '6-month implementation', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
    ],
    costExamples: [
      { scenario: '3 Technicians', tooltime: yearlyCost('pro'), competitor: 8820 },
      { scenario: '10 Technicians', tooltime: yearlyCost('pro'), competitor: 29400 },
      { scenario: '20 Technicians', tooltime: yearlyCost('elite'), competitor: 47760 },
    ],
    switchReasons: [
      { title: 'Stop Paying Per Technician', description: 'ServiceTitan charges $245-$398 per tech per month. Task Iguana covers the core workflow for a flat $49-$129/mo. Do the math.' },
      { title: 'No Contracts. Ever.', description: 'ServiceTitan locks you into 12-month contracts with $15,000+ termination fees. We earn your business every month. Cancel anytime, no questions asked.' },
      { title: 'Set Up Today, Not in 6 Months', description: 'ServiceTitan requires months of implementation and dedicated admin staff. Task Iguana: sign up, import your data, start working. Same day.' },
      { title: 'Transparent Pricing', description: 'ServiceTitan won\'t show you pricing until you sit through a sales demo. Our pricing is published online. No surprises.' },
    ],
    faqs: [
      { question: 'Can ServiceTitan really cost $15K+ to leave?', answer: 'Yes. ServiceTitan contracts typically include early termination fees that can exceed $15,000. Many contractors feel trapped. Task Iguana has zero contracts and zero termination fees.' },
      { question: 'Will I lose features switching from ServiceTitan?', answer: 'No. Task Iguana covers scheduling, dispatch, invoicing, quoting, payments, CRM, reporting, and more — plus features ServiceTitan doesn\'t have like compliance tools, bilingual AI, and material estimation.' },
      { question: 'Can you migrate my ServiceTitan data?', answer: 'Yes. We offer free migration assistance for ServiceTitan customers. Export your customer list and job history, and our team handles the import.' },
      { question: 'Is Task Iguana powerful enough for a large team?', answer: 'Absolutely. Our Elite plan has no user cap at $129/mo. Jenny AI handles dispatch, follow-ups, and cash flow automatically — reducing the admin overhead that ServiceTitan creates.' },
    ],
  },

  'fieldpulse': {
    slug: 'fieldpulse',
    name: 'FieldPulse',
    tagline: 'Task Iguana vs FieldPulse',
    heroSubtitle: 'More AI, more compliance tools, more trades support — at a comparable price with no hidden fees.',
    painPoints: [
      'FieldPulse hides pricing — requires sales demo',
      'No AI-powered features',
      'No compliance or labor law tools',
      'Limited to basic scheduling and invoicing',
      'No material estimator or trade-specific tools',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '~$99/mo (estimated, hidden pricing)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '~$199/mo (estimated)' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: '~$399/mo (estimated)' },
      { name: 'Pricing Transparency', tooltime: 'Published online', competitor: 'Hidden — requires demo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'CRM / Client Management', tooltime: availability('customers'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Transparent Pricing', tooltime: 'Published online', competitor: 'Hidden', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: yearlyCost('starter'), competitor: 1188 },
      { scenario: '5-Person Team', tooltime: yearlyCost('pro'), competitor: 2388 },
      { scenario: '15-Person Team', tooltime: yearlyCost('pro'), competitor: 4788 },
    ],
    switchReasons: [
      { title: 'AI-Native Platform', description: 'FieldPulse has no AI features. Task Iguana includes Jenny AI for auto-dispatch, lead follow-up, cash flow alerts, and job costing — all on autopilot.' },
      { title: 'Compliance Protection', description: 'FieldPulse has no labor law compliance tools. Shield Iguana covers worker classification, break tracking, and multi-state compliance across CA, TX, FL, NY, and IL.' },
      { title: 'Material Estimator', description: '21 trade-specific calculators with real Home Depot/Lowe\'s pricing. "Paint a 12x14 room" → instant material list. FieldPulse has nothing like this.' },
      { title: 'Transparent Pricing', description: 'FieldPulse hides their pricing behind a sales demo. Our pricing is published online — $49/mo starter, $79/mo pro, $129/mo elite. No surprises.' },
    ],
    faqs: [
      { question: 'Why does FieldPulse hide their pricing?', answer: 'Many FSM platforms hide pricing to qualify leads through sales calls. Task Iguana believes in transparency — our pricing is published online with no hidden fees.' },
      { question: 'Can I migrate from FieldPulse?', answer: 'Yes! Export your customer list as a CSV and our team handles the import. Most migrations complete in under 24 hours.' },
      { question: 'Does Task Iguana have GPS tracking?', answer: 'Yes — our Worker App (Pro and Elite) includes GPS clock-in/out and location tracking, and Elite adds route optimization.' },
      { question: 'What makes Task Iguana different from FieldPulse?', answer: 'Three things no competitor has: (1) Jenny AI that autonomously manages your back office, (2) Shield Iguana compliance tools for labor law, (3) Material Estimator covering 21 trades with real supplier pricing.' },
    ],
  },

  'jobber': {
    slug: 'jobber',
    name: 'Jobber',
    tagline: 'Task Iguana vs Jobber',
    heroSubtitle: 'Same features contractors love — scheduling, quoting, invoicing — plus AI, compliance tools, and bilingual support at a fraction of the price.',
    painPoints: [
      'Jobber Core starts at $39/mo with limited features — Grow plan jumps to $119/mo',
      'AI call answering (AI Receptionist) costs extra on most plans',
      'No compliance or labor law tools for worker classification',
      'No bilingual support for Spanish-speaking crews',
      'Per-user pricing adds up fast for growing teams',
    ],
    plans: [
      { name: 'Starter / Solo', tooltime: planLabel('starter'), competitor: '$39/mo (1 user, Core)' },
      { name: 'Small Team', tooltime: planLabel('pro'), competitor: '$119/mo (up to 5 users, Connect)' },
      { name: 'Growing Team', tooltime: planLabel('elite'), competitor: '$249/mo (up to 15 users, Grow)' },
      { name: 'Extra Users', tooltime: EXTRA_USER_LABEL, competitor: '$29/user/mo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Quoting / Estimates', tooltime: availability('quoting'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Online Booking', tooltime: availability('booking'), competitor: 'Connect+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Copilot; AI Receptionist extra', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Automated Review Requests', tooltime: availability('reviews'), competitor: 'Marketing Suite add-on', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Grow only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'QuickBooks Integration', tooltime: availability('quickbooks_sync'), competitor: 'Connect+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Automated Follow-Ups', tooltime: 'All plans (Jenny AI)', competitor: 'Grow only', tooltimeIncluded: true, competitorIncluded: 'partial' },
    ],
    costExamples: [
      { scenario: '3-Person Team', tooltime: yearlyCost('starter'), competitor: 1428 },
      { scenario: '5-Person Team', tooltime: yearlyCost('pro'), competitor: 1428 },
      { scenario: '15-Person Team', tooltime: yearlyCost('pro'), competitor: 2988 },
    ],
    switchReasons: [
      { title: 'AI That Runs Your Back Office', description: 'Jobber\'s AI centers on call answering and business insights, and its AI Receptionist costs extra on most plans. Jenny AI is included in every plan and acts for you: auto-dispatch, lead follow-up, cash flow alerts, and job costing — all on autopilot.' },
      { title: 'Compliance Protection', description: 'Jobber has no labor law tools. Shield Iguana covers worker classification, break tracking, and multi-state compliance across CA, TX, FL, NY, and IL.' },
      { title: '75% Less Per User', description: 'Add team members for $7/mo vs $29/mo. A 10-person team saves over $2,600/year on user fees alone.' },
      { title: 'Material Estimator', description: '"Tile a 10x12 bathroom" → instant material list with quantities, brands, and costs across 21 trades. Jobber has nothing like this.' },
    ],
    faqs: [
      { question: 'Can I migrate from Jobber?', answer: 'Yes! We offer free data migration assistance. Our team imports your customers, job history, and settings. Most migrations complete in under 48 hours.' },
      { question: 'Does Task Iguana have a mobile app?', answer: 'Yes — our Worker App (Pro and Elite) works on any phone (iOS/Android) and even works offline. Clock in/out, view jobs, take photos, and sync when you\'re back online.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges. We earn your business every month.' },
      { question: 'What about the AI features?', answer: 'Jenny AI is included in every plan — auto-dispatch, lead follow-up, cash flow alerts, and job costing. No add-on fees, no premium tier required.' },
    ],
  },

  'kickserv': {
    slug: 'kickserv',
    name: 'Kickserv',
    tagline: 'Task Iguana vs Kickserv',
    heroSubtitle: 'Kickserv keeps it simple — but simple means missing AI, compliance tools, and the features growing contractors need.',
    painPoints: [
      'Kickserv lacks AI features — everything is manual',
      'No compliance or labor law tools',
      'No material estimator or trade-specific features',
      'Limited reporting and analytics on lower tiers',
      'No bilingual support for multilingual crews',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '$47/mo (Free tier limited to 1 user)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '$95/mo (Standard, up to 5 users)' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: '$191/mo (Business, unlimited users)' },
      { name: 'Extra Users', tooltime: EXTRA_USER_LABEL, competitor: 'Tier-based pricing' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'CRM / Client Management', tooltime: availability('customers'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Online Booking', tooltime: availability('booking'), competitor: 'Premium only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Premium only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: '3-Person Team', tooltime: yearlyCost('starter'), competitor: 1140 },
      { scenario: '5-Person Team', tooltime: yearlyCost('pro'), competitor: 1140 },
      { scenario: '15-Person Team', tooltime: yearlyCost('pro'), competitor: 2292 },
    ],
    switchReasons: [
      { title: 'AI-Powered Operations', description: 'Kickserv is purely manual. Jenny AI auto-dispatches crews, follows up leads, alerts on overdue invoices, and calculates profitability — zero extra effort.' },
      { title: 'Compliance Built In', description: 'Kickserv has no labor law tools. Shield Iguana covers worker classification, break compliance, and state-specific rules across CA, TX, FL, NY, and IL.' },
      { title: 'Trade-Specific Tools', description: 'Material estimator covers 21 trades with real supplier pricing. "Install 200 sq ft of hardwood" → instant material list. Kickserv can\'t do this.' },
      { title: 'Bilingual Support', description: 'Full Spanish language support throughout the platform. Over 30% of the trades workforce is Spanish-speaking — Task Iguana is built for them.' },
    ],
    faqs: [
      { question: 'Can I migrate from Kickserv?', answer: 'Yes! Export your customer data as CSV and our team handles the import. Most migrations complete in under 24 hours.' },
      { question: 'Is Task Iguana harder to use than Kickserv?', answer: 'No — we designed Task Iguana to be just as intuitive, with the added benefit of AI handling repetitive tasks automatically. Less clicking, more working.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
      { question: 'Do I need the AI features?', answer: 'Jenny AI is included in every plan at no extra cost. Start with basic features and let AI gradually take over repetitive tasks as you get comfortable.' },
    ],
  },

  'gorilladesk': {
    slug: 'gorilladesk',
    name: 'GorillaDesk',
    tagline: 'Task Iguana vs GorillaDesk',
    heroSubtitle: 'GorillaDesk works for pest control and lawn care — but Task Iguana covers all 21 trades with AI, compliance, and bilingual support.',
    painPoints: [
      'GorillaDesk focuses narrowly on pest control and lawn care',
      'No AI features — dispatch, quoting, and follow-up are all manual',
      'No compliance or labor law tools',
      'No material estimator for broader trades',
      'No bilingual support for Spanish-speaking crews',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '$49/mo (Basic, 1 route)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '$99/mo (Pro, per route pricing)' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: '$199+/mo (Pro, multiple routes)' },
      { name: 'Extra Routes/Users', tooltime: EXTRA_USER_LABEL, competitor: '$49+/route/mo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Route Optimization', tooltime: availability('route_optimizer'), competitor: 'Pro only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: '21 Trade Categories', tooltime: 'All plans', competitor: 'Pest + Lawn focus', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Pro only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: yearlyCost('starter'), competitor: 588 },
      { scenario: '3-Route Operation', tooltime: yearlyCost('pro'), competitor: 1788 },
      { scenario: '8-Route Operation', tooltime: yearlyCost('elite'), competitor: 3576 },
    ],
    switchReasons: [
      { title: 'Beyond Pest & Lawn', description: 'GorillaDesk is built for pest control and lawn care. Task Iguana supports 21 trades — HVAC, plumbing, electrical, painting, roofing, and more. One platform for any service business.' },
      { title: 'AI-Powered Operations', description: 'GorillaDesk is 100% manual. Jenny AI auto-dispatches, follows up on leads, sends payment reminders, and calculates job profitability automatically.' },
      { title: 'Compliance Protection', description: 'No labor law tools in GorillaDesk. Shield Iguana handles worker classification, break tracking, and multi-state compliance for CA, TX, FL, NY, and IL.' },
      { title: 'Better Per-User Economics', description: 'GorillaDesk charges per route ($49+/route). Task Iguana charges per user ($7/mo) so you can scale without route-based pricing surprises.' },
    ],
    faqs: [
      { question: 'Can I migrate from GorillaDesk?', answer: 'Yes! Export your customer and job data, and our team handles the import. Most migrations complete in under 24 hours with free assistance.' },
      { question: 'Does Task Iguana support recurring services?', answer: 'Absolutely. Set up recurring jobs with custom frequencies, auto-invoicing, and automatic crew assignment via Jenny AI.' },
      { question: 'I only do pest control — is Task Iguana overkill?', answer: 'Not at all. Use only the features you need. But you get AI dispatch, compliance tools, and bilingual support that GorillaDesk doesn\'t offer — at a comparable price.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees.' },
    ],
  },

  'workiz': {
    slug: 'workiz',
    name: 'Workiz',
    tagline: 'Task Iguana vs Workiz',
    heroSubtitle: 'Workiz has solid dispatching — but Task Iguana adds AI automation, compliance tools, and bilingual support at a better price.',
    painPoints: [
      'Workiz Standard starts at $198/mo for up to 5 users',
      'AI features require expensive add-ons (Genius suite)',
      'No compliance or labor law tools',
      'No material estimator or trade-specific calculators',
      'No bilingual interface for Spanish-speaking crews',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '$198/mo (Standard, 5 users)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '$198/mo + $35/user over 5' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: '$398/mo (Ultimate)' },
      { name: 'AI Features', tooltime: 'Included (Jenny AI)', competitor: 'Genius add-on ($$$)' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Business Phone / Call Answering', tooltime: `AI receptionist (Jenny Pro, ${addonPrice('jenny_pro')})`, competitor: 'Built-in VoIP', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Genius add-on', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Genius add-on (limited)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Ultimate only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Lead Management', tooltime: availability('leads'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: yearlyCost('starter'), competitor: 2376 },
      { scenario: '5-Person Team', tooltime: yearlyCost('pro'), competitor: 2376 },
      { scenario: '15-Person Team', tooltime: yearlyCost('pro'), competitor: 4776 },
    ],
    switchReasons: [
      { title: 'AI Included, Not Add-On', description: 'Workiz charges extra for their Genius AI suite. Task Iguana includes Jenny AI in every plan — auto-dispatch, lead follow-up, cash flow alerts, and job costing at no additional cost.' },
      { title: 'Compliance Protection', description: 'Workiz has no labor law tools. Shield Iguana handles worker classification, break tracking, and multi-state compliance to keep you protected.' },
      { title: '75% Lower Starting Price', description: 'Workiz Standard starts at $198/mo. Task Iguana starts at $49/mo. That\'s about $1,800/year in savings from day one.' },
      { title: 'Material Estimator', description: '21 trade-specific calculators with real supplier pricing. Get instant material lists for any job — a feature Workiz simply doesn\'t have.' },
    ],
    faqs: [
      { question: 'Can I migrate from Workiz?', answer: 'Yes! Export your customer and job data from Workiz, and our team handles the import. Most migrations complete in under 48 hours with free assistance.' },
      { question: 'Does Task Iguana have a phone system?', answer: 'Yes, through Jenny Pro ($49/mo). Jenny answers calls in English and Spanish on your own number or a new one, texts back missed calls, and books jobs by SMS. It is an AI receptionist rather than a full VoIP dialer for your team like Workiz has.' },
      { question: 'Is Workiz better for larger teams?', answer: 'Task Iguana scales better economically. Extra users cost $7/mo vs Workiz\'s $35/user. A 15-person team saves over $3,000/year with Task Iguana.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
    ],
  },

  'service-fusion': {
    slug: 'service-fusion',
    name: 'Service Fusion',
    tagline: 'Task Iguana vs Service Fusion',
    heroSubtitle: 'Service Fusion offers flat-rate pricing — but Task Iguana delivers AI, compliance, and bilingual support that Service Fusion can\'t match.',
    painPoints: [
      'Service Fusion Starter is $225/mo — no low-cost entry for small teams',
      'No AI-powered features for dispatch or quoting',
      'No compliance or labor law tools',
      'No bilingual support for Spanish-speaking crews',
      'Add-ons (GPS, inventory) push the real cost much higher',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '$225/mo (Starter, unlimited users)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '$350/mo (Plus)' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: '$575/mo (Pro)' },
      { name: 'GPS Tracking', tooltime: 'Included with worker app (Pro+)', competitor: '$25/vehicle add-on' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Estimates / Proposals', tooltime: availability('quoting'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Unlimited Users', tooltime: 'Elite plan', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: availability('customer_portal'), competitor: 'Plus+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: yearlyCost('starter'), competitor: 2700 },
      { scenario: '5-Person Team', tooltime: yearlyCost('pro'), competitor: 2700 },
      { scenario: '15-Person Team', tooltime: yearlyCost('pro'), competitor: 4200 },
    ],
    switchReasons: [
      { title: 'Right-Sized Pricing', description: 'Service Fusion starts at $225/mo even for a solo contractor. Task Iguana starts at $49/mo. Why pay for unlimited users when you only have 3?' },
      { title: 'AI-Native Platform', description: 'Service Fusion has no AI features. Jenny AI auto-dispatches crews, follows up leads, manages invoicing alerts, and calculates job profitability automatically.' },
      { title: 'Compliance Built In', description: 'Service Fusion offers no labor law compliance. Shield Iguana covers worker classification, break tracking, and state-specific rules across CA, TX, FL, NY, and IL.' },
      { title: 'No Nickel-and-Diming', description: 'Service Fusion charges extra for GPS ($25/vehicle), inventory, and other features. Task Iguana includes GPS clock-in and offline mode with the worker app on Pro and Elite at no extra per-vehicle fee.' },
    ],
    faqs: [
      { question: 'Service Fusion has unlimited users — isn\'t that better?', answer: 'Only if you have a large team. Most contractors have 3-15 workers. At $225/mo minimum, you\'re overpaying if you\'re a small team. Task Iguana starts at $49/mo, and Elite is unlimited users at $129/mo.' },
      { question: 'Can I migrate from Service Fusion?', answer: 'Yes! Export your customer and job data, and our team handles the import free of charge. Most migrations complete in under 48 hours.' },
      { question: 'Does Task Iguana have inventory management?', answer: 'Not yet — we don\'t track stock levels. Our Material Estimator calculates the materials and quantities you need for any job across 21 trades, so you know what to buy before you roll.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
    ],
  },

  'fieldedge': {
    slug: 'fieldedge',
    name: 'FieldEdge',
    tagline: 'Task Iguana vs FieldEdge',
    heroSubtitle: 'FieldEdge is built for HVAC and plumbing — Task Iguana covers all trades with AI, compliance, and transparent pricing.',
    painPoints: [
      'FieldEdge hides pricing — requires a sales demo to get a quote',
      'Estimated $100-$200+ per user per month',
      'Long-term contracts often required',
      'Focused on HVAC and plumbing — limited for other trades',
      'No AI dispatch or autonomous features',
    ],
    plans: [
      { name: 'Starter', tooltime: planLabel('starter'), competitor: '~$300+/mo (estimated, hidden pricing)' },
      { name: 'Team', tooltime: planLabel('pro'), competitor: '~$800+/mo (estimated)' },
      { name: 'Business', tooltime: planLabel('elite'), competitor: '~$2,000+/mo (estimated)' },
      { name: 'Pricing Transparency', tooltime: 'Published online', competitor: 'Hidden — requires demo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: schedulingLabel(), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: availability('invoicing'), competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Flat-Rate Pricing Book', tooltime: 'Material Estimator', competitor: 'Built-in pricebook', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'QuickBooks Integration', tooltime: availability('quickbooks_sync'), competitor: 'All plans (deep sync)', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans (state rules on Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'HVAC/Plumbing focus only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: '21 Trade Categories', tooltime: 'All plans', competitor: 'HVAC + Plumbing', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: `Worker app (${availability('worker_app')})`, competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL (Pro+)', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Transparent Pricing', tooltime: 'Published online', competitor: 'Hidden — requires demo', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: '3-Person Team', tooltime: yearlyCost('starter'), competitor: 3600 },
      { scenario: '8-Person Team', tooltime: yearlyCost('pro'), competitor: 9600 },
      { scenario: '20-Person Team', tooltime: yearlyCost('elite'), competitor: 24000 },
    ],
    switchReasons: [
      { title: 'Transparent Pricing', description: 'FieldEdge hides pricing behind sales demos. Task Iguana publishes pricing online — $49/mo starter, $79/mo pro, $129/mo elite. No surprises, no sales calls.' },
      { title: 'AI-Native Platform', description: 'FieldEdge has no AI features. Jenny AI auto-dispatches, follows up on leads, sends payment reminders, and calculates job profitability — all on autopilot.' },
      { title: 'All 21 Trades, Not Just HVAC', description: 'FieldEdge is narrowly focused on HVAC and plumbing. Task Iguana supports landscaping, electrical, painting, roofing, and 16 more trades with specialized tools.' },
      { title: 'No Contracts', description: 'FieldEdge often requires long-term contracts. Task Iguana is month-to-month. Cancel anytime, no termination fees.' },
    ],
    faqs: [
      { question: 'Why does FieldEdge hide their pricing?', answer: 'Many enterprise FSM platforms hide pricing to qualify leads through sales. Task Iguana believes in transparency — our pricing is published online with no hidden fees or sales calls required.' },
      { question: 'Can I migrate from FieldEdge?', answer: 'Yes! Export your customer list and job history, and our team handles the import free of charge. Most migrations complete in under 48 hours.' },
      { question: 'I\'m an HVAC contractor — is Task Iguana good enough?', answer: 'Absolutely. We support HVAC with a specialized material estimator and recurring maintenance scheduling. Plus you get AI, compliance, and bilingual support that FieldEdge doesn\'t offer.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
    ],
  },
};

export const COMPETITORS: Record<string, CompetitorData> = Object.fromEntries(
  Object.entries(COMPETITOR_SOURCE).map(([slug, source]) => [
    slug,
    { ...source, savingsRange: savingsRange(source.costExamples) },
  ])
);

export function getCompetitor(slug: string): CompetitorData | undefined {
  return COMPETITORS[slug];
}

export function getAllCompetitorSlugs(): string[] {
  return Object.keys(COMPETITORS);
}
