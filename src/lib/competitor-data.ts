// Competitor comparison data for SEO landing pages
// Each competitor has pricing, features, and positioning data

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

export interface CompetitorData {
  slug: string;
  name: string;
  tagline: string;
  heroSubtitle: string;
  savingsRange: string;
  painPoints: string[];
  plans: CompetitorPlan[];
  features: FeatureRow[];
  costExamples: CostExample[];
  switchReasons: { title: string; description: string }[];
  faqs: { question: string; answer: string }[];
}

export const COMPETITORS: Record<string, CompetitorData> = {
  'housecall-pro': {
    slug: 'housecall-pro',
    name: 'Housecall Pro',
    tagline: 'ToolTime Pro vs Housecall Pro',
    heroSubtitle: 'Same powerful scheduling and dispatch — plus AI quoting, compliance tools, and bilingual support. All at a lower price.',
    savingsRange: '$1,200-$4,800/year',
    painPoints: [
      'Housecall Pro starts at $79/mo (just raised prices in Feb 2026)',
      'No compliance tools — you need a separate system for labor law',
      'AI features locked behind expensive tiers',
      'No bilingual support for Spanish-speaking crews',
    ],
    plans: [
      { name: 'Starter / Solo', tooltime: '$30/mo (3 users)', competitor: '$79/mo (1 user)' },
      { name: 'Small Team', tooltime: '$65/mo (8 users)', competitor: '$189/mo (1-5 users)' },
      { name: 'Growing Team', tooltime: '$120/mo (20 users)', competitor: '$399/mo (1-15 users)' },
      { name: 'Extra Users', tooltime: '$7/user/mo', competitor: '$35/user/mo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Online Booking', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'SMS Notifications', tooltime: 'All plans', competitor: 'Essential+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'AI limited to phones', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Worker Mobile App', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'QuickBooks Integration', tooltime: 'All plans', competitor: 'Essential+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 948 },
      { scenario: '5-Person Team', tooltime: 780, competitor: 2268 },
      { scenario: '15-Person Team', tooltime: 1440, competitor: 4788 },
    ],
    switchReasons: [
      { title: 'AI That Runs Your Back Office', description: 'Jenny auto-dispatches crews, follows up on cold leads, alerts you about overdue invoices, and calculates job profitability — all on autopilot. HCP\'s AI just answers phones.' },
      { title: 'Compliance Built In', description: 'ToolTime Shield protects you from misclassification lawsuits, tracks break compliance, and covers 5 states. HCP has nothing like this.' },
      { title: '75% Less Per User', description: 'Add team members for $7/mo vs $35/mo. A 10-person team saves over $3,000/year on user fees alone.' },
      { title: 'Material Estimator', description: '"Paint a 12x14 room" → instant material list with quantities, brands, and costs across 21 trades. No competitor has this.' },
    ],
    faqs: [
      { question: 'Can I migrate from Housecall Pro?', answer: 'Yes! We offer free data migration assistance. Our team imports your customers, job history, and settings. Most migrations complete in under 48 hours.' },
      { question: 'Does ToolTime Pro have a mobile app?', answer: 'Yes — our Worker App works on any phone (iOS/Android) and even works offline. Clock in/out, view jobs, take photos, and sync when you\'re back online.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges. We earn your business every month.' },
      { question: 'What about the AI features?', answer: 'Jenny AI is included in every plan — auto-dispatch, lead follow-up, cash flow alerts, and job costing. No add-on fees, no premium tier required.' },
    ],
  },

  'servicetitan': {
    slug: 'servicetitan',
    name: 'ServiceTitan',
    tagline: 'ToolTime Pro vs ServiceTitan',
    heroSubtitle: 'Enterprise-grade features without the enterprise price tag. No contracts, no $15K termination fees, no hidden costs.',
    savingsRange: '$10,000-$30,000+/year',
    painPoints: [
      'ServiceTitan costs $245-$398+ per technician per month',
      '12-month contracts with $15,000+ termination fees',
      'Hidden pricing — won\'t show costs until sales demo',
      '6-month implementation timeline',
      'Requires dedicated admin staff to manage',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '$245/tech/mo (minimum)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '$398/tech/mo (Pro tier)' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: 'Custom (Enterprise)' },
      { name: 'Contracts', tooltime: 'None — cancel anytime', competitor: '12-month minimum' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Titan Intelligence (extra)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Pricebook (limited)', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Titan Intelligence ($$$)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Available', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'No Contracts', tooltime: 'Cancel anytime', competitor: '12-month lock-in', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Transparent Pricing', tooltime: 'Published online', competitor: 'Hidden until demo', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Same-Day Setup', tooltime: 'Sign up and go', competitor: '6-month implementation', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
    ],
    costExamples: [
      { scenario: '3 Technicians', tooltime: 780, competitor: 8820 },
      { scenario: '10 Technicians', tooltime: 1440, competitor: 29400 },
      { scenario: '20 Technicians', tooltime: 2160, competitor: 47760 },
    ],
    switchReasons: [
      { title: 'Save $10,000-$30,000+ Per Year', description: 'ServiceTitan charges $245-$398 per tech per month. ToolTime Pro gives you the same features for a flat $30-$120/mo. Do the math.' },
      { title: 'No Contracts. Ever.', description: 'ServiceTitan locks you into 12-month contracts with $15,000+ termination fees. We earn your business every month. Cancel anytime, no questions asked.' },
      { title: 'Set Up Today, Not in 6 Months', description: 'ServiceTitan requires months of implementation and dedicated admin staff. ToolTime Pro: sign up, import your data, start working. Same day.' },
      { title: 'Transparent Pricing', description: 'ServiceTitan won\'t show you pricing until you sit through a sales demo. Our pricing is published online. No surprises.' },
    ],
    faqs: [
      { question: 'Can ServiceTitan really cost $15K+ to leave?', answer: 'Yes. ServiceTitan contracts typically include early termination fees that can exceed $15,000. Many contractors feel trapped. ToolTime Pro has zero contracts and zero termination fees.' },
      { question: 'Will I lose features switching from ServiceTitan?', answer: 'No. ToolTime Pro covers scheduling, dispatch, invoicing, quoting, payments, CRM, reporting, and more — plus features ServiceTitan doesn\'t have like compliance tools, bilingual AI, and material estimation.' },
      { question: 'Can you migrate my ServiceTitan data?', answer: 'Yes. We offer free migration assistance for ServiceTitan customers. Export your customer list and job history, and our team handles the import.' },
      { question: 'Is ToolTime Pro powerful enough for a large team?', answer: 'Absolutely. Our Business plan supports 20 users, and you can add more at $7/user. Jenny AI handles dispatch, follow-ups, and cash flow automatically — reducing the admin overhead that ServiceTitan creates.' },
    ],
  },

  'fieldpulse': {
    slug: 'fieldpulse',
    name: 'FieldPulse',
    tagline: 'ToolTime Pro vs FieldPulse',
    heroSubtitle: 'More AI, more compliance tools, more trades support — at a comparable price with no hidden fees.',
    savingsRange: '$600-$2,400/year',
    painPoints: [
      'FieldPulse hides pricing — requires sales demo',
      'No AI-powered features',
      'No compliance or labor law tools',
      'Limited to basic scheduling and invoicing',
      'No material estimator or trade-specific tools',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '~$99/mo (estimated, hidden pricing)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '~$199/mo (estimated)' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: '~$399/mo (estimated)' },
      { name: 'Pricing Transparency', tooltime: 'Published online', competitor: 'Hidden — requires demo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'CRM / Client Management', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Transparent Pricing', tooltime: 'Published online', competitor: 'Hidden', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 1188 },
      { scenario: '5-Person Team', tooltime: 780, competitor: 2388 },
      { scenario: '15-Person Team', tooltime: 1440, competitor: 4788 },
    ],
    switchReasons: [
      { title: 'AI-Native Platform', description: 'FieldPulse has no AI features. ToolTime Pro includes Jenny AI for auto-dispatch, lead follow-up, cash flow alerts, and job costing — all on autopilot.' },
      { title: 'Compliance Protection', description: 'FieldPulse has no labor law compliance tools. ToolTime Shield covers worker classification, break tracking, and multi-state compliance across CA, TX, FL, NY, and IL.' },
      { title: 'Material Estimator', description: '21 trade-specific calculators with real Home Depot/Lowe\'s pricing. "Paint a 12x14 room" → instant material list. FieldPulse has nothing like this.' },
      { title: 'Transparent Pricing', description: 'FieldPulse hides their pricing behind a sales demo. Our pricing is published online — $30/mo starter, $65/mo team, $120/mo business. No surprises.' },
    ],
    faqs: [
      { question: 'Why does FieldPulse hide their pricing?', answer: 'Many FSM platforms hide pricing to qualify leads through sales calls. ToolTime Pro believes in transparency — our pricing is published online with no hidden fees.' },
      { question: 'Can I migrate from FieldPulse?', answer: 'Yes! Export your customer list as a CSV and our team handles the import. Most migrations complete in under 24 hours.' },
      { question: 'Does ToolTime Pro have GPS tracking?', answer: 'Yes — our Worker App includes GPS clock-in/out, real-time location tracking, and route optimization. All included in every plan.' },
      { question: 'What makes ToolTime Pro different from FieldPulse?', answer: 'Three things no competitor has: (1) Jenny AI that autonomously manages your back office, (2) ToolTime Shield compliance tools for labor law, (3) Material Estimator covering 21 trades with real supplier pricing.' },
    ],
  },

  'jobber': {
    slug: 'jobber',
    name: 'Jobber',
    tagline: 'ToolTime Pro vs Jobber',
    heroSubtitle: 'Same features contractors love — scheduling, quoting, invoicing — plus AI, compliance tools, and bilingual support at a fraction of the price.',
    savingsRange: '$2,000-$3,000+/year',
    painPoints: [
      'Jobber Core starts at $39/mo with limited features — Grow plan jumps to $119/mo',
      'No AI-powered features — all quoting and dispatch is manual',
      'No compliance or labor law tools for worker classification',
      'No bilingual support for Spanish-speaking crews',
      'Per-user pricing adds up fast for growing teams',
    ],
    plans: [
      { name: 'Starter / Solo', tooltime: '$30/mo (3 users)', competitor: '$39/mo (1 user, Core)' },
      { name: 'Small Team', tooltime: '$65/mo (8 users)', competitor: '$119/mo (up to 5 users, Connect)' },
      { name: 'Growing Team', tooltime: '$120/mo (20 users)', competitor: '$249/mo (up to 15 users, Grow)' },
      { name: 'Extra Users', tooltime: '$7/user/mo', competitor: '$29/user/mo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Quoting / Estimates', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Online Booking', tooltime: 'All plans', competitor: 'Connect+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Grow only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'QuickBooks Integration', tooltime: 'All plans', competitor: 'Connect+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Automated Follow-Ups', tooltime: 'All plans (Jenny AI)', competitor: 'Grow only', tooltimeIncluded: true, competitorIncluded: 'partial' },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 468 },
      { scenario: '5-Person Team', tooltime: 780, competitor: 1428 },
      { scenario: '15-Person Team', tooltime: 1440, competitor: 2988 },
    ],
    switchReasons: [
      { title: 'AI That Runs Your Back Office', description: 'Jobber has zero AI. ToolTime Pro includes Jenny AI for auto-dispatch, lead follow-up, cash flow alerts, and job costing — all on autopilot.' },
      { title: 'Compliance Protection', description: 'Jobber has no labor law tools. ToolTime Shield covers worker classification, break tracking, and multi-state compliance across CA, TX, FL, NY, and IL.' },
      { title: '75% Less Per User', description: 'Add team members for $7/mo vs $29/mo. A 10-person team saves over $2,600/year on user fees alone.' },
      { title: 'Material Estimator', description: '"Tile a 10x12 bathroom" → instant material list with quantities, brands, and costs across 21 trades. Jobber has nothing like this.' },
    ],
    faqs: [
      { question: 'Can I migrate from Jobber?', answer: 'Yes! We offer free data migration assistance. Our team imports your customers, job history, and settings. Most migrations complete in under 48 hours.' },
      { question: 'Does ToolTime Pro have a mobile app?', answer: 'Yes — our Worker App works on any phone (iOS/Android) and even works offline. Clock in/out, view jobs, take photos, and sync when you\'re back online.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges. We earn your business every month.' },
      { question: 'What about the AI features?', answer: 'Jenny AI is included in every plan — auto-dispatch, lead follow-up, cash flow alerts, and job costing. No add-on fees, no premium tier required.' },
    ],
  },

  'kickserv': {
    slug: 'kickserv',
    name: 'Kickserv',
    tagline: 'ToolTime Pro vs Kickserv',
    heroSubtitle: 'Kickserv keeps it simple — but simple means missing AI, compliance tools, and the features growing contractors need.',
    savingsRange: '$500-$1,800/year',
    painPoints: [
      'Kickserv lacks AI features — everything is manual',
      'No compliance or labor law tools',
      'No material estimator or trade-specific features',
      'Limited reporting and analytics on lower tiers',
      'No bilingual support for multilingual crews',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '$47/mo (Free tier limited to 1 user)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '$95/mo (Standard, up to 5 users)' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: '$191/mo (Business, unlimited users)' },
      { name: 'Extra Users', tooltime: '$7/user/mo', competitor: 'Tier-based pricing' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'CRM / Client Management', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Online Booking', tooltime: 'All plans', competitor: 'Premium only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Premium only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 564 },
      { scenario: '5-Person Team', tooltime: 780, competitor: 1140 },
      { scenario: '15-Person Team', tooltime: 1440, competitor: 2292 },
    ],
    switchReasons: [
      { title: 'AI-Powered Operations', description: 'Kickserv is purely manual. Jenny AI auto-dispatches crews, follows up leads, alerts on overdue invoices, and calculates profitability — zero extra effort.' },
      { title: 'Compliance Built In', description: 'Kickserv has no labor law tools. ToolTime Shield covers worker classification, break compliance, and state-specific rules across CA, TX, FL, NY, and IL.' },
      { title: 'Trade-Specific Tools', description: 'Material estimator covers 21 trades with real supplier pricing. "Install 200 sq ft of hardwood" → instant material list. Kickserv can\'t do this.' },
      { title: 'Bilingual Support', description: 'Full Spanish language support throughout the platform. Over 30% of the trades workforce is Spanish-speaking — ToolTime Pro is built for them.' },
    ],
    faqs: [
      { question: 'Can I migrate from Kickserv?', answer: 'Yes! Export your customer data as CSV and our team handles the import. Most migrations complete in under 24 hours.' },
      { question: 'Is ToolTime Pro harder to use than Kickserv?', answer: 'No — we designed ToolTime Pro to be just as intuitive, with the added benefit of AI handling repetitive tasks automatically. Less clicking, more working.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
      { question: 'Do I need the AI features?', answer: 'Jenny AI is included in every plan at no extra cost. Start with basic features and let AI gradually take over repetitive tasks as you get comfortable.' },
    ],
  },

  'gorilladesk': {
    slug: 'gorilladesk',
    name: 'GorillaDesk',
    tagline: 'ToolTime Pro vs GorillaDesk',
    heroSubtitle: 'GorillaDesk works for pest control and lawn care — but ToolTime Pro covers all 21 trades with AI, compliance, and bilingual support.',
    savingsRange: '$600-$2,000/year',
    painPoints: [
      'GorillaDesk focuses narrowly on pest control and lawn care',
      'No AI features — dispatch, quoting, and follow-up are all manual',
      'No compliance or labor law tools',
      'No material estimator for broader trades',
      'No bilingual support for Spanish-speaking crews',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '$49/mo (Basic, 1 route)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '$99/mo (Pro, per route pricing)' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: '$199+/mo (Pro, multiple routes)' },
      { name: 'Extra Routes/Users', tooltime: '$7/user/mo', competitor: '$49+/route/mo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Route Optimization', tooltime: 'All plans', competitor: 'Pro only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: '21 Trade Categories', tooltime: 'All plans', competitor: 'Pest + Lawn focus', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Pro only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 588 },
      { scenario: '3-Route Operation', tooltime: 780, competitor: 1788 },
      { scenario: '8-Route Operation', tooltime: 1440, competitor: 3576 },
    ],
    switchReasons: [
      { title: 'Beyond Pest & Lawn', description: 'GorillaDesk is built for pest control and lawn care. ToolTime Pro supports 21 trades — HVAC, plumbing, electrical, painting, roofing, and more. One platform for any service business.' },
      { title: 'AI-Powered Operations', description: 'GorillaDesk is 100% manual. Jenny AI auto-dispatches, follows up on leads, sends payment reminders, and calculates job profitability automatically.' },
      { title: 'Compliance Protection', description: 'No labor law tools in GorillaDesk. ToolTime Shield handles worker classification, break tracking, and multi-state compliance for CA, TX, FL, NY, and IL.' },
      { title: 'Better Per-User Economics', description: 'GorillaDesk charges per route ($49+/route). ToolTime Pro charges per user ($7/mo) so you can scale without route-based pricing surprises.' },
    ],
    faqs: [
      { question: 'Can I migrate from GorillaDesk?', answer: 'Yes! Export your customer and job data, and our team handles the import. Most migrations complete in under 24 hours with free assistance.' },
      { question: 'Does ToolTime Pro support recurring services?', answer: 'Absolutely. Set up recurring jobs with custom frequencies, auto-invoicing, and automatic crew assignment via Jenny AI.' },
      { question: 'I only do pest control — is ToolTime Pro overkill?', answer: 'Not at all. Use only the features you need. But you get AI dispatch, compliance tools, and bilingual support that GorillaDesk doesn\'t offer — at a comparable price.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees.' },
    ],
  },

  'workiz': {
    slug: 'workiz',
    name: 'Workiz',
    tagline: 'ToolTime Pro vs Workiz',
    heroSubtitle: 'Workiz has solid dispatching — but ToolTime Pro adds AI automation, compliance tools, and bilingual support at a better price.',
    savingsRange: '$800-$3,000/year',
    painPoints: [
      'Workiz Standard starts at $198/mo for up to 5 users',
      'AI features require expensive add-ons (Genius suite)',
      'No compliance or labor law tools',
      'No material estimator or trade-specific calculators',
      'No bilingual interface for Spanish-speaking crews',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '$198/mo (Standard, 5 users)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '$198/mo + $35/user over 5' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: '$398/mo (Ultimate)' },
      { name: 'AI Features', tooltime: 'Included (Jenny AI)', competitor: 'Genius add-on ($$$)' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Phone System / VoIP', tooltime: 'Not included', competitor: 'Built-in', tooltimeIncluded: false, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Genius add-on', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Genius add-on (limited)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Ultimate only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Lead Management', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 2376 },
      { scenario: '5-Person Team', tooltime: 780, competitor: 2376 },
      { scenario: '15-Person Team', tooltime: 1440, competitor: 4776 },
    ],
    switchReasons: [
      { title: 'AI Included, Not Add-On', description: 'Workiz charges extra for their Genius AI suite. ToolTime Pro includes Jenny AI in every plan — auto-dispatch, lead follow-up, cash flow alerts, and job costing at no additional cost.' },
      { title: 'Compliance Protection', description: 'Workiz has no labor law tools. ToolTime Shield handles worker classification, break tracking, and multi-state compliance to keep you protected.' },
      { title: '80% Lower Starting Price', description: 'Workiz Standard starts at $198/mo. ToolTime Pro starts at $30/mo with more features included. That\'s $2,000+/year in savings from day one.' },
      { title: 'Material Estimator', description: '21 trade-specific calculators with real supplier pricing. Get instant material lists for any job — a feature Workiz simply doesn\'t have.' },
    ],
    faqs: [
      { question: 'Can I migrate from Workiz?', answer: 'Yes! Export your customer and job data from Workiz, and our team handles the import. Most migrations complete in under 48 hours with free assistance.' },
      { question: 'Does ToolTime Pro have a phone system?', answer: 'We don\'t include a built-in VoIP system like Workiz, but we integrate with popular options. Jenny AI handles call follow-ups, lead nurturing, and appointment reminders automatically.' },
      { question: 'Is Workiz better for larger teams?', answer: 'ToolTime Pro scales better economically. Extra users cost $7/mo vs Workiz\'s $35/user. A 15-person team saves over $3,000/year with ToolTime Pro.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
    ],
  },

  'service-fusion': {
    slug: 'service-fusion',
    name: 'Service Fusion',
    tagline: 'ToolTime Pro vs Service Fusion',
    heroSubtitle: 'Service Fusion offers flat-rate pricing — but ToolTime Pro delivers AI, compliance, and bilingual support that Service Fusion can\'t match.',
    savingsRange: '$1,000-$3,600/year',
    painPoints: [
      'Service Fusion Starter is $225/mo — no low-cost entry for small teams',
      'No AI-powered features for dispatch or quoting',
      'No compliance or labor law tools',
      'No bilingual support for Spanish-speaking crews',
      'Add-ons (GPS, inventory) push the real cost much higher',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '$225/mo (Starter, unlimited users)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '$350/mo (Plus)' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: '$575/mo (Pro)' },
      { name: 'GPS Tracking', tooltime: 'Included', competitor: '$25/vehicle add-on' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Estimates / Proposals', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Unlimited Users', tooltime: 'Plan-based (3/8/20)', competitor: 'All plans', tooltimeIncluded: false, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Customer Portal', tooltime: 'All plans', competitor: 'Plus+ only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Inventory Tracking', tooltime: 'All plans', competitor: 'Pro only (add-on)', tooltimeIncluded: true, competitorIncluded: 'addon' },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: 'Solo Contractor', tooltime: 360, competitor: 2700 },
      { scenario: '5-Person Team', tooltime: 780, competitor: 2700 },
      { scenario: '15-Person Team', tooltime: 1440, competitor: 4200 },
    ],
    switchReasons: [
      { title: 'Right-Sized Pricing', description: 'Service Fusion starts at $225/mo even for a solo contractor. ToolTime Pro starts at $30/mo. Why pay for unlimited users when you only have 3?' },
      { title: 'AI-Native Platform', description: 'Service Fusion has no AI features. Jenny AI auto-dispatches crews, follows up leads, manages invoicing alerts, and calculates job profitability automatically.' },
      { title: 'Compliance Built In', description: 'Service Fusion offers no labor law compliance. ToolTime Shield covers worker classification, break tracking, and state-specific rules across CA, TX, FL, NY, and IL.' },
      { title: 'No Nickel-and-Diming', description: 'Service Fusion charges extra for GPS ($25/vehicle), inventory, and other features. ToolTime Pro includes GPS tracking, inventory, and offline mode in every plan.' },
    ],
    faqs: [
      { question: 'Service Fusion has unlimited users — isn\'t that better?', answer: 'Only if you have a large team. Most contractors have 3-15 workers. At $225/mo minimum, you\'re overpaying if you\'re a small team. ToolTime Pro scales with you — start at $30/mo.' },
      { question: 'Can I migrate from Service Fusion?', answer: 'Yes! Export your customer and job data, and our team handles the import free of charge. Most migrations complete in under 48 hours.' },
      { question: 'Does ToolTime Pro have inventory management?', answer: 'Yes — track parts, materials, and stock levels across all plans. Plus our Material Estimator auto-calculates what you need for any job across 21 trades.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
    ],
  },

  'fieldedge': {
    slug: 'fieldedge',
    name: 'FieldEdge',
    tagline: 'ToolTime Pro vs FieldEdge',
    heroSubtitle: 'FieldEdge is built for HVAC and plumbing — ToolTime Pro covers all trades with AI, compliance, and transparent pricing.',
    savingsRange: '$3,000-$10,000+/year',
    painPoints: [
      'FieldEdge hides pricing — requires a sales demo to get a quote',
      'Estimated $100-$200+ per user per month',
      'Long-term contracts often required',
      'Focused on HVAC and plumbing — limited for other trades',
      'No AI dispatch or autonomous features',
    ],
    plans: [
      { name: 'Starter', tooltime: '$30/mo (3 users)', competitor: '~$300+/mo (estimated, hidden pricing)' },
      { name: 'Team', tooltime: '$65/mo (8 users)', competitor: '~$800+/mo (estimated)' },
      { name: 'Business', tooltime: '$120/mo (20 users)', competitor: '~$2,000+/mo (estimated)' },
      { name: 'Pricing Transparency', tooltime: 'Published online', competitor: 'Hidden — requires demo' },
    ],
    features: [
      { name: 'Scheduling & Dispatch', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Invoicing & Payments', tooltime: 'All plans', competitor: 'All plans', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'Flat-Rate Pricing Book', tooltime: 'Material Estimator', competitor: 'Built-in pricebook', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'QuickBooks Integration', tooltime: 'All plans', competitor: 'All plans (deep sync)', tooltimeIncluded: true, competitorIncluded: true },
      { name: 'AI Smart Quoting', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Jenny AI (Autonomous Actions)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Compliance Tools (Shield)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Blended Workforce (W-2 + 1099)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Material Estimator (21 trades)', tooltime: 'All plans', competitor: 'HVAC/Plumbing focus only', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: '21 Trade Categories', tooltime: 'All plans', competitor: 'HVAC + Plumbing', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Offline Mode (PWA)', tooltime: 'All plans', competitor: 'Limited', tooltimeIncluded: true, competitorIncluded: 'partial' },
      { name: 'Bilingual (English/Spanish)', tooltime: 'All plans', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Multi-State Compliance', tooltime: 'CA, TX, FL, NY, IL', competitor: 'Not available', tooltimeIncluded: true, competitorIncluded: false },
      { name: 'Transparent Pricing', tooltime: 'Published online', competitor: 'Hidden — requires demo', tooltimeIncluded: true, competitorIncluded: false },
    ],
    costExamples: [
      { scenario: '3-Person Team', tooltime: 780, competitor: 3600 },
      { scenario: '8-Person Team', tooltime: 1200, competitor: 9600 },
      { scenario: '20-Person Team', tooltime: 2160, competitor: 24000 },
    ],
    switchReasons: [
      { title: 'Transparent Pricing', description: 'FieldEdge hides pricing behind sales demos. ToolTime Pro publishes pricing online — $30/mo starter, $65/mo team, $120/mo business. No surprises, no sales calls.' },
      { title: 'AI-Native Platform', description: 'FieldEdge has no AI features. Jenny AI auto-dispatches, follows up on leads, sends payment reminders, and calculates job profitability — all on autopilot.' },
      { title: 'All 21 Trades, Not Just HVAC', description: 'FieldEdge is narrowly focused on HVAC and plumbing. ToolTime Pro supports landscaping, electrical, painting, roofing, and 16 more trades with specialized tools.' },
      { title: 'No Contracts', description: 'FieldEdge often requires long-term contracts. ToolTime Pro is month-to-month. Cancel anytime, no termination fees.' },
    ],
    faqs: [
      { question: 'Why does FieldEdge hide their pricing?', answer: 'Many enterprise FSM platforms hide pricing to qualify leads through sales. ToolTime Pro believes in transparency — our pricing is published online with no hidden fees or sales calls required.' },
      { question: 'Can I migrate from FieldEdge?', answer: 'Yes! Export your customer list and job history, and our team handles the import free of charge. Most migrations complete in under 48 hours.' },
      { question: 'I\'m an HVAC contractor — is ToolTime Pro good enough?', answer: 'Absolutely. We support HVAC with specialized material estimators, equipment tracking, and maintenance scheduling. Plus you get AI, compliance, and bilingual support that FieldEdge doesn\'t offer.' },
      { question: 'Is there a contract?', answer: 'Never. Month-to-month, cancel anytime. No termination fees, no hidden charges.' },
    ],
  },
};

export function getCompetitor(slug: string): CompetitorData | undefined {
  return COMPETITORS[slug];
}

export function getAllCompetitorSlugs(): string[] {
  return Object.keys(COMPETITORS);
}
