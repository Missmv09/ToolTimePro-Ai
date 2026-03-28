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
};

export function getCompetitor(slug: string): CompetitorData | undefined {
  return COMPETITORS[slug];
}

export function getAllCompetitorSlugs(): string[] {
  return Object.keys(COMPETITORS);
}
