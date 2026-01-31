import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

// Complete industry data with rich content
const industries: Record<string, {
  name: string;
  icon: string;
  description: string;
  features: string[];
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
    features: ['Project scheduling & recurring jobs', 'Before/after photo documentation', 'Material cost tracking', 'Crew assignment & route optimization'],
    painPoints: ['Juggling multiple job sites and crews', 'Tracking materials and costs per project', 'Managing seasonal fluctuations', 'Keeping clients updated on project progress'],
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
      { question: 'How do I track materials for each project?', answer: 'Add materials directly to jobs with costs. ToolTime Pro tracks your margins and generates purchase orders.' },
      { question: 'Can my crews clock in from the field?', answer: 'Absolutely. The mobile app includes GPS-verified time tracking, job photos, and customer signatures.' }
    ]
  },
  'lawn-care': {
    name: 'Lawn Care',
    icon: '🌱',
    description: 'Streamline your lawn care operations. Schedule recurring mowing, fertilization, and treatment services with automated customer reminders.',
    features: ['Recurring service scheduling', 'Route optimization', 'Weather-based rescheduling', 'Upsell tracking for treatments'],
    painPoints: ['Route inefficiency burning fuel and time', 'Missed appointments from weather changes', 'Tracking which lawns need treatments', 'Managing seasonal worker schedules'],
    testimonial: {
      quote: "Route optimization alone saves us 90 minutes a day. That's an extra 2-3 lawns we can service.",
      author: "David Rodriguez",
      company: "Fresh Cut Lawn Care",
      location: "Sacramento, CA"
    },
    stats: [
      { value: '25%', label: 'Fuel savings' },
      { value: '3+', label: 'Extra jobs daily' },
      { value: '50%', label: 'Fewer missed calls' }
    ],
    faqs: [
      { question: 'How does route optimization work?', answer: 'ToolTime Pro automatically sequences your daily jobs to minimize drive time between stops.' },
      { question: 'Can customers book online?', answer: 'Yes! We build you a professional booking website where customers can request quotes and schedule services.' },
      { question: 'What about rainy days?', answer: 'One-click reschedule moves all affected jobs and automatically notifies customers.' }
    ]
  },
  'pool-service': {
    name: 'Pool Service',
    icon: '🏊',
    description: 'Keep your pool routes running smoothly. Track chemical readings, schedule maintenance, and manage recurring cleanings.',
    features: ['Chemical log tracking', 'Equipment maintenance alerts', 'Recurring route management', 'Photo documentation'],
    painPoints: ['Remembering chemical readings for each pool', 'Tracking equipment that needs repair', 'Managing weekly route changes', 'Billing for extra services on-site'],
    testimonial: {
      quote: "Chemical logs used to be a nightmare. Now everything's in the app and customers can see their pool history anytime.",
      author: "Tony Vasquez",
      company: "Crystal Clear Pools",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '100%', label: 'Digital chemical logs' },
      { value: '30min', label: 'Saved per route day' },
      { value: '5-star', label: 'Average review' }
    ],
    faqs: [
      { question: 'Can I log chemical readings in the app?', answer: 'Yes! Record pH, chlorine, alkalinity and more. Historical data helps you spot trends and prevent problems.' },
      { question: 'How do I bill for repairs found during service?', answer: 'Add line items on-the-spot from your phone. Convert to an invoice and get paid before you leave.' },
      { question: 'Can customers see their pool history?', answer: 'Optional customer portal shows service history, chemical logs, and upcoming appointments.' }
    ]
  },
  'plumbing': {
    name: 'Plumbing',
    icon: '🔧',
    description: 'Handle emergency calls and scheduled repairs with confidence. Quote jobs on-site, track parts, and get paid faster.',
    features: ['Emergency dispatch', 'Parts inventory tracking', 'On-site quoting & invoicing', 'Permit tracking'],
    painPoints: ['Emergency calls disrupting scheduled work', 'Tracking parts used on each job', 'Creating accurate quotes on-site', 'Managing permit requirements'],
    testimonial: {
      quote: "Emergency dispatch changed everything. We went from chaos to routing the right tech to the right job instantly.",
      author: "Robert Kim",
      company: "Premier Plumbing Solutions",
      location: "San Jose, CA"
    },
    stats: [
      { value: '45%', label: 'Faster emergency response' },
      { value: '$200+', label: 'Avg ticket increase' },
      { value: '2x', label: 'Same-day payments' }
    ],
    faqs: [
      { question: 'How does emergency dispatch work?', answer: 'See all tech locations in real-time. Assign emergencies to the nearest available plumber with one tap.' },
      { question: 'Can I track parts inventory?', answer: 'Yes! Track van stock, get low inventory alerts, and see parts used per job for accurate billing.' },
      { question: 'Does it handle permits?', answer: 'Track permit status per job, set reminders for inspections, and store all documentation.' }
    ]
  },
  'electrical': {
    name: 'Electrical',
    icon: '⚡',
    description: 'Manage residential and commercial electrical jobs. Track permits, schedule inspections, and keep your team organized.',
    features: ['Permit management', 'Inspection scheduling', 'Load calculation tools', 'Code compliance checklists'],
    painPoints: ['Tracking permits across multiple jobs', 'Scheduling around inspection availability', 'Ensuring code compliance documentation', 'Managing licensed vs apprentice assignments'],
    testimonial: {
      quote: "Permit tracking alone pays for ToolTime Pro. We never miss an inspection date anymore.",
      author: "James Wilson",
      company: "Volt Electric",
      location: "Oakland, CA"
    },
    stats: [
      { value: '0', label: 'Missed inspections' },
      { value: '100%', label: 'Permit compliance' },
      { value: '35%', label: 'Admin time saved' }
    ],
    faqs: [
      { question: 'Can I track permits and inspections?', answer: 'Yes! Create permit records, set inspection dates, and get automatic reminders. Never miss a deadline.' },
      { question: 'How do I assign the right electrician?', answer: 'Tag team members by license level. ToolTime Pro ensures jobs requiring a master electrician get assigned correctly.' },
      { question: 'Does it work for commercial jobs?', answer: 'Absolutely. Handle multi-phase projects, progress billing, and complex scheduling with ease.' }
    ]
  },
  'hvac': {
    name: 'HVAC',
    icon: '❄️',
    description: 'From installations to maintenance contracts, manage your HVAC business efficiently with seasonal scheduling and equipment tracking.',
    features: ['Maintenance contract management', 'Equipment history tracking', 'Seasonal scheduling', 'Warranty tracking'],
    painPoints: ['Tracking maintenance agreements and renewals', 'Managing seasonal demand spikes', 'Keeping equipment history organized', 'Warranty claim documentation'],
    testimonial: {
      quote: "Maintenance contracts used to slip through the cracks. Now we have 95% renewal rate because ToolTime Pro reminds us and the customer.",
      author: "Michael Torres",
      company: "Cool Breeze HVAC",
      location: "Fresno, CA"
    },
    stats: [
      { value: '95%', label: 'Contract renewal rate' },
      { value: '60%', label: 'Faster dispatching' },
      { value: '$15K', label: 'Recovered in renewals' }
    ],
    faqs: [
      { question: 'Can I manage maintenance contracts?', answer: 'Yes! Track contract terms, schedule recurring maintenance, and get alerts before renewals are due.' },
      { question: 'How do I track equipment at each property?', answer: 'Create equipment profiles with model numbers, install dates, and full service history.' },
      { question: 'Does it handle seasonal scheduling?', answer: 'Easily manage peak seasons. See capacity at a glance and waitlist customers when booked solid.' }
    ]
  },
  'painting': {
    name: 'Painting',
    icon: '🎨',
    description: 'Quote painting jobs accurately with room-by-room estimates. Track paint inventory and manage crew schedules.',
    features: ['Square footage calculator', 'Paint inventory tracking', 'Color/finish documentation', 'Before/after photos'],
    painPoints: ['Estimating paint quantities accurately', 'Tracking which colors for each room', 'Managing multi-day projects', 'Showing quality work to prospects'],
    testimonial: {
      quote: "Before/after photos in our quotes have increased our close rate by 40%. Customers see the quality before they commit.",
      author: "Carlos Mendez",
      company: "Perfect Finish Painting",
      location: "San Francisco, CA"
    },
    stats: [
      { value: '40%', label: 'Higher close rate' },
      { value: '20%', label: 'Less paint waste' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I create room-by-room estimates?', answer: 'Yes! Break down quotes by room with specific colors, finishes, and prep work. Customers love the detail.' },
      { question: 'How do I track paint colors used?', answer: 'Document exact paint codes and finishes for each job. Great for touch-ups and referrals.' },
      { question: 'Can I show before/after photos in quotes?', answer: 'Absolutely. Embed your best work right in proposals to showcase your quality.' }
    ]
  },
  'cleaning': {
    name: 'House Cleaning',
    icon: '🧹',
    description: 'Manage recurring cleaning schedules, track supplies, and handle one-time deep cleans with ease.',
    features: ['Recurring schedule management', 'Supply tracking', 'Room checklist templates', 'Quality control reports'],
    painPoints: ['Managing recurring vs one-time bookings', 'Tracking keys and access codes', 'Ensuring consistent cleaning quality', 'Handling last-minute cancellations'],
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
      { question: 'Can I manage recurring cleaning schedules?', answer: 'Yes! Set up weekly, bi-weekly, or monthly cleanings with automatic scheduling and reminders.' },
      { question: 'How do I store access codes and keys?', answer: 'Secure notes attached to each customer profile. Only assigned cleaners see the access info.' },
      { question: 'Can cleaners check off tasks?', answer: 'Create room-by-room checklists. Cleaners mark items complete and take verification photos.' }
    ]
  },
  'roofing': {
    name: 'Roofing',
    icon: '🏠',
    description: 'Handle roof inspections, repairs, and full replacements. Document damage, create estimates, and manage multi-day projects.',
    features: ['Drone/photo documentation', 'Material calculators', 'Weather scheduling', 'Insurance claim support'],
    painPoints: ['Documenting damage for insurance claims', 'Accurate material estimation', 'Weather delays and rescheduling', 'Managing multi-day crew schedules'],
    testimonial: {
      quote: "Insurance adjusters love our documentation. Clean photos, measurements, and itemized estimates speed up approvals significantly.",
      author: "Kevin O'Brien",
      company: "Summit Roofing",
      location: "Riverside, CA"
    },
    stats: [
      { value: '50%', label: 'Faster approvals' },
      { value: '15%', label: 'Less material waste' },
      { value: '$50K', label: 'Avg job value' }
    ],
    faqs: [
      { question: 'Can I create insurance-ready estimates?', answer: 'Yes! Itemized estimates with photos and measurements that adjusters need for quick approvals.' },
      { question: 'How do I handle weather delays?', answer: 'Check weather forecasts in-app. Reschedule with one tap and notify customers automatically.' },
      { question: 'Does it calculate materials?', answer: 'Built-in calculators for shingles, underlayment, and more based on roof measurements.' }
    ]
  },
  'pest-control': {
    name: 'Pest Control',
    icon: '🐜',
    description: 'Schedule treatments, track recurring services, and maintain compliance documentation for your pest control business.',
    features: ['Treatment scheduling', 'Chemical usage tracking', 'Compliance documentation', 'Recurring service routes'],
    painPoints: ['Maintaining chemical usage records', 'Compliance with state regulations', 'Managing quarterly treatment schedules', 'Tracking pest activity by property'],
    testimonial: {
      quote: "Compliance documentation used to take hours. Now it's automatic and we're always audit-ready.",
      author: "Steven Park",
      company: "Guardian Pest Control",
      location: "Long Beach, CA"
    },
    stats: [
      { value: '100%', label: 'Audit compliance' },
      { value: '3hrs', label: 'Saved weekly on paperwork' },
      { value: '85%', label: 'Recurring customers' }
    ],
    faqs: [
      { question: 'Can I track chemical applications?', answer: 'Yes! Log products, quantities, and application areas for each treatment. Generate compliance reports instantly.' },
      { question: 'How do I manage quarterly services?', answer: 'Set up recurring treatments with automatic scheduling and customer notifications before each visit.' },
      { question: 'Does it track pest activity?', answer: 'Document findings at each visit. Historical data helps identify patterns and upsell prevention services.' }
    ]
  },
  'auto-detailing': {
    name: 'Auto Detailing',
    icon: '🚗',
    description: 'Manage mobile or shop-based detailing. Book appointments, track packages, and build repeat customers.',
    features: ['Package/tier pricing', 'Mobile scheduling', 'Before/after photos', 'Membership management'],
    painPoints: ['Managing different service packages', 'Scheduling mobile appointments efficiently', 'Building repeat customer base', 'Upselling additional services'],
    testimonial: {
      quote: "Membership management increased our recurring revenue by 60%. Customers love the convenience of auto-scheduled details.",
      author: "Andre Jackson",
      company: "Elite Auto Spa",
      location: "Beverly Hills, CA"
    },
    stats: [
      { value: '60%', label: 'More recurring revenue' },
      { value: '35%', label: 'Higher upsell rate' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I offer different service packages?', answer: 'Yes! Create bronze, silver, gold tiers or custom packages. Customers select online or you upsell on-site.' },
      { question: 'How do memberships work?', answer: 'Set up monthly or quarterly memberships with automatic billing and scheduled appointments.' },
      { question: 'Does it work for mobile detailing?', answer: 'Absolutely. Optimized scheduling for mobile routes with navigation and time tracking.' }
    ]
  },
  'pressure-washing': {
    name: 'Pressure Washing',
    icon: '💦',
    description: 'Quote by square footage, schedule seasonal work, and manage commercial contracts for your pressure washing business.',
    features: ['Square footage pricing', 'Seasonal marketing', 'Commercial contracts', 'Equipment maintenance logs'],
    painPoints: ['Accurate square footage estimates', 'Managing seasonal demand', 'Winning commercial contracts', 'Equipment maintenance tracking'],
    testimonial: {
      quote: "Commercial contracts are our bread and butter now. ToolTime Pro helped us look professional and win bigger accounts.",
      author: "Brian Foster",
      company: "PowerClean Pressure Washing",
      location: "San Diego, CA"
    },
    stats: [
      { value: '3x', label: 'Commercial accounts' },
      { value: '$500', label: 'Avg job increase' },
      { value: '40%', label: 'Seasonal repeat rate' }
    ],
    faqs: [
      { question: 'Can I quote by square footage?', answer: 'Yes! Measure and price by square foot for driveways, decks, siding, and commercial lots.' },
      { question: 'How do I manage commercial contracts?', answer: 'Set up recurring services with contract terms, automatic scheduling, and progress invoicing.' },
      { question: 'Does it track equipment maintenance?', answer: 'Log equipment hours, schedule maintenance, and track repairs to prevent breakdowns.' }
    ]
  },
  'flooring': {
    name: 'Flooring',
    icon: '🪵',
    description: 'Manage flooring installations and refinishing projects. Track materials, schedule installations, and handle multi-room jobs.',
    features: ['Material calculators', 'Room measurements', 'Subfloor inspection logs', 'Acclimation scheduling'],
    painPoints: ['Calculating material quantities with waste', 'Scheduling acclimation time', 'Managing multi-day installations', 'Tracking different materials per room'],
    testimonial: {
      quote: "Material calculators save us thousands in waste. We order exactly what we need plus the right overage percentage.",
      author: "Tom Anderson",
      company: "Precision Flooring",
      location: "Pasadena, CA"
    },
    stats: [
      { value: '15%', label: 'Less material waste' },
      { value: '0', label: 'Missed acclimations' },
      { value: '$2K', label: 'Saved per project' }
    ],
    faqs: [
      { question: 'Can I calculate flooring materials?', answer: 'Yes! Enter room dimensions and ToolTime Pro calculates materials with your preferred waste percentage.' },
      { question: 'How do I schedule acclimation time?', answer: 'Build in required acclimation days before installation. Customers and crew see the full timeline.' },
      { question: 'Does it handle multi-room projects?', answer: 'Break down projects by room with different materials, and schedule installations in the right sequence.' }
    ]
  },
  'handyman': {
    name: 'Handyman',
    icon: '🛠️',
    description: 'Handle the variety of a handyman business. Quote multiple tasks, track time, and manage your tool inventory.',
    features: ['Multi-task job tracking', 'Hourly + flat rate pricing', 'Tool inventory', 'Repeat customer discounts'],
    painPoints: ['Quoting jobs with many different tasks', 'Deciding hourly vs flat rate', 'Tracking tools across jobs', 'Building repeat customer loyalty'],
    testimonial: {
      quote: "I used to underquote jobs all the time. Now I track time and know exactly what to charge. My profit margin doubled.",
      author: "Rick Martinez",
      company: "Handy Rick Services",
      location: "Anaheim, CA"
    },
    stats: [
      { value: '2x', label: 'Profit margin' },
      { value: '50+', label: 'Repeat customers' },
      { value: '4.8', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I mix hourly and flat rate on one job?', answer: 'Yes! Quote some tasks flat rate and others by the hour, all on the same invoice.' },
      { question: 'How do I build repeat customers?', answer: 'Track customer history, set up loyalty discounts, and automated follow-ups bring them back.' },
      { question: 'Can I track my tools?', answer: 'Log tools by job to ensure nothing gets left behind. Get alerts when tools need maintenance.' }
    ]
  },
  'tree-service': {
    name: 'Tree Service',
    icon: '🌲',
    description: 'Manage tree trimming, removal, and emergency storm work. Create accurate quotes and track crew equipment.',
    features: ['Hazard assessments', 'Permit tracking', 'Equipment checklists', 'Emergency dispatch'],
    painPoints: ['Assessing job hazards accurately', 'Tracking permits for removals', 'Managing expensive equipment', 'Responding to storm emergencies'],
    testimonial: {
      quote: "Storm season used to be chaos. Now we dispatch crews in minutes and customers get real-time updates.",
      author: "Jake Morrison",
      company: "Treeline Arbor Care",
      location: "Santa Rosa, CA"
    },
    stats: [
      { value: '70%', label: 'Faster storm response' },
      { value: '$10K', label: 'Avg removal job' },
      { value: '100%', label: 'Safety compliance' }
    ],
    faqs: [
      { question: 'Can I document hazards?', answer: 'Yes! Photo documentation and checklists for power lines, structures, and other hazards.' },
      { question: 'How do I handle storm emergencies?', answer: 'Priority dispatch system routes emergency calls to available crews with one tap.' },
      { question: 'Does it track permits?', answer: 'Track permit status for tree removals, set reminders, and store approval documents.' }
    ]
  },
  'moving': {
    name: 'Moving',
    icon: '📦',
    description: 'Coordinate moves of any size. Track inventory, manage crews, and handle packing supplies and truck scheduling.',
    features: ['Inventory tracking', 'Truck scheduling', 'Crew assignment', 'Packing supply management'],
    painPoints: ['Estimating move duration accurately', 'Scheduling trucks and crews', 'Tracking inventory during moves', 'Managing packing supplies'],
    testimonial: {
      quote: "Inventory tracking eliminated damage claims. Everything is documented with photos before and after.",
      author: "Daniel Lee",
      company: "Swift Moving Co",
      location: "San Jose, CA"
    },
    stats: [
      { value: '90%', label: 'Fewer damage claims' },
      { value: '25%', label: 'Faster estimates' },
      { value: '5-star', label: 'Average review' }
    ],
    faqs: [
      { question: 'Can I create inventory lists?', answer: 'Yes! Room-by-room inventory with photos and condition notes. Customers sign off digitally.' },
      { question: 'How do I schedule trucks?', answer: 'See truck availability at a glance. Assign trucks to moves and avoid double-booking.' },
      { question: 'Does it track packing supplies?', answer: 'Track boxes, tape, and materials used per move for accurate billing.' }
    ]
  },
  'junk-removal': {
    name: 'Junk Removal',
    icon: '🗑️',
    description: 'Quote junk removal jobs, track truck loads, and manage disposal/donation routing for your hauling business.',
    features: ['Load-based pricing', 'Disposal tracking', 'Donation receipts', 'Route optimization'],
    painPoints: ['Estimating load sizes from photos', 'Tracking disposal vs donation', 'Optimizing dump runs', 'Generating donation receipts'],
    testimonial: {
      quote: "Photo estimates save us from lowball quotes. Customers send pics, we quote accurately, no surprises on-site.",
      author: "Chris Williams",
      company: "Haul It Away",
      location: "Oakland, CA"
    },
    stats: [
      { value: '40%', label: 'More accurate quotes' },
      { value: '3+', label: 'Loads per day' },
      { value: '$300', label: 'Avg job revenue' }
    ],
    faqs: [
      { question: 'Can I quote from photos?', answer: 'Yes! Customers text photos, you estimate load size and quote without a site visit.' },
      { question: 'How do I track donations?', answer: 'Log donated items and generate receipts for customers who want tax documentation.' },
      { question: 'Does it optimize dump runs?', answer: 'Route multiple pickups efficiently and plan disposal stops to minimize drive time.' }
    ]
  },
  'appliance-repair': {
    name: 'Appliance Repair',
    icon: '🔌',
    description: 'Diagnose and repair appliances efficiently. Track parts, manage warranties, and schedule follow-up visits.',
    features: ['Diagnostic checklists', 'Parts ordering', 'Warranty tracking', 'Appliance history logs'],
    painPoints: ['Diagnosing issues quickly', 'Tracking parts for each repair', 'Managing warranty claims', 'Scheduling follow-up visits'],
    testimonial: {
      quote: "Diagnostic checklists make our techs more efficient. Even newer techs troubleshoot like pros.",
      author: "Paul Nguyen",
      company: "Fix-It Appliance Repair",
      location: "Burbank, CA"
    },
    stats: [
      { value: '30%', label: 'Faster diagnosis' },
      { value: '95%', label: 'First-visit fix rate' },
      { value: '$150', label: 'Avg service call' }
    ],
    faqs: [
      { question: 'Can I create diagnostic checklists?', answer: 'Yes! Build checklists by appliance type. Techs work through steps and document findings.' },
      { question: 'How do I track warranties?', answer: 'Log warranty status per appliance. Know instantly if repairs are covered.' },
      { question: 'Does it help with parts ordering?', answer: 'Track common parts inventory and create purchase orders when stock runs low.' }
    ]
  },
  'garage-door': {
    name: 'Garage Door',
    icon: '🚪',
    description: 'Handle garage door repairs and installations. Track springs, openers, and manage emergency service calls.',
    features: ['Parts inventory', 'Emergency dispatch', 'Opener programming logs', 'Safety inspection checklists'],
    painPoints: ['Managing emergency calls', 'Tracking spring sizes and parts', 'Programming different opener brands', 'Safety compliance documentation'],
    testimonial: {
      quote: "Emergency dispatch is a game-changer. Homeowners locked out get help in under an hour.",
      author: "Mike Sullivan",
      company: "Precision Garage Doors",
      location: "Stockton, CA"
    },
    stats: [
      { value: '<1hr', label: 'Emergency response' },
      { value: '40%', label: 'More emergency calls' },
      { value: '$400', label: 'Avg ticket' }
    ],
    faqs: [
      { question: 'Can I dispatch emergency calls quickly?', answer: 'Yes! See tech locations and availability. Dispatch the nearest available tech instantly.' },
      { question: 'How do I track parts inventory?', answer: 'Log springs, rollers, and openers by van. Know what\'s in stock without calling techs.' },
      { question: 'Does it handle safety inspections?', answer: 'Built-in checklists ensure techs complete required safety checks on every job.' }
    ]
  },
  'window-cleaning': {
    name: 'Window Cleaning',
    icon: '🪟',
    description: 'Manage residential and commercial window cleaning routes. Track recurring schedules and handle high-rise equipment.',
    features: ['Per-pane pricing', 'Route management', 'Commercial contracts', 'Safety equipment logs'],
    painPoints: ['Counting windows for accurate quotes', 'Managing recurring schedules', 'Winning commercial contracts', 'Tracking safety equipment certifications'],
    testimonial: {
      quote: "Commercial contracts tripled our revenue. ToolTime Pro helps us look professional and deliver consistently.",
      author: "Eric Chen",
      company: "Crystal View Window Cleaning",
      location: "San Francisco, CA"
    },
    stats: [
      { value: '3x', label: 'Revenue growth' },
      { value: '50+', label: 'Commercial accounts' },
      { value: '100%', label: 'Safety compliance' }
    ],
    faqs: [
      { question: 'Can I quote by window count?', answer: 'Yes! Count panes during estimates and price accordingly. Save counts for recurring quotes.' },
      { question: 'How do I manage recurring customers?', answer: 'Set up monthly, quarterly, or seasonal schedules with automatic reminders.' },
      { question: 'Does it track safety certifications?', answer: 'Log equipment inspections and certifications. Get alerts before they expire.' }
    ]
  },
  // Additional industries with rich content
  'irrigation': {
    name: 'Irrigation & Sprinkler',
    icon: '💧',
    description: 'Install and maintain irrigation systems. Schedule seasonal startups/shutdowns and manage water-saving upgrades.',
    features: ['Zone mapping', 'Seasonal scheduling', 'Water usage tracking', 'Controller programming logs'],
    painPoints: ['Managing seasonal startups and winterization', 'Tracking zone configurations', 'Documenting controller settings', 'Scheduling repair follow-ups'],
    testimonial: {
      quote: "Zone mapping saves us hours. New techs can service any system because all the info is right in the app.",
      author: "Jason Reyes",
      company: "AquaSmart Irrigation",
      location: "Bakersfield, CA"
    },
    stats: [
      { value: '500+', label: 'Systems managed' },
      { value: '30%', label: 'Faster service calls' },
      { value: '98%', label: 'Customer retention' }
    ],
    faqs: [
      { question: 'Can I map irrigation zones?', answer: 'Yes! Document zone layouts, head types, and controller settings for each property.' },
      { question: 'How do I schedule seasonal services?', answer: 'Bulk schedule spring startups and fall winterizations. Customers get automatic reminders.' },
      { question: 'Does it track water usage?', answer: 'Log meter readings and help customers optimize their water usage.' }
    ]
  },
  'fencing': {
    name: 'Fencing',
    icon: '🏗️',
    description: 'Quote and install fencing projects. Calculate materials, track permits, and manage multi-day installations.',
    features: ['Linear foot calculator', 'Material estimates', 'Permit tracking', 'Gate hardware logs'],
    painPoints: ['Calculating materials accurately', 'Managing permit requirements', 'Scheduling around weather', 'Tracking different fence styles'],
    testimonial: {
      quote: "Material calculators eliminated over-ordering. We save thousands per month on unused materials.",
      author: "Ryan Cooper",
      company: "Boundary Fence Co",
      location: "Modesto, CA"
    },
    stats: [
      { value: '20%', label: 'Material savings' },
      { value: '100%', label: 'Permit compliance' },
      { value: '$5K', label: 'Avg project value' }
    ],
    faqs: [
      { question: 'Can I calculate fencing materials?', answer: 'Yes! Enter linear feet and ToolTime Pro calculates posts, panels, concrete, and hardware.' },
      { question: 'How do I track permits?', answer: 'Create permit records per project, track approval status, and schedule inspections.' },
      { question: 'Does it handle different fence types?', answer: 'Set up material presets for wood, vinyl, chain link, and more.' }
    ]
  },
  'snow-removal': {
    name: 'Snow Removal',
    icon: '❄️',
    description: 'Manage snow removal routes and contracts. Track salt usage, schedule crews, and handle emergency callouts.',
    features: ['Weather monitoring', 'Route management', 'Salt/material tracking', 'Contract billing'],
    painPoints: ['Predicting storm response needs', 'Managing contracts vs per-push billing', 'Tracking salt and materials', 'Dispatching during storms'],
    testimonial: {
      quote: "Storm dispatch used to be 3am phone calls. Now crews check the app and know exactly where to go.",
      author: "Pete Johnson",
      company: "Northern Plow Services",
      location: "Lake Tahoe, CA"
    },
    stats: [
      { value: '50%', label: 'Faster dispatch' },
      { value: '100+', label: 'Contracts managed' },
      { value: '24/7', label: 'Storm coverage' }
    ],
    faqs: [
      { question: 'Can I manage seasonal contracts?', answer: 'Yes! Set up unlimited-push or per-event contracts with automatic billing.' },
      { question: 'How do I dispatch during storms?', answer: 'Push notifications alert crews. They check routes in the app and mark lots complete.' },
      { question: 'Does it track salt usage?', answer: 'Log materials per property for accurate billing and inventory management.' }
    ]
  },
  'commercial-cleaning': {
    name: 'Commercial Cleaning',
    icon: '🏢',
    description: 'Manage commercial janitorial contracts. Schedule crews, track supplies, and handle quality inspections.',
    features: ['Contract management', 'Crew scheduling', 'Supply tracking', 'Inspection reports'],
    painPoints: ['Managing multiple building contracts', 'Scheduling overnight crews', 'Quality control across locations', 'Supply ordering and tracking'],
    testimonial: {
      quote: "We manage 30 buildings now with the same office staff. ToolTime Pro scales with us.",
      author: "Sandra Lopez",
      company: "CleanPro Commercial",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '30', label: 'Buildings managed' },
      { value: '95%', label: 'Inspection pass rate' },
      { value: '3x', label: 'Revenue growth' }
    ],
    faqs: [
      { question: 'Can I manage multiple contracts?', answer: 'Yes! Each building has its own schedule, crew assignments, and billing terms.' },
      { question: 'How do I ensure quality?', answer: 'Inspection checklists and photo verification. Supervisors review remotely.' },
      { question: 'Does it handle overnight schedules?', answer: 'Full support for overnight shifts with shift handoffs and time tracking.' }
    ]
  },
  'carpet-cleaning': {
    name: 'Carpet Cleaning',
    icon: '🧽',
    description: 'Book and manage carpet cleaning jobs. Track room counts, upsell treatments, and build recurring customers.',
    features: ['Room-based pricing', 'Treatment upsells', 'Recurring scheduling', 'Before/after photos'],
    painPoints: ['Accurate room count estimates', 'Upselling stain treatments', 'Building recurring business', 'Equipment maintenance'],
    testimonial: {
      quote: "Upsell prompts increased our average ticket by $75. Techs offer treatments they used to forget.",
      author: "Greg Patterson",
      company: "Fresh Start Carpet Care",
      location: "Glendale, CA"
    },
    stats: [
      { value: '+$75', label: 'Avg ticket increase' },
      { value: '60%', label: 'Upsell rate' },
      { value: '40%', label: 'Recurring customers' }
    ],
    faqs: [
      { question: 'Can I price by room?', answer: 'Yes! Set per-room pricing with options for hallways, stairs, and large rooms.' },
      { question: 'How do upsells work?', answer: 'Prompts remind techs to offer stain protection, pet treatment, and deodorizing.' },
      { question: 'Does it track equipment?', answer: 'Log equipment usage and schedule maintenance to prevent breakdowns.' }
    ]
  },
  'gutter-cleaning': {
    name: 'Gutter Cleaning',
    icon: '🍂',
    description: 'Schedule gutter cleaning routes. Track recurring customers and upsell gutter guards and repairs.',
    features: ['Linear foot pricing', 'Seasonal scheduling', 'Guard installation tracking', 'Before/after photos'],
    painPoints: ['Seasonal scheduling management', 'Upselling gutter guards', 'Tracking property details', 'Building recurring routes'],
    testimonial: {
      quote: "Seasonal reminders bring customers back every fall. 80% of our business is now recurring.",
      author: "Doug Miller",
      company: "LeafFree Gutters",
      location: "Sacramento, CA"
    },
    stats: [
      { value: '80%', label: 'Recurring revenue' },
      { value: '200+', label: 'Seasonal customers' },
      { value: '$45', label: 'Saved per job on admin' }
    ],
    faqs: [
      { question: 'Can I schedule seasonal cleanings?', answer: 'Yes! Set up spring and fall schedules with automatic customer reminders.' },
      { question: 'How do I upsell gutter guards?', answer: 'Flag properties that need guards. Prompts remind techs to offer during service.' },
      { question: 'Does it track property details?', answer: 'Log linear feet, stories, and access notes for each property.' }
    ]
  },
  'chimney-sweep': {
    name: 'Chimney Sweep',
    icon: '🔥',
    description: 'Schedule chimney cleanings and inspections. Document conditions, track certifications, and manage seasonal demand.',
    features: ['Inspection reports', 'Certification tracking', 'Seasonal scheduling', 'Photo documentation'],
    painPoints: ['Managing inspection documentation', 'Tracking certifications', 'Seasonal demand spikes', 'Upselling repairs'],
    testimonial: {
      quote: "Digital inspection reports impress customers and protect us legally. Everything is documented.",
      author: "Thomas Walsh",
      company: "Heritage Chimney Services",
      location: "Monterey, CA"
    },
    stats: [
      { value: '100%', label: 'Digital documentation' },
      { value: '35%', label: 'Repair upsells' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I create inspection reports?', answer: 'Yes! Document chimney condition with photos and generate professional PDF reports.' },
      { question: 'How do I track certifications?', answer: 'Log CSIA and other certifications with expiration alerts.' },
      { question: 'Does it handle seasonal scheduling?', answer: 'Manage fall rush with waitlists and capacity planning.' }
    ]
  },
  'janitorial': {
    name: 'Janitorial',
    icon: '🧼',
    description: 'Manage janitorial crews and contracts. Schedule daily, weekly, and monthly services with quality tracking.',
    features: ['Shift scheduling', 'Supply management', 'Quality checklists', 'Contract billing'],
    painPoints: ['Managing multiple shifts', 'Tracking supplies across locations', 'Quality consistency', 'Contract renewals'],
    testimonial: {
      quote: "Quality checklists ensure every location meets our standards. Customer complaints dropped 90%.",
      author: "Angela Davis",
      company: "Premier Janitorial",
      location: "San Bernardino, CA"
    },
    stats: [
      { value: '90%', label: 'Fewer complaints' },
      { value: '50+', label: 'Locations served' },
      { value: '98%', label: 'Contract retention' }
    ],
    faqs: [
      { question: 'Can I manage multiple shifts?', answer: 'Yes! Day, evening, and overnight shifts with different crew assignments.' },
      { question: 'How do I track supplies?', answer: 'Inventory management per location with automatic reorder alerts.' },
      { question: 'Does it support quality inspections?', answer: 'Supervisors complete inspections in-app with photos and issue tracking.' }
    ]
  },
  'locksmith': {
    name: 'Locksmith',
    icon: '🔐',
    description: 'Handle emergency lockouts and scheduled services. Track key codes, manage inventory, and dispatch quickly.',
    features: ['Emergency dispatch', 'Key code database', 'Inventory tracking', 'Mobile payments'],
    painPoints: ['Fast emergency response', 'Tracking key codes securely', 'Managing lock inventory', 'Collecting payment on-site'],
    testimonial: {
      quote: "GPS dispatch gets us to lockouts in under 20 minutes. Our response time is our competitive advantage.",
      author: "Victor Santos",
      company: "QuickKey Locksmith",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '<20min', label: 'Avg response time' },
      { value: '24/7', label: 'Emergency service' },
      { value: '$200', label: 'Avg ticket' }
    ],
    faqs: [
      { question: 'How fast can I dispatch?', answer: 'See all tech locations. Dispatch the closest available tech with one tap.' },
      { question: 'Can I store key codes securely?', answer: 'Yes! Encrypted key code storage accessible only to authorized techs.' },
      { question: 'Does it handle mobile payments?', answer: 'Accept cards on-site and email receipts instantly.' }
    ]
  },
  'glass-mirror': {
    name: 'Glass & Mirror',
    icon: '🪞',
    description: 'Quote and install glass and mirrors. Track custom orders, manage installations, and handle emergency repairs.',
    features: ['Custom order tracking', 'Measurement logs', 'Install scheduling', 'Breakage documentation'],
    painPoints: ['Tracking custom orders', 'Accurate measurements', 'Scheduling installations', 'Emergency board-ups'],
    testimonial: {
      quote: "Custom order tracking eliminated mistakes. Every piece arrives exactly as specified.",
      author: "Mark Stevens",
      company: "Clearview Glass",
      location: "Newport Beach, CA"
    },
    stats: [
      { value: '99%', label: 'Order accuracy' },
      { value: '0', label: 'Measurement errors' },
      { value: '2hr', label: 'Emergency response' }
    ],
    faqs: [
      { question: 'Can I track custom orders?', answer: 'Yes! Track orders from measurement to delivery with status updates.' },
      { question: 'How do I store measurements?', answer: 'Detailed measurement forms with diagrams ensure accuracy.' },
      { question: 'Does it handle emergencies?', answer: 'Emergency dispatch for board-ups and urgent repairs.' }
    ]
  },
  'furniture-assembly': {
    name: 'Furniture Assembly',
    icon: '🪑',
    description: 'Book and manage furniture assembly jobs. Track time, handle multiple items, and build IKEA expertise.',
    features: ['Per-item pricing', 'Time tracking', 'Brand expertise tags', 'Customer scheduling'],
    painPoints: ['Estimating assembly time', 'Pricing multiple items', 'Tracking brand experience', 'Same-day booking'],
    testimonial: {
      quote: "Time tracking showed us exactly how long each piece takes. Our quotes are spot-on now.",
      author: "Chris Taylor",
      company: "Assembly Experts",
      location: "San Diego, CA"
    },
    stats: [
      { value: '95%', label: 'Quote accuracy' },
      { value: '500+', label: 'Items assembled monthly' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I price per item?', answer: 'Yes! Set prices by furniture type and complexity level.' },
      { question: 'How do I track time?', answer: 'In-app timer logs actual assembly time for better future estimates.' },
      { question: 'Does it handle same-day bookings?', answer: 'Customers book online and you confirm availability in real-time.' }
    ]
  },
  'tv-mounting': {
    name: 'TV Mounting',
    icon: '📺',
    description: 'Schedule TV mounting and home theater installs. Track equipment, manage add-ons, and document work.',
    features: ['Service packages', 'Equipment tracking', 'Cable management options', 'Photo documentation'],
    painPoints: ['Upselling cable management', 'Tracking mount inventory', 'Scheduling efficiently', 'Documenting installs'],
    testimonial: {
      quote: "Add-on prompts doubled our average ticket. Customers almost always say yes to cable concealment.",
      author: "Derek Kim",
      company: "Perfect Mount TV",
      location: "Irvine, CA"
    },
    stats: [
      { value: '2x', label: 'Avg ticket increase' },
      { value: '85%', label: 'Add-on acceptance' },
      { value: '30min', label: 'Avg install time' }
    ],
    faqs: [
      { question: 'Can I offer service packages?', answer: 'Yes! Create basic mount, premium with cable concealment, and full theater packages.' },
      { question: 'How do I track mounts?', answer: 'Inventory management for different mount types and sizes.' },
      { question: 'Does it document installs?', answer: 'Before/after photos and signed completion certificates.' }
    ]
  },
  'solar': {
    name: 'Solar Installation',
    icon: '☀️',
    description: 'Manage solar installations from proposal to commissioning. Track permits, schedule inspections, and monitor projects.',
    features: ['Proposal generation', 'Permit tracking', 'Inspection scheduling', 'Project milestones'],
    painPoints: ['Complex project timelines', 'Multiple permit requirements', 'Inspection coordination', 'Customer communication'],
    testimonial: {
      quote: "Project tracking keeps everyone aligned. Customers always know exactly where their install stands.",
      author: "John Rivera",
      company: "SunPower Installations",
      location: "Palm Springs, CA"
    },
    stats: [
      { value: '30%', label: 'Faster installs' },
      { value: '100%', label: 'Permit compliance' },
      { value: '$25K', label: 'Avg project value' }
    ],
    faqs: [
      { question: 'Can I track project milestones?', answer: 'Yes! From site survey to commissioning, track every phase with status updates.' },
      { question: 'How do I manage permits?', answer: 'Track multiple permits per project with submission dates and approval status.' },
      { question: 'Does it schedule inspections?', answer: 'Coordinate utility and building inspections with calendar integration.' }
    ]
  },
  'home-inspection': {
    name: 'Home Inspection',
    icon: '🔍',
    description: 'Schedule inspections and generate professional reports. Track findings, manage photos, and deliver reports fast.',
    features: ['Report generation', 'Photo documentation', 'Defect tracking', 'Agent coordination'],
    painPoints: ['Fast report turnaround', 'Organizing photos', 'Coordinating with agents', 'Managing busy seasons'],
    testimonial: {
      quote: "Same-day reports won us more agent referrals than anything else. ToolTime Pro makes it possible.",
      author: "Robert Chen",
      company: "Thorough Home Inspections",
      location: "Palo Alto, CA"
    },
    stats: [
      { value: 'Same day', label: 'Report delivery' },
      { value: '100+', label: 'Agent referrals' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I generate reports in the field?', answer: 'Yes! Complete reports on-site and deliver before you leave.' },
      { question: 'How do I organize photos?', answer: 'Photos auto-attach to inspection sections. Annotation tools highlight issues.' },
      { question: 'Does it coordinate with agents?', answer: 'Agents book online and receive reports automatically.' }
    ]
  },
  'septic': {
    name: 'Septic Service',
    icon: '🚽',
    description: 'Manage septic pumping routes and inspections. Track tank sizes, schedule recurring services, and maintain compliance.',
    features: ['Tank records', 'Pumping schedules', 'Compliance documentation', 'Route optimization'],
    painPoints: ['Tracking tank sizes and locations', 'Scheduling recurring pumpings', 'Compliance paperwork', 'Route efficiency'],
    testimonial: {
      quote: "Tank records save us 30 minutes per call. We know exactly what equipment to bring.",
      author: "Bill Murphy",
      company: "Valley Septic Services",
      location: "Central Valley, CA"
    },
    stats: [
      { value: '30min', label: 'Saved per call' },
      { value: '100%', label: 'Compliance rate' },
      { value: '500+', label: 'Tanks managed' }
    ],
    faqs: [
      { question: 'Can I track tank information?', answer: 'Yes! Size, location, access notes, and full pumping history per property.' },
      { question: 'How do I schedule recurring pumpings?', answer: 'Set 3-5 year schedules with automatic customer reminders.' },
      { question: 'Does it handle compliance docs?', answer: 'Generate required documentation and maintain records for inspections.' }
    ]
  },
  'security-systems': {
    name: 'Security Systems',
    icon: '🔒',
    description: 'Install and monitor security systems. Track equipment, manage recurring monitoring, and handle service calls.',
    features: ['Equipment tracking', 'Monitoring contracts', 'Service scheduling', 'System documentation'],
    painPoints: ['Managing monitoring contracts', 'Tracking installed equipment', 'Service call scheduling', 'System documentation'],
    testimonial: {
      quote: "Contract management finally makes sense. We know exactly when renewals are due.",
      author: "Anthony Brown",
      company: "SecureHome Systems",
      location: "Orange County, CA"
    },
    stats: [
      { value: '92%', label: 'Contract renewal' },
      { value: '1000+', label: 'Systems monitored' },
      { value: '4hr', label: 'Service response' }
    ],
    faqs: [
      { question: 'Can I manage monitoring contracts?', answer: 'Yes! Track contract terms, billing, and automatic renewal reminders.' },
      { question: 'How do I track equipment?', answer: 'Log all installed devices with serial numbers and warranty info.' },
      { question: 'Does it handle service calls?', answer: 'Schedule and dispatch service techs with full system history.' }
    ]
  },
  'home-theater': {
    name: 'Home Theater',
    icon: '🎬',
    description: 'Design and install home theater systems. Manage equipment, track projects, and deliver premium experiences.',
    features: ['System design tools', 'Equipment tracking', 'Project management', 'Calibration logs'],
    painPoints: ['Complex system designs', 'Equipment coordination', 'Multi-day installs', 'Calibration documentation'],
    testimonial: {
      quote: "Project management keeps complex installs on track. Customers love the attention to detail.",
      author: "Steven Park",
      company: "Elite Home Theater",
      location: "Beverly Hills, CA"
    },
    stats: [
      { value: '$15K', label: 'Avg project value' },
      { value: '100%', label: 'Customer satisfaction' },
      { value: '5-star', label: 'Every review' }
    ],
    faqs: [
      { question: 'Can I manage complex projects?', answer: 'Yes! Multi-phase project tracking with equipment lists and timelines.' },
      { question: 'How do I track equipment?', answer: 'Log all components, serial numbers, and configuration settings.' },
      { question: 'Does it document calibration?', answer: 'Store calibration settings and test results for each system.' }
    ]
  },
  'smart-home': {
    name: 'Smart Home',
    icon: '🏠',
    description: 'Install and configure smart home systems. Track devices, manage integrations, and provide ongoing support.',
    features: ['Device inventory', 'Integration tracking', 'Support tickets', 'Remote diagnostics'],
    painPoints: ['Managing device ecosystems', 'Integration troubleshooting', 'Customer support', 'Staying current with technology'],
    testimonial: {
      quote: "Device tracking saves hours on support calls. We see exactly what's installed before arriving.",
      author: "Michael Lee",
      company: "SmartLiving Installations",
      location: "San Jose, CA"
    },
    stats: [
      { value: '50%', label: 'Faster support' },
      { value: '500+', label: 'Homes connected' },
      { value: '4.8', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I track installed devices?', answer: 'Yes! Complete inventory of smart devices, hubs, and integrations per home.' },
      { question: 'How do I handle support?', answer: 'Ticket system with device history helps resolve issues quickly.' },
      { question: 'Does it track integrations?', answer: 'Document which devices work together and configuration settings.' }
    ]
  },
  'mobile-car-wash': {
    name: 'Mobile Car Wash',
    icon: '🚙',
    description: 'Run your mobile car wash efficiently. Schedule appointments, manage routes, and build loyal customers.',
    features: ['Mobile scheduling', 'Route optimization', 'Package pricing', 'Water usage tracking'],
    painPoints: ['Route efficiency', 'Water supply management', 'Building recurring customers', 'Weather rescheduling'],
    testimonial: {
      quote: "Route optimization cut our drive time by 40%. That's 8+ extra cars per day.",
      author: "Luis Garcia",
      company: "SparkleWash Mobile",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '40%', label: 'Less drive time' },
      { value: '8+', label: 'Extra cars daily' },
      { value: '70%', label: 'Recurring customers' }
    ],
    faqs: [
      { question: 'Can I optimize my route?', answer: 'Yes! ToolTime Pro sequences appointments to minimize driving between stops.' },
      { question: 'How do I handle weather?', answer: 'One-tap reschedule moves all affected appointments with customer notification.' },
      { question: 'Does it track water usage?', answer: 'Log water used per wash to manage tank refills and costs.' }
    ]
  },
  'towing': {
    name: 'Towing',
    icon: '🚛',
    description: 'Dispatch tow trucks fast. Track fleet locations, manage roadside calls, and coordinate with shops and lots.',
    features: ['GPS dispatch', 'Fleet tracking', 'Lot management', 'Roadside assistance'],
    painPoints: ['Fast dispatch response', 'Fleet coordination', 'Storage lot tracking', 'After-hours calls'],
    testimonial: {
      quote: "GPS dispatch gets trucks on scene faster than anyone in town. Speed wins in this business.",
      author: "Frank Torres",
      company: "Rapid Tow Services",
      location: "San Diego, CA"
    },
    stats: [
      { value: '<15min', label: 'Avg response' },
      { value: '24/7', label: 'Dispatch coverage' },
      { value: '12', label: 'Trucks managed' }
    ],
    faqs: [
      { question: 'How fast can I dispatch?', answer: 'See all truck locations. Dispatch the nearest available truck instantly.' },
      { question: 'Can I track my fleet?', answer: 'Real-time GPS shows all trucks with status (available, en route, on scene).' },
      { question: 'Does it manage storage lots?', answer: 'Track vehicles in storage with photos, fees, and release documentation.' }
    ]
  },
  'mobile-mechanic': {
    name: 'Mobile Mechanic',
    icon: '🔧',
    description: 'Bring the shop to your customers. Schedule mobile repairs, track parts, and manage diagnostics on the go.',
    features: ['Mobile scheduling', 'Parts tracking', 'Diagnostic logs', 'Estimate generation'],
    painPoints: ['Parts availability', 'Accurate mobile estimates', 'Tool inventory', 'Customer no-shows'],
    testimonial: {
      quote: "Estimates in the field used to take forever. Now I quote accurately in minutes.",
      author: "Ray Mitchell",
      company: "RoadFix Mobile Mechanics",
      location: "Sacramento, CA"
    },
    stats: [
      { value: '75%', label: 'First-visit fixes' },
      { value: '$150', label: 'Avg service call' },
      { value: '4.8', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I create estimates on-site?', answer: 'Yes! Build estimates with parts and labor, get approval, and start work immediately.' },
      { question: 'How do I track parts?', answer: 'Manage van inventory with reorder alerts when stock runs low.' },
      { question: 'Does it handle diagnostics?', answer: 'Log diagnostic codes and test results with the vehicle history.' }
    ]
  },
  'delivery': {
    name: 'Delivery Service',
    icon: '🚚',
    description: 'Manage deliveries of any size. Optimize routes, track packages, and keep customers informed.',
    features: ['Route optimization', 'Package tracking', 'Proof of delivery', 'Customer notifications'],
    painPoints: ['Route efficiency', 'Tracking multiple packages', 'Proof of delivery', 'Customer communication'],
    testimonial: {
      quote: "Real-time tracking reduced 'where's my package' calls by 80%. Customers see exactly where we are.",
      author: "Maria Gonzalez",
      company: "QuickShip Delivery",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '80%', label: 'Fewer status calls' },
      { value: '50+', label: 'Deliveries daily' },
      { value: '99%', label: 'On-time rate' }
    ],
    faqs: [
      { question: 'Can I optimize routes?', answer: 'Yes! ToolTime Pro sequences stops for minimum drive time.' },
      { question: 'How do I prove delivery?', answer: 'Photo and signature capture with GPS timestamp.' },
      { question: 'Does it notify customers?', answer: 'Automatic updates when driver is en route and upon delivery.' }
    ]
  },
  'storage': {
    name: 'Storage',
    icon: '📦',
    description: 'Manage storage facilities and moving storage. Track units, handle rentals, and coordinate pickups.',
    features: ['Unit management', 'Rental tracking', 'Access scheduling', 'Billing automation'],
    painPoints: ['Unit availability tracking', 'Rental payment collection', 'Access coordination', 'Late payment management'],
    testimonial: {
      quote: "Automated billing eliminated late payments. Customers get reminders and we get paid on time.",
      author: "Jennifer Wu",
      company: "SecureStore Solutions",
      location: "Bay Area, CA"
    },
    stats: [
      { value: '95%', label: 'On-time payments' },
      { value: '200+', label: 'Units managed' },
      { value: '98%', label: 'Occupancy rate' }
    ],
    faqs: [
      { question: 'Can I track unit availability?', answer: 'Yes! See all units with status, size, and rental history.' },
      { question: 'How do I handle billing?', answer: 'Automatic recurring billing with late payment reminders.' },
      { question: 'Does it manage access?', answer: 'Schedule access times and track entry/exit.' }
    ]
  },
  'pet-sitting': {
    name: 'Pet Sitting',
    icon: '🐕',
    description: 'Manage pet sitting visits and overnight stays. Track pet details, send updates, and build trusted relationships.',
    features: ['Pet profiles', 'Visit scheduling', 'Photo updates', 'Key management'],
    painPoints: ['Remembering pet details', 'Sending updates to owners', 'Key and access management', 'Scheduling around walks'],
    testimonial: {
      quote: "Photo updates make pet parents so happy. They feel connected even when traveling.",
      author: "Emily Chen",
      company: "Happy Paws Pet Care",
      location: "Palo Alto, CA"
    },
    stats: [
      { value: '100%', label: 'Photo updates sent' },
      { value: '500+', label: 'Pets cared for' },
      { value: '5-star', label: 'Every review' }
    ],
    faqs: [
      { question: 'Can I track pet details?', answer: 'Yes! Medications, feeding schedules, vet info, and personality notes.' },
      { question: 'How do I send updates?', answer: 'Snap photos during visits and send directly to pet parents.' },
      { question: 'Does it manage keys?', answer: 'Secure key tracking with lockbox codes and access notes.' }
    ]
  },
  'dog-walking': {
    name: 'Dog Walking',
    icon: '🦮',
    description: 'Build and manage dog walking routes. Track walks with GPS, send updates, and grow your pack.',
    features: ['Route building', 'GPS walk tracking', 'Photo updates', 'Pack management'],
    painPoints: ['Building efficient routes', 'Proving walk completion', 'Managing group walks', 'Growing the business'],
    testimonial: {
      quote: "GPS tracking proves every walk. Clients trust us completely and referrals pour in.",
      author: "Jake Thompson",
      company: "Urban Paws Dog Walking",
      location: "San Francisco, CA"
    },
    stats: [
      { value: '100%', label: 'Walks GPS verified' },
      { value: '40+', label: 'Dogs walked daily' },
      { value: '90%', label: 'Referral rate' }
    ],
    faqs: [
      { question: 'Can I track walks with GPS?', answer: 'Yes! Start-to-finish GPS tracking shows the exact route walked.' },
      { question: 'How do I manage group walks?', answer: 'Build compatible packs and schedule group walks efficiently.' },
      { question: 'Does it send updates?', answer: 'Automatic updates with photos when walks begin and end.' }
    ]
  },
  'pet-grooming': {
    name: 'Pet Grooming',
    icon: '🐩',
    description: 'Schedule grooming appointments. Track pet preferences, manage add-ons, and keep pets looking great.',
    features: ['Appointment booking', 'Pet profiles', 'Service packages', 'Before/after photos'],
    painPoints: ['Managing appointments', 'Remembering pet preferences', 'Upselling add-ons', 'No-show management'],
    testimonial: {
      quote: "Pet profiles remember everything. Every groomer knows exactly how each dog should look.",
      author: "Samantha Wells",
      company: "Pampered Pups Grooming",
      location: "Orange County, CA"
    },
    stats: [
      { value: '95%', label: 'Repeat customers' },
      { value: '+$25', label: 'Avg add-on upsell' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I track grooming preferences?', answer: 'Yes! Cut styles, sensitivities, and special instructions saved per pet.' },
      { question: 'How do I reduce no-shows?', answer: 'Automatic reminders and easy rescheduling reduce missed appointments.' },
      { question: 'Does it support add-ons?', answer: 'Prompt add-ons like nail grinding, teeth cleaning, and premium shampoos.' }
    ]
  },
  'mobile-grooming': {
    name: 'Mobile Grooming',
    icon: '✂️',
    description: 'Run your mobile grooming van efficiently. Optimize routes, manage appointments, and pamper pets at home.',
    features: ['Route optimization', 'Mobile scheduling', 'Pet profiles', 'Service tracking'],
    painPoints: ['Route efficiency', 'Managing drive time between appointments', 'Water and power management', 'Appointment spacing'],
    testimonial: {
      quote: "Route optimization lets us fit 2 more dogs per day. That's significant extra revenue.",
      author: "Nina Rodriguez",
      company: "Groom Mobile",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '+2', label: 'Extra grooms daily' },
      { value: '30%', label: 'Less drive time' },
      { value: '$800', label: 'Extra weekly revenue' }
    ],
    faqs: [
      { question: 'Can I optimize my route?', answer: 'Yes! Appointments sequenced to minimize driving between homes.' },
      { question: 'How do I space appointments?', answer: 'Set service durations and travel buffers for realistic scheduling.' },
      { question: 'Does it track van resources?', answer: 'Log water levels and generator hours to prevent mid-day surprises.' }
    ]
  },
  'photography': {
    name: 'Photography',
    icon: '📷',
    description: 'Book sessions, manage shoots, and deliver photos professionally. Track packages and build your portfolio.',
    features: ['Session booking', 'Package management', 'Gallery delivery', 'Contract signing'],
    painPoints: ['Booking and scheduling', 'Package organization', 'Gallery delivery', 'Contract management'],
    testimonial: {
      quote: "Online booking and contracts streamlined everything. I spend more time shooting, less on admin.",
      author: "Jessica Martinez",
      company: "JM Photography",
      location: "San Diego, CA"
    },
    stats: [
      { value: '50%', label: 'Less admin time' },
      { value: '100+', label: 'Sessions monthly' },
      { value: '$500', label: 'Avg session value' }
    ],
    faqs: [
      { question: 'Can clients book online?', answer: 'Yes! Clients select packages, dates, and sign contracts all online.' },
      { question: 'How do I manage packages?', answer: 'Create session types with different hours, photos, and pricing.' },
      { question: 'Does it deliver galleries?', answer: 'Integration with gallery platforms for seamless delivery.' }
    ]
  },
  'event-planning': {
    name: 'Event Planning',
    icon: '🎉',
    description: 'Plan and coordinate events of any size. Track vendors, manage timelines, and deliver memorable experiences.',
    features: ['Timeline management', 'Vendor coordination', 'Budget tracking', 'Client communication'],
    painPoints: ['Vendor coordination', 'Timeline management', 'Budget tracking', 'Day-of logistics'],
    testimonial: {
      quote: "Vendor management in one place changed everything. No more spreadsheet chaos.",
      author: "Rachel Kim",
      company: "Elegant Events",
      location: "Beverly Hills, CA"
    },
    stats: [
      { value: '200+', label: 'Events coordinated' },
      { value: '50+', label: 'Vendor relationships' },
      { value: '5-star', label: 'Every review' }
    ],
    faqs: [
      { question: 'Can I manage multiple vendors?', answer: 'Yes! Track all vendors, contracts, and payments per event.' },
      { question: 'How do I build timelines?', answer: 'Detailed day-of timelines with assignments and notifications.' },
      { question: 'Does it track budgets?', answer: 'Budget management with actual vs estimated tracking.' }
    ]
  },
  'catering': {
    name: 'Catering',
    icon: '🍽️',
    description: 'Manage catering events from quote to cleanup. Track menus, coordinate staff, and deliver delicious experiences.',
    features: ['Menu management', 'Staff scheduling', 'Equipment tracking', 'Event coordination'],
    painPoints: ['Menu customization per event', 'Staff coordination', 'Equipment logistics', 'Dietary tracking'],
    testimonial: {
      quote: "Menu management and dietary tracking prevent mistakes. Every guest is taken care of.",
      author: "Marco Rossi",
      company: "Bella Catering",
      location: "San Francisco, CA"
    },
    stats: [
      { value: '300+', label: 'Events catered' },
      { value: '0', label: 'Dietary mistakes' },
      { value: '98%', label: 'Repeat clients' }
    ],
    faqs: [
      { question: 'Can I customize menus per event?', answer: 'Yes! Build custom menus with pricing and dietary accommodations.' },
      { question: 'How do I schedule staff?', answer: 'Assign servers, chefs, and bartenders to each event.' },
      { question: 'Does it track equipment?', answer: 'Log what equipment is needed and packed for each event.' }
    ]
  },
  'dj-services': {
    name: 'DJ Services',
    icon: '🎧',
    description: 'Book gigs, manage equipment, and deliver unforgettable performances. Track playlists and client preferences.',
    features: ['Gig booking', 'Equipment tracking', 'Playlist management', 'Contract handling'],
    painPoints: ['Booking management', 'Equipment coordination', 'Song requests', 'Contract and deposits'],
    testimonial: {
      quote: "Client portals for song requests made planning so much easier. Everyone's happy.",
      author: "DJ Marcus",
      company: "BeatMaster Entertainment",
      location: "Los Angeles, CA"
    },
    stats: [
      { value: '200+', label: 'Events annually' },
      { value: '100%', label: 'Deposit collection' },
      { value: '5-star', label: 'Average rating' }
    ],
    faqs: [
      { question: 'Can clients submit song requests?', answer: 'Yes! Client portal for must-plays, do-not-plays, and special moments.' },
      { question: 'How do I track equipment?', answer: 'Log what gear is needed for each gig size and venue type.' },
      { question: 'Does it handle contracts?', answer: 'Digital contracts with e-signature and deposit collection.' }
    ]
  },
  'carpentry': {
    name: 'Carpentry',
    icon: '🪚',
    description: 'Manage custom carpentry projects. Quote accurately, track materials, and deliver craftsmanship.',
    features: ['Project quoting', 'Material tracking', 'Photo documentation', 'Milestone billing'],
    painPoints: ['Accurate custom quotes', 'Material estimation', 'Project timelines', 'Progress billing'],
    testimonial: {
      quote: "Photo documentation sells future projects. Clients see our craftsmanship and refer friends.",
      author: "Tom Bradley",
      company: "Custom Woodworks",
      location: "Santa Barbara, CA"
    },
    stats: [
      { value: '40%', label: 'Referral rate' },
      { value: '$8K', label: 'Avg project value' },
      { value: '5-star', label: 'Every review' }
    ],
    faqs: [
      { question: 'Can I quote custom projects?', answer: 'Yes! Detailed line-item quotes for materials, labor, and finishes.' },
      { question: 'How do I track materials?', answer: 'Log materials per project with costs for accurate billing.' },
      { question: 'Does it support progress billing?', answer: 'Milestone-based invoicing as project phases complete.' }
    ]
  },
  'drywall': {
    name: 'Drywall',
    icon: '🧱',
    description: 'Manage drywall installation and repair. Calculate materials, schedule crews, and track multi-room projects.',
    features: ['Material calculators', 'Crew scheduling', 'Phase tracking', 'Photo documentation'],
    painPoints: ['Material calculation', 'Crew coordination', 'Multiple finish levels', 'Project phasing'],
    testimonial: {
      quote: "Material calculators are spot-on. We order exactly what we need, no waste.",
      author: "Mike Hernandez",
      company: "Perfect Walls Drywall",
      location: "Riverside, CA"
    },
    stats: [
      { value: '15%', label: 'Material savings' },
      { value: '3', label: 'Crews managed' },
      { value: '99%', label: 'On-time completion' }
    ],
    faqs: [
      { question: 'Can I calculate drywall materials?', answer: 'Yes! Sheets, mud, tape, and screws calculated from room dimensions.' },
      { question: 'How do I schedule phases?', answer: 'Track hanging, mudding, sanding, and finishing phases separately.' },
      { question: 'Does it handle different finish levels?', answer: 'Quote and track Level 3, 4, or 5 finishes per area.' }
    ]
  },
  'concrete': {
    name: 'Concrete & Masonry',
    icon: '🧱',
    description: 'Quote and pour concrete projects. Calculate materials, track curing, and manage crew schedules.',
    features: ['Yard calculators', 'Pour scheduling', 'Curing tracking', 'Weather monitoring'],
    painPoints: ['Accurate yardage calculations', 'Weather coordination', 'Curing time management', 'Crew scheduling'],
    testimonial: {
      quote: "Weather integration saved us from bad pours. We reschedule before problems happen.",
      author: "Joe Sanchez",
      company: "Solid Foundation Concrete",
      location: "Fresno, CA"
    },
    stats: [
      { value: '0', label: 'Failed pours' },
      { value: '100+', label: 'Projects annually' },
      { value: '$5K', label: 'Avg project value' }
    ],
    faqs: [
      { question: 'Can I calculate concrete yards?', answer: 'Yes! Enter dimensions for slabs, footings, and walls.' },
      { question: 'How do I handle weather?', answer: 'Weather forecasts help you schedule pours for ideal conditions.' },
      { question: 'Does it track curing?', answer: 'Set curing reminders and track when concrete is ready for next steps.' }
    ]
  },
  'welding': {
    name: 'Welding',
    icon: '🔥',
    description: 'Manage welding and fabrication jobs. Track materials, certifications, and deliver quality work.',
    features: ['Job tracking', 'Material management', 'Certification logs', 'Photo documentation'],
    painPoints: ['Tracking certifications', 'Material costs', 'Custom fabrication quotes', 'Project documentation'],
    testimonial: {
      quote: "Certification tracking keeps us compliant. We never miss renewals.",
      author: "Gary Thompson",
      company: "Thompson Welding & Fab",
      location: "Long Beach, CA"
    },
    stats: [
      { value: '100%', label: 'Certification compliance' },
      { value: '$3K', label: 'Avg job value' },
      { value: '4.9', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I track certifications?', answer: 'Yes! AWS, structural, and specialty certifications with expiration alerts.' },
      { question: 'How do I quote fabrication?', answer: 'Material weight, labor hours, and complexity-based pricing.' },
      { question: 'Does it document work?', answer: 'Before/during/after photos prove quality workmanship.' }
    ]
  },
  'insulation': {
    name: 'Insulation',
    icon: '🏗️',
    description: 'Quote and install insulation. Calculate materials, track R-values, and manage energy efficiency projects.',
    features: ['R-value tracking', 'Material calculators', 'Energy audits', 'Rebate tracking'],
    painPoints: ['R-value requirements', 'Material estimation', 'Rebate paperwork', 'Before/after documentation'],
    testimonial: {
      quote: "Rebate tracking is huge. Customers save money and we close more deals.",
      author: "Patrick O'Neill",
      company: "EcoSeal Insulation",
      location: "Sacramento, CA"
    },
    stats: [
      { value: '$500', label: 'Avg customer rebate' },
      { value: '30%', label: 'Higher close rate' },
      { value: '4.8', label: 'Star rating' }
    ],
    faqs: [
      { question: 'Can I track R-values?', answer: 'Yes! Document required and installed R-values per area.' },
      { question: 'How do I handle rebates?', answer: 'Track utility rebate programs and required documentation.' },
      { question: 'Does it calculate materials?', answer: 'Square footage calculators for batts, blown, and spray foam.' }
    ]
  },
  'siding': {
    name: 'Siding',
    icon: '🏡',
    description: 'Quote and install siding projects. Calculate materials, track colors, and manage exterior transformations.',
    features: ['Material calculators', 'Color documentation', 'Project phasing', 'Weather scheduling'],
    painPoints: ['Accurate material estimates', 'Color and style matching', 'Weather coordination', 'Multi-day scheduling'],
    testimonial: {
      quote: "Color documentation saves callbacks. We always have the exact match for repairs.",
      author: "Kevin Brooks",
      company: "Premier Siding Co",
      location: "Portland, CA"
    },
    stats: [
      { value: '0', label: 'Color mismatch issues' },
      { value: '$12K', label: 'Avg project value' },
      { value: '98%', label: 'Customer satisfaction' }
    ],
    faqs: [
      { question: 'Can I calculate siding materials?', answer: 'Yes! Squares, trim, and accessories from house dimensions.' },
      { question: 'How do I track colors?', answer: 'Document manufacturer, color codes, and lot numbers for future matching.' },
      { question: 'Does it handle weather delays?', answer: 'Weather monitoring helps schedule around rain and extreme temps.' }
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
    title: `${name} Software | ToolTime Pro - Built for California Service Pros`,
    description: industry?.description || `ToolTime Pro helps ${name} businesses manage scheduling, quoting, crews, and invoicing. Start your free trial today.`,
  };
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = industries[slug];

  // Fallback for industries not explicitly defined
  const displayIndustry = industry || {
    name: slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    icon: '🛠️',
    description: `ToolTime Pro works perfectly for ${slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} businesses. Our flexible platform adapts to your unique workflows and service offerings.`,
    features: ['Custom service definitions', 'Flexible scheduling', 'Mobile crew app', 'Professional invoicing'],
    painPoints: ['Managing multiple jobs and clients', 'Tracking time and materials', 'Creating professional quotes', 'Getting paid on time'],
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
      { question: 'Will ToolTime Pro work for my business?', answer: 'Yes! ToolTime Pro is designed to adapt to any service business. Define your own services, pricing, and workflows.' },
      { question: 'How long does setup take?', answer: 'Most businesses are up and running in under an hour. We help you import customers and set up services.' },
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
            {displayIndustry.name} businesses face unique challenges. ToolTime Pro solves them all.
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
            <p className="text-lg text-[#1a1a2e] font-semibold mb-4">ToolTime Pro fixes all of this.</p>
            <Link
              href="/auth/signup"
              className="inline-block px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold no-underline hover:bg-[#e6991a] transition-all"
            >
              Start Free Trial →
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
                <div className="text-2xl mb-3 text-[#f5a623]">✓</div>
                <h3 className="font-semibold text-[#1a1a2e]">{feature}</h3>
              </div>
            ))}
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
