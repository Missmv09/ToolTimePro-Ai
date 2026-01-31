'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

const industries: Record<string, { name: string; icon: string; description: string; features: string[] }> = {
  'landscaping': {
    name: 'Landscaping',
    icon: '🌳',
    description: 'Manage your landscaping business with ease. From design consultations to installation and maintenance, ToolTime Pro handles scheduling, quoting, and crew management.',
    features: ['Project scheduling & recurring jobs', 'Before/after photo documentation', 'Material cost tracking', 'Crew assignment & route optimization']
  },
  'lawn-care': {
    name: 'Lawn Care',
    icon: '🌱',
    description: 'Streamline your lawn care operations. Schedule recurring mowing, fertilization, and treatment services with automated customer reminders.',
    features: ['Recurring service scheduling', 'Route optimization', 'Weather-based rescheduling', 'Upsell tracking for treatments']
  },
  'pool-service': {
    name: 'Pool Service',
    icon: '🏊',
    description: 'Keep your pool routes running smoothly. Track chemical readings, schedule maintenance, and manage recurring cleanings.',
    features: ['Chemical log tracking', 'Equipment maintenance alerts', 'Recurring route management', 'Photo documentation']
  },
  'plumbing': {
    name: 'Plumbing',
    icon: '🔧',
    description: 'Handle emergency calls and scheduled repairs with confidence. Quote jobs on-site, track parts, and get paid faster.',
    features: ['Emergency dispatch', 'Parts inventory tracking', 'On-site quoting & invoicing', 'Permit tracking']
  },
  'electrical': {
    name: 'Electrical',
    icon: '⚡',
    description: 'Manage residential and commercial electrical jobs. Track permits, schedule inspections, and keep your team organized.',
    features: ['Permit management', 'Inspection scheduling', 'Load calculation tools', 'Code compliance checklists']
  },
  'hvac': {
    name: 'HVAC',
    icon: '❄️',
    description: 'From installations to maintenance contracts, manage your HVAC business efficiently with seasonal scheduling and equipment tracking.',
    features: ['Maintenance contract management', 'Equipment history tracking', 'Seasonal scheduling', 'Warranty tracking']
  },
  'painting': {
    name: 'Painting',
    icon: '🎨',
    description: 'Quote painting jobs accurately with room-by-room estimates. Track paint inventory and manage crew schedules.',
    features: ['Square footage calculator', 'Paint inventory tracking', 'Color/finish documentation', 'Before/after photos']
  },
  'cleaning': {
    name: 'House Cleaning',
    icon: '🧹',
    description: 'Manage recurring cleaning schedules, track supplies, and handle one-time deep cleans with ease.',
    features: ['Recurring schedule management', 'Supply tracking', 'Room checklist templates', 'Quality control reports']
  },
  'roofing': {
    name: 'Roofing',
    icon: '🏠',
    description: 'Handle roof inspections, repairs, and full replacements. Document damage, create estimates, and manage multi-day projects.',
    features: ['Drone/photo documentation', 'Material calculators', 'Weather scheduling', 'Insurance claim support']
  },
  'pest-control': {
    name: 'Pest Control',
    icon: '🐜',
    description: 'Schedule treatments, track recurring services, and maintain compliance documentation for your pest control business.',
    features: ['Treatment scheduling', 'Chemical usage tracking', 'Compliance documentation', 'Recurring service routes']
  },
  'auto-detailing': {
    name: 'Auto Detailing',
    icon: '🚗',
    description: 'Manage mobile or shop-based detailing. Book appointments, track packages, and build repeat customers.',
    features: ['Package/tier pricing', 'Mobile scheduling', 'Before/after photos', 'Membership management']
  },
  'pressure-washing': {
    name: 'Pressure Washing',
    icon: '💦',
    description: 'Quote by square footage, schedule seasonal work, and manage commercial contracts for your pressure washing business.',
    features: ['Square footage pricing', 'Seasonal marketing', 'Commercial contracts', 'Equipment maintenance logs']
  },
  'flooring': {
    name: 'Flooring',
    icon: '🪵',
    description: 'Manage flooring installations and refinishing projects. Track materials, schedule installations, and handle multi-room jobs.',
    features: ['Material calculators', 'Room measurements', 'Subfloor inspection logs', 'Acclimation scheduling']
  },
  'handyman': {
    name: 'Handyman',
    icon: '🛠️',
    description: 'Handle the variety of a handyman business. Quote multiple tasks, track time, and manage your tool inventory.',
    features: ['Multi-task job tracking', 'Hourly + flat rate pricing', 'Tool inventory', 'Repeat customer discounts']
  },
  'tree-service': {
    name: 'Tree Service',
    icon: '🌲',
    description: 'Manage tree trimming, removal, and emergency storm work. Create accurate quotes and track crew equipment.',
    features: ['Hazard assessments', 'Permit tracking', 'Equipment checklists', 'Emergency dispatch']
  },
  'moving': {
    name: 'Moving',
    icon: '📦',
    description: 'Coordinate moves of any size. Track inventory, manage crews, and handle packing supplies and truck scheduling.',
    features: ['Inventory tracking', 'Truck scheduling', 'Crew assignment', 'Packing supply management']
  },
  'junk-removal': {
    name: 'Junk Removal',
    icon: '🗑️',
    description: 'Quote junk removal jobs, track truck loads, and manage disposal/donation routing for your hauling business.',
    features: ['Load-based pricing', 'Disposal tracking', 'Donation receipts', 'Route optimization']
  },
  'appliance-repair': {
    name: 'Appliance Repair',
    icon: '🔌',
    description: 'Diagnose and repair appliances efficiently. Track parts, manage warranties, and schedule follow-up visits.',
    features: ['Diagnostic checklists', 'Parts ordering', 'Warranty tracking', 'Appliance history logs']
  },
  'garage-door': {
    name: 'Garage Door',
    icon: '🚪',
    description: 'Handle garage door repairs and installations. Track springs, openers, and manage emergency service calls.',
    features: ['Parts inventory', 'Emergency dispatch', 'Opener programming logs', 'Safety inspection checklists']
  },
  'window-cleaning': {
    name: 'Window Cleaning',
    icon: '🪟',
    description: 'Manage residential and commercial window cleaning routes. Track recurring schedules and handle high-rise equipment.',
    features: ['Per-pane pricing', 'Route management', 'Commercial contracts', 'Safety equipment logs']
  },
};

