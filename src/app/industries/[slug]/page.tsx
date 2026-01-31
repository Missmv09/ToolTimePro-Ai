import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

// Industry data - only includes marketing content, NOT fake features
const industries: Record<string, {
  name: string;
  icon: string;
  description: string;
  painPoints: string[];
  testimonial: {
    quote: string;
    author: string;
    company: string;
    location: string;
  };
  stats: {
    value: string;
    label: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}> = {
  'landscaping': {
    name: 'Landscaping',
    icon: '🌳',
    description: 'Manage your landscaping business with ease. From design consultations to installation and maintenance, ToolTime Pro handles scheduling, quoting, and crew management.',
    painPoints: ['Juggling multiple job sites and crews', 'Creating professional quotes quickly', 'Managing seasonal fluctuations', 'Keeping clients updated on project progress'],
    testimonial: {
      quote: "We went from sticky notes and spreadsheets to running 3 crews across 40+ weekly accounts. ToolTime Pro literally doubled our capacity.",
      author: "Marcus Chen",
      company: "GreenScape Designs",
      location: "San Diego, CA"
    },
    stats: [
      { value: '40%', label: 'More jobs per week' },
      { value: '2hrs', label: 'Saved daily on admin' },
      { value: '99%', label: 'On-time arrivals' }
    ],
    faqs: [
      { question: 'Can I manage recurring landscape maintenance?', answer: 'Yes! Set up weekly, bi-weekly, or monthly recurring jobs with automatic scheduling and customer notifications.' },
      { question: 'Can my crews see their schedules on their phones?', answer: 'Absolutely. The mobile app shows job details, customer info, navigation, and lets crews upload photos and track time.' },
      { question: 'How do I send professional quotes?', answer: 'Create detailed quotes with line items, then send them directly to customers. They can approve online and you convert to a job instantly.' }
    ]
  },
  'lawn-care': {
    name: 'Lawn Care',
    icon: '🌱',
    description: 'Streamline your lawn care operations. Schedule recurring mowing, fertilization, and treatment services with automated customer reminders.',
    painPoints: ['Route inefficiency burning fuel and time', 'Missed appointments from weather changes', 'Chasing customers for payment', 'Managing seasonal worker schedules'],
    testimonial: {
      quote: "Scheduling and reminders alone save us hours every week. Our customers love getting notified before we arrive.",
      author: "David Rodriguez",
      company: "Fresh Cut Lawn Care",
      location: "Sacramento, CA"
    },
    stats: [
      { value: '25%', label: 'Less time on admin' },
      { value: '3+', label: 'Extra jobs daily' },
      { value: '50%', label: 'Fewer missed calls' }
    ],
    faqs: [
      { question: 'Can I set up recurring weekly services?', answer: 'Yes! Create recurring schedules for any frequency - weekly, bi-weekly, monthly. Customers get automatic reminders.' },
      { question: 'Can customers book online?', answer: 'Yes! We build you a professional booking website where customers can request quotes and schedule services.' },
      { question: 'How do I handle rainy day reschedules?', answer: 'Easily reschedule jobs from the calendar. Customers get automatic notifications about the change.' }
    ]
  },
  'pool-service': {
    name: 'Pool Service',
    icon: '🏊',
    description: 'Keep your pool routes running smoothly. Schedule maintenance, manage recurring cleanings, and invoice customers efficiently.',
    painPoints: ['Managing weekly route changes', 'Billing for extra services on-site', 'Keeping track of recurring customers', 'Chasing payments'],
    testimonial: {
      quote: "Getting paid used to take weeks. Now customers pay right from the invoice link. Cash flow has never been better.",
      author: "Tony Vasquez",
      company: "Crystal Clear Pools",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '2x', label: 'Faster payments' },
      { value: '30min', label: 'Saved per route day' },
      { value: '5-star', label: 'Average review' }
    ],
    faqs: [
      { question: 'Can I manage recurring pool routes?', answer: 'Yes! Set up weekly or bi-weekly recurring services. The schedule repeats automatically.' },
      { question: 'How do I bill for extra work found during service?', answer: 'Create a quote or invoice on the spot from your phone. Send it to the customer and get paid before you leave.' },
      { question: 'Can I track service notes per customer?', answer: 'Yes! Add notes to each customer profile and job. Your whole team can see the history.' }
    ]
  },
  'plumbing': {
    name: 'Plumbing',
    icon: '🔧',
    description: 'Handle emergency calls and scheduled repairs with confidence. Quote jobs on-site and get paid faster.',
    painPoints: ['Emergency calls disrupting scheduled work', 'Creating accurate quotes on-site', 'Chasing customers for payment', 'Keeping track of job details'],
    testimonial: {
      quote: "Being able to quote and invoice from my phone changed everything. Customers pay before I even leave the job site.",
      author: "Robert Kim",
      company: "Premier Plumbing Solutions",
      location: "San Jose, CA"
    },
    stats: [
      { value: '45%', label: 'Faster payments' },
      { value: '$200+', label: 'Avg ticket increase' },
      { value: '2x', label: 'Same-day payments' }
    ],
    faqs: [
      { question: 'Can I create quotes on-site?', answer: 'Yes! Build professional quotes from your phone with line items and pricing. Send instantly for customer approval.' },
      { question: 'How do I manage emergency vs scheduled work?', answer: 'The calendar shows all jobs at a glance. Easily slot in emergency calls and reschedule as needed.' },
      { question: 'Can customers pay online?', answer: 'Yes! Invoices include a payment link. Customers pay by card and you get notified instantly.' }
    ]
  },
  'electrical': {
    name: 'Electrical',
    icon: '⚡',
    description: 'Manage residential and commercial electrical jobs. Schedule your team, send professional quotes, and get paid on time.',
    painPoints: ['Coordinating multiple technicians', 'Creating detailed estimates', 'Tracking job progress', 'Managing paperwork'],
    testimonial: {
      quote: "Professional quotes and fast invoicing made us look more established. We close more jobs now.",
      author: "James Wilson",
      company: "Volt Electric",
      location: "Oakland, CA"
    },
    stats: [
      { value: '35%', label: 'More quotes sent' },
      { value: '100%', label: 'Digital invoices' },
      { value: '35%', label: 'Admin time saved' }
    ],
    faqs: [
      { question: 'Can I schedule multiple technicians?', answer: 'Yes! See your whole team\'s schedule on one calendar. Assign jobs and avoid double-booking.' },
      { question: 'How do I send professional estimates?', answer: 'Create itemized quotes with labor and materials. Send via email or text for customer approval.' },
      { question: 'Does it work for commercial jobs?', answer: 'Absolutely. Handle multi-day projects and create detailed invoices for any job size.' }
    ]
  },
  'hvac': {
    name: 'HVAC',
    icon: '❄️',
    description: 'From installations to service calls, manage your HVAC business efficiently with smart scheduling and professional invoicing.',
    painPoints: ['Managing seasonal demand spikes', 'Tracking recurring maintenance customers', 'Creating detailed service quotes', 'Getting paid on time'],
    testimonial: {
      quote: "Recurring service reminders keep our maintenance customers coming back. Revenue is way more predictable now.",
      author: "Michael Torres",
      company: "Cool Breeze HVAC",
      location: "Fresno, CA"
    },
    stats: [
      { value: '95%', label: 'Customer retention' },
      { value: '60%', label: 'Faster scheduling' },
      { value: '$15K', label: 'Monthly recurring' }
    ],
    faqs: [
      { question: 'Can I set up recurring maintenance reminders?', answer: 'Yes! Schedule recurring services and customers get automatic reminders when it\'s time for their next visit.' },
      { question: 'How do I manage busy season scheduling?', answer: 'See your team\'s availability at a glance. Fill open slots and avoid overbooking during peak times.' },
      { question: 'Can I track customer service history?', answer: 'Yes! Every job is logged to the customer profile. See their complete history anytime.' }
    ]
  },
  'painting': {
    name: 'Painting',
    icon: '🎨',
    description: 'Quote painting jobs accurately with detailed estimates. Manage crew schedules and get paid professionally.',
    painPoints: ['Creating detailed room-by-room estimates', 'Managing multi-day projects', 'Showing quality work to prospects', 'Chasing final payments'],
    testimonial: {
      quote: "Professional quotes with detailed line items helped us close bigger jobs. Customers trust us more.",
      author: "Carlos Mendez",
      company: "Perfect Finish Painting",
      location: "San Francisco, CA"
    },
    stats: [
      { value: '40%', label: 'Higher close rate' },
      { value: '2x', label: 'Faster quotes' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I create detailed room-by-room estimates?', answer: 'Yes! Build quotes with as many line items as you need. Break down by room, prep work, materials - whatever works for your business.' },
      { question: 'How do I schedule multi-day jobs?', answer: 'Block off multiple days on the calendar for one job. Your crew sees the full schedule in their app.' },
      { question: 'Can I include photos in quotes?', answer: 'Yes! Attach photos to jobs and quotes to document scope of work and show customers what to expect.' }
    ]
  },
  'cleaning': {
    name: 'House Cleaning',
    icon: '🧹',
    description: 'Manage recurring cleaning schedules and handle one-time deep cleans with ease. Your clients get reminders, you get paid on time.',
    painPoints: ['Managing recurring vs one-time bookings', 'Handling last-minute cancellations', 'Chasing customers for payment', 'Coordinating multiple cleaners'],
    testimonial: {
      quote: "We scaled from 20 to 80 recurring clients without hiring office staff. ToolTime Pro handles scheduling and reminders automatically.",
      author: "Maria Santos",
      company: "Spotless Home Cleaning",
      location: "Irvine, CA"
    },
    stats: [
      { value: '4x', label: 'Client growth' },
      { value: '90%', label: 'Recurring revenue' },
      { value: '0', label: 'Office staff needed' }
    ],
    faqs: [
      { question: 'Can I manage recurring cleaning schedules?', answer: 'Yes! Set up weekly, bi-weekly, or monthly cleanings. They repeat automatically with customer reminders.' },
      { question: 'How do I handle cancellations?', answer: 'Easily reschedule or cancel from the calendar. Customers get notified automatically.' },
      { question: 'Can my cleaners see their schedule?', answer: 'Yes! Each team member gets the mobile app with their daily schedule, customer details, and navigation.' }
    ]
  },
  'roofing': {
    name: 'Roofing',
    icon: '🏠',
    description: 'Handle roof inspections, repairs, and full replacements. Create detailed estimates and manage multi-day crew schedules.',
    painPoints: ['Creating accurate detailed estimates', 'Managing multi-day crew schedules', 'Tracking job progress', 'Collecting large payments'],
    testimonial: {
      quote: "Professional estimates helped us win bigger jobs. Customers see we\'re organized and trustworthy.",
      author: "Kevin O\'Brien",
      company: "Summit Roofing",
      location: "Riverside, CA"
    },
    stats: [
      { value: '50%', label: 'Faster estimates' },
      { value: '35%', label: 'Higher close rate' },
      { value: '$50K', label: 'Avg job value' }
    ],
    faqs: [
      { question: 'Can I create detailed roofing estimates?', answer: 'Yes! Build itemized quotes with materials, labor, and any line items you need. Send professionally branded estimates.' },
      { question: 'How do I schedule multi-day jobs?', answer: 'Block multiple days on the calendar. Your crew sees the full project schedule in their app.' },
      { question: 'Can I collect deposits?', answer: 'Yes! Send invoices for deposits or progress payments. Customers pay online by card.' }
    ]
  },
  'pest-control': {
    name: 'Pest Control',
    icon: '🐜',
    description: 'Schedule treatments, manage recurring services, and keep your pest control business running smoothly.',
    painPoints: ['Managing quarterly treatment schedules', 'Tracking service history per property', 'Sending recurring reminders', 'Getting paid on time'],
    testimonial: {
      quote: "Recurring service scheduling is a game-changer. Customers automatically come back every quarter.",
      author: "Steven Park",
      company: "Guardian Pest Control",
      location: "Long Beach, CA"
    },
    stats: [
      { value: '85%', label: 'Recurring customers' },
      { value: '3hrs', label: 'Saved weekly on admin' },
      { value: '2x', label: 'Faster payments' }
    ],
    faqs: [
      { question: 'Can I set up quarterly recurring services?', answer: 'Yes! Schedule recurring treatments at any interval. Customers get automatic reminders before each visit.' },
      { question: 'How do I track service history?', answer: 'Every job is logged to the customer profile. See their complete treatment history anytime.' },
      { question: 'Can technicians add notes in the field?', answer: 'Yes! The mobile app lets techs add notes and photos to each job for complete documentation.' }
    ]
  },
  'auto-detailing': {
    name: 'Auto Detailing',
    icon: '🚗',
    description: 'Manage mobile or shop-based detailing. Book appointments, offer service packages, and build repeat customers.',
    painPoints: ['Managing different service packages', 'Scheduling appointments efficiently', 'Building repeat customer base', 'Looking professional to customers'],
    testimonial: {
      quote: "Online booking through our website brings in new customers every week. We look way more professional now.",
      author: "Andre Jackson",
      company: "Elite Auto Spa",
      location: "Beverly Hills, CA"
    },
    stats: [
      { value: '60%', label: 'More bookings' },
      { value: '35%', label: 'Repeat customers' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I offer different service packages?', answer: 'Yes! Create quotes with different service tiers. Customers can choose and approve online.' },
      { question: 'Do I get a booking website?', answer: 'Yes! ToolTime Pro includes a professional website with online booking - no extra cost.' },
      { question: 'Can I send appointment reminders?', answer: 'Absolutely. Customers get automatic reminders before their appointment.' }
    ]
  },
  'pressure-washing': {
    name: 'Pressure Washing',
    icon: '💦',
    description: 'Quote pressure washing jobs, schedule seasonal work, and manage your business professionally.',
    painPoints: ['Creating accurate quotes', 'Managing seasonal demand', 'Looking professional to commercial clients', 'Getting paid on time'],
    testimonial: {
      quote: "Professional quotes helped us land commercial accounts. We look like a real business now.",
      author: "Brian Foster",
      company: "PowerClean Pressure Washing",
      location: "San Diego, CA"
    },
    stats: [
      { value: '3x', label: 'Commercial accounts' },
      { value: '$500', label: 'Avg job increase' },
      { value: '40%', label: 'Repeat customers' }
    ],
    faqs: [
      { question: 'Can I create professional quotes?', answer: 'Yes! Build detailed estimates with line items for different surfaces and services. Send branded quotes instantly.' },
      { question: 'How do I manage seasonal busy periods?', answer: 'See your schedule at a glance. Book jobs efficiently and avoid overbooking during peak season.' },
      { question: 'Can I schedule recurring commercial work?', answer: 'Yes! Set up recurring jobs for regular commercial clients. They repeat automatically.' }
    ]
  },
  'flooring': {
    name: 'Flooring',
    icon: '🪵',
    description: 'Manage flooring installations and refinishing projects. Create detailed quotes, schedule installations, and handle multi-room jobs.',
    painPoints: ['Creating detailed project estimates', 'Scheduling multi-day installations', 'Managing different flooring types', 'Collecting progress payments'],
    testimonial: {
      quote: "Detailed quotes with line items for each room helped us look more professional. Customers trust our pricing now.",
      author: "Tom Anderson",
      company: "Precision Flooring",
      location: "Pasadena, CA"
    },
    stats: [
      { value: '35%', label: 'Higher close rate' },
      { value: '2x', label: 'Faster quotes' },
      { value: '$2K', label: 'Avg job increase' }
    ],
    faqs: [
      { question: 'Can I create room-by-room estimates?', answer: 'Yes! Build quotes with line items for each room, including materials and labor. Send professional estimates instantly.' },
      { question: 'How do I schedule multi-day installations?', answer: 'Block multiple days on the calendar for one project. Your team sees the full schedule.' },
      { question: 'Can I collect deposits?', answer: 'Yes! Send deposit invoices before starting. Customers pay online and you\'re protected.' }
    ]
  },
  'handyman': {
    name: 'Handyman',
    icon: '🛠️',
    description: 'Handle the variety of a handyman business. Quote multiple tasks, manage your schedule, and get paid professionally.',
    painPoints: ['Quoting jobs with many different tasks', 'Managing a varied schedule', 'Looking professional to customers', 'Chasing payments'],
    testimonial: {
      quote: "Professional quotes and invoices make me look like an established business. I close way more jobs now.",
      author: "Rick Martinez",
      company: "Handy Rick Services",
      location: "Anaheim, CA"
    },
    stats: [
      { value: '2x', label: 'Jobs closed' },
      { value: '50+', label: 'Repeat customers' },
      { value: '4.8', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I quote multiple tasks on one estimate?', answer: 'Yes! Add as many line items as you need - different tasks, hourly rates, or flat fees all on one quote.' },
      { question: 'How do I manage my schedule?', answer: 'See all your jobs on one calendar. Easily add, move, or reschedule appointments.' },
      { question: 'Can I get paid on-site?', answer: 'Yes! Send invoices from your phone with a payment link. Customers pay by card instantly.' }
    ]
  },
  'tree-service': {
    name: 'Tree Service',
    icon: '🌲',
    description: 'Manage tree trimming, removal, and emergency storm work. Create detailed quotes and schedule your crews.',
    painPoints: ['Creating accurate removal estimates', 'Managing crew schedules', 'Responding to storm emergencies', 'Looking professional for big jobs'],
    testimonial: {
      quote: "Professional estimates helped us win bigger tree removal jobs. Customers see we\'re organized and safe.",
      author: "Jake Morrison",
      company: "Treeline Arbor Care",
      location: "Santa Rosa, CA"
    },
    stats: [
      { value: '70%', label: 'Faster quotes' },
      { value: '$10K', label: 'Avg removal job' },
      { value: '100%', label: 'Jobs documented' }
    ],
    faqs: [
      { question: 'Can I create detailed removal estimates?', answer: 'Yes! Build quotes with line items for removal, stump grinding, hauling - whatever the job needs.' },
      { question: 'How do I manage emergency storm calls?', answer: 'Easily add emergency jobs to the calendar. See crew availability and schedule on the fly.' },
      { question: 'Can I document jobs with photos?', answer: 'Yes! Crews can upload before/after photos from the mobile app. Great for records and marketing.' }
    ]
  },
  'moving': {
    name: 'Moving',
    icon: '📦',
    description: 'Coordinate moves of any size. Create detailed quotes, schedule your crews, and get paid professionally.',
    painPoints: ['Creating accurate move estimates', 'Scheduling crews and trucks', 'Managing multi-day moves', 'Collecting payment professionally'],
    testimonial: {
      quote: "Professional quotes and easy payment helped us look more established. Customers book us over the competition.",
      author: "Daniel Lee",
      company: "Swift Moving Co",
      location: "San Jose, CA"
    },
    stats: [
      { value: '40%', label: 'More bookings' },
      { value: '25%', label: 'Faster estimates' },
      { value: '5-star', label: 'Average review' }
    ],
    faqs: [
      { question: 'Can I create detailed moving quotes?', answer: 'Yes! Build estimates with hourly rates, flat fees, packing supplies - whatever you need.' },
      { question: 'How do I schedule multiple crews?', answer: 'See your whole team on one calendar. Assign movers to jobs and avoid scheduling conflicts.' },
      { question: 'Can I collect deposits?', answer: 'Yes! Send deposit invoices to confirm bookings. Customers pay online securely.' }
    ]
  },
  'junk-removal': {
    name: 'Junk Removal',
    icon: '🗑️',
    description: 'Quote junk removal jobs and manage your hauling business professionally.',
    painPoints: ['Estimating job sizes', 'Scheduling pickups efficiently', 'Looking professional to customers', 'Getting paid on the spot'],
    testimonial: {
      quote: "Taking payment on-site changed everything. No more chasing customers or bounced checks.",
      author: "Chris Williams",
      company: "Haul It Away",
      location: "Oakland, CA"
    },
    stats: [
      { value: '40%', label: 'More accurate quotes' },
      { value: '3+', label: 'Jobs per day' },
      { value: '$300', label: 'Avg job revenue' }
    ],
    faqs: [
      { question: 'Can I quote on-site?', answer: 'Yes! Create quotes from your phone based on what you see. Send for approval or convert to invoice right there.' },
      { question: 'How do I get paid on the spot?', answer: 'Send an invoice with a payment link. Customers pay by card before you even load the truck.' },
      { question: 'Can I manage my schedule easily?', answer: 'Yes! See all your pickups on one calendar. Add jobs, reschedule, and stay organized.' }
    ]
  },
  'appliance-repair': {
    name: 'Appliance Repair',
    icon: '🔌',
    description: 'Manage service calls efficiently. Quote repairs on-site and get paid before you leave.',
    painPoints: ['Creating repair estimates on-site', 'Scheduling service calls', 'Tracking customer history', 'Collecting payment'],
    testimonial: {
      quote: "On-site quotes and instant invoicing made us way more efficient. We get paid before leaving every job.",
      author: "Paul Nguyen",
      company: "Fix-It Appliance Repair",
      location: "Burbank, CA"
    },
    stats: [
      { value: '30%', label: 'Faster payments' },
      { value: '95%', label: 'Same-day collection' },
      { value: '$150', label: 'Avg service call' }
    ],
    faqs: [
      { question: 'Can I quote repairs on-site?', answer: 'Yes! Create quotes from your phone with parts and labor. Get approval and start the repair.' },
      { question: 'How do I track customer history?', answer: 'Every service call is logged to the customer profile. See their complete history next time they call.' },
      { question: 'Can I get paid on-site?', answer: 'Yes! Send invoices with payment links. Customers pay by card instantly.' }
    ]
  },
  'garage-door': {
    name: 'Garage Door',
    icon: '🚪',
    description: 'Handle garage door repairs and installations. Manage emergency calls and scheduled service efficiently.',
    painPoints: ['Managing emergency calls', 'Creating on-site estimates', 'Scheduling service calls', 'Getting paid quickly'],
    testimonial: {
      quote: "Emergency calls used to be chaos. Now we schedule on the fly and get paid before leaving.",
      author: "Mike Sullivan",
      company: "Precision Garage Doors",
      location: "Stockton, CA"
    },
    stats: [
      { value: '<1hr', label: 'Quote to payment' },
      { value: '40%', label: 'More emergency calls' },
      { value: '$400', label: 'Avg ticket' }
    ],
    faqs: [
      { question: 'Can I handle emergency calls?', answer: 'Yes! Quickly add emergency jobs to your schedule. Quote and invoice on-site.' },
      { question: 'How do I create estimates?', answer: 'Build quotes from your phone with parts and labor. Send professionally branded estimates instantly.' },
      { question: 'Can customers pay on-site?', answer: 'Yes! Send invoice with payment link. Get paid by card before you leave.' }
    ]
  },
  'window-cleaning': {
    name: 'Window Cleaning',
    icon: '🪟',
    description: 'Manage residential and commercial window cleaning. Schedule recurring services and grow your route.',
    painPoints: ['Building recurring routes', 'Managing seasonal schedules', 'Looking professional for commercial clients', 'Tracking customer history'],
    testimonial: {
      quote: "Recurring scheduling built our route to 50+ regular customers. Revenue is predictable now.",
      author: "Eric Chen",
      company: "Crystal View Window Cleaning",
      location: "San Francisco, CA"
    },
    stats: [
      { value: '3x', label: 'Route growth' },
      { value: '50+', label: 'Recurring accounts' },
      { value: '80%', label: 'Recurring revenue' }
    ],
    faqs: [
      { question: 'Can I set up recurring cleanings?', answer: 'Yes! Schedule monthly, quarterly, or seasonal recurring services. They repeat automatically.' },
      { question: 'How do I manage my route?', answer: 'See all your jobs on the calendar. Build efficient daily routes and avoid backtracking.' },
      { question: 'Can I invoice commercial clients?', answer: 'Yes! Create professional invoices for any amount. Commercial clients can pay online.' }
    ]
  },
};

// List of all industry slugs for static generation
const allIndustrySlugs = [
  'landscaping', 'lawn-care', 'tree-service', 'pool-service', 'irrigation', 'fencing', 'snow-removal', 'pressure-washing',
  'plumbing', 'electrical', 'hvac', 'roofing', 'painting', 'flooring', 'carpentry', 'drywall', 'concrete', 'welding', 'insulation', 'siding',
  'cleaning', 'commercial-cleaning', 'carpet-cleaning', 'window-cleaning', 'gutter-cleaning', 'chimney-sweep', 'janitorial',
  'handyman', 'appliance-repair', 'garage-door', 'locksmith', 'glass-mirror', 'furniture-assembly', 'tv-mounting',
  'pest-control', 'solar', 'home-inspection', 'septic', 'security-systems', 'home-theater', 'smart-home',
  'auto-detailing', 'mobile-car-wash', 'towing', 'mobile-mechanic',
  'moving', 'junk-removal', 'delivery', 'storage',
  'pet-sitting', 'dog-walking', 'pet-grooming', 'mobile-grooming',
  'photography', 'event-planning', 'catering', 'dj-services'
];

// Generate static params for all industries
export function generateStaticParams() {
  return allIndustrySlugs.map((slug) => ({
    slug: slug,
  }));
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const industry = industries[slug];
  const name = industry?.name || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${name} Software | ToolTime Pro - Scheduling, Quoting & Invoicing`,
    description: `ToolTime Pro helps ${name} businesses manage scheduling, send professional quotes, track crews, and get paid faster. Start your free trial today.`,
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = industries[slug];

  // Fallback for industries not explicitly defined
  const displayIndustry = industry || {
    name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    icon: '🛠️',
    description: `ToolTime Pro works perfectly for ${slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} businesses. Schedule jobs, send professional quotes, manage your crew, and get paid faster.`,
    painPoints: ['Managing your schedule efficiently', 'Creating professional quotes', 'Coordinating your team', 'Getting paid on time'],
    testimonial: {
      quote: "ToolTime Pro transformed how we run our business. Everything is organized and our customers love the professional experience.",
      author: "Happy Customer",
      company: "Local Service Business",
      location: "California"
    },
    stats: [
      { value: '50%', label: 'Time saved on admin' },
      { value: '2x', label: 'Faster payments' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Will ToolTime Pro work for my business?', answer: 'Yes! ToolTime Pro is designed to adapt to any service business. Schedule jobs, send quotes, manage your team, and invoice customers - all in one place.' },
      { question: 'How long does setup take?', answer: 'Most businesses are up and running in under an hour. Import your customers and start scheduling right away.' },
      { question: 'Is there a contract?', answer: 'No contracts. Month-to-month billing with a 14-day free trial to make sure it\'s right for you.' }
    ]
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
              <p className="text-xl text-[#f5a623] mt-2">Scheduling, Quoting & Invoicing Made Easy</p>
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

      {/* Stats Section */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-3 gap-8">
            {displayIndustry.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-[#f5a623]">{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-16 bg-[#fef3d6]/30">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4 text-center">
            Sound Familiar?
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            {displayIndustry.name} businesses deal with these challenges every day. ToolTime Pro helps.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {displayIndustry.painPoints.map((pain, index) => (
              <div key={index} className="flex items-start gap-3 bg-white rounded-xl p-5 border border-gray-100">
                <span className="text-red-500 text-xl">😫</span>
                <div>
                  <p className="text-gray-700">{pain}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-lg text-[#1a1a2e] font-semibold mb-4">ToolTime Pro helps with all of this.</p>
            <Link
              href="/auth/signup"
              className="inline-block px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold no-underline hover:bg-[#e6991a] transition-all"
            >
              Start Free Trial →
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features - ACTUAL FEATURES ONLY */}
      <section className="py-16 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-4 text-center">Everything You Need to Run Your {displayIndustry.name} Business</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            ToolTime Pro gives you the tools to schedule, quote, manage your team, and get paid - all in one place.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📅
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Smart Scheduling</h3>
              <p className="text-gray-600">Drag-and-drop calendar with recurring jobs, automated customer reminders, and easy rescheduling.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📱
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Crew Mobile App</h3>
              <p className="text-gray-600">Your team gets job details, customer info, navigation, time tracking, and photo uploads - all in one app.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                💰
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Quoting & Invoicing</h3>
              <p className="text-gray-600">Create professional quotes on-site, convert to invoices with one tap, and get paid online by card.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">ToolTime Shield</h3>
              <p className="text-gray-600">California labor law compliance built-in. Worker classification tools, final pay calculators, and HR document templates.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🌐
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Booking Website</h3>
              <p className="text-gray-600">We build and host your professional website with online booking - included free with every plan.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#fef3d6] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                📊
              </div>
              <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">Business Reports</h3>
              <p className="text-gray-600">Track revenue, see job history, and monitor your business performance with real-time dashboards.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 bg-[#1a1a2e] text-white">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <div className="text-5xl mb-6">⭐⭐⭐⭐⭐</div>
          <blockquote className="text-2xl md:text-3xl font-medium mb-8 leading-relaxed">
            &ldquo;{displayIndustry.testimonial.quote}&rdquo;
          </blockquote>
          <div className="text-[#f5a623] font-semibold">{displayIndustry.testimonial.author}</div>
          <div className="text-white/60">{displayIndustry.testimonial.company} • {displayIndustry.testimonial.location}</div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-[800px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#1a1a2e] mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {displayIndustry.faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-100">
                <h3 className="font-semibold text-[#1a1a2e] mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor Comparison Hint */}
      <section className="py-12 bg-white border-t border-b">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <p className="text-gray-600 mb-4">Comparing {displayIndustry.name} software options?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/compare/jobber"
              className="px-6 py-3 bg-gray-100 text-[#1a1a2e] rounded-lg font-medium no-underline hover:bg-gray-200 transition-all"
            >
              ToolTime Pro vs Jobber →
            </Link>
            <Link
              href="/compare/housecall-pro"
              className="px-6 py-3 bg-gray-100 text-[#1a1a2e] rounded-lg font-medium no-underline hover:bg-gray-200 transition-all"
            >
              ToolTime Pro vs Housecall Pro →
            </Link>
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
            Join thousands of California service pros who use ToolTime Pro.
            Start your free 14-day trial - no credit card required.
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