export default function IndustryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const industry = industries[slug];

  // Fallback for industries not explicitly defined
  const displayIndustry = industry || {
    name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    icon: '🛠️',
    description: `ToolTime Pro works perfectly for ${slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} businesses. Our flexible platform adapts to your unique workflows and service offerings.`,
    features: ['Custom service definitions', 'Flexible scheduling', 'Mobile crew app', 'Professional invoicing']
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Promo Banner */}
      <div className="bg-[#1a1a2e] text-white text-center py-2.5 px-4 text-sm">
        <span className="mr-2">🚀</span>
        Limited Time: Get 2 months free on annual plans.
        <Link href="/auth/signup" className="text-[#f5a623] font-semibold ml-2 hover:underline">
          Start Free Trial
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Image
              src="/logo-01262026.png"
              alt="ToolTime Pro"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">Features</Link>
            <Link href="/industries" className="text-[#f5a623] font-medium text-base transition-colors no-underline">Industries</Link>
            <Link href="/pricing" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">Pricing</Link>
            <Link href="/tools" className="text-[#5c5c70] font-medium text-base hover:text-[#1a1a2e] transition-colors no-underline">Free Tools</Link>
            <Link
              href="/auth/signup"
              className="bg-[#f5a623] text-[#1a1a2e] px-5 py-2.5 rounded-lg font-semibold text-base shadow-[0_4px_12px_rgba(245,166,35,0.3)] hover:bg-[#e6991a] transition-all no-underline"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-12 bg-gradient-to-br from-[#1a1a2e] to-[#2d2d44] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-[#f5a623] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <Link href="/industries" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-6 no-underline">
            ← Back to All Industries
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-6xl">{displayIndustry.icon}</span>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold">
                {displayIndustry.name} Software
              </h1>
              <p className="text-xl text-[#f5a623] mt-2">Built for California service pros</p>
            </div>
          </div>

          <p className="text-xl text-gray-300 mb-8 max-w-2xl">
            {displayIndustry.description}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold shadow-lg hover:bg-[#e6991a] transition-all no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo/dashboard"
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all no-underline"
            >
              See Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-8 text-center">
            Features for {displayIndustry.name} Businesses
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayIndustry.features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border-2 border-gray-100 hover:border-[#f5a623] transition-all">
                <div className="text-2xl mb-3">✓</div>
                <h3 className="font-semibold text-[#1a1a2e]">{feature}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4 text-center">Plus Everything You Need to Run Your Business</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Every ToolTime Pro plan includes these powerful features
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📅
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Drag-and-drop calendar with route optimization and automated customer reminders.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📱
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Crew Mobile App</h3>
              <p className="text-gray-600">Your team gets job details, navigation, time tracking, and photo uploads — all in one app.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                💰
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Quoting & Invoicing</h3>
              <p className="text-gray-600">Create professional quotes on-site, convert to invoices, and get paid faster.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">ToolTime Shield</h3>
              <p className="text-gray-600">California labor law compliance built-in. Worker classification, final pay rules, and HR docs.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🌐
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Booking Website</h3>
              <p className="text-gray-600">We build and host your professional website with online booking — included free.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📊
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Business Reports</h3>
              <p className="text-gray-600">Track revenue, job profitability, and crew performance with real-time dashboards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-[#f5a623] to-[#e6991a]">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4">
            Ready to Grow Your {displayIndustry.name} Business?
          </h2>
          <p className="text-[#1a1a2e]/80 text-lg mb-8">
            Join thousands of California service pros who switched to ToolTime Pro.
            Start your free 14-day trial — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold shadow-lg hover:bg-[#2d2d44] transition-all no-underline"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-4 bg-white text-[#1a1a2e] rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-all no-underline"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#12121f] text-white py-12 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <Link href="/" className="inline-block mb-4">
            <Image
              src="/logo-horizontal-white-01262026.png"
              alt="ToolTime Pro"
              width={180}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <p className="text-white/40 text-base">
            © 2026 ToolTime Pro. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
