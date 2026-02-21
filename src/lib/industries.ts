// Industry definitions with suggested services for onboarding
// Used by the onboarding wizard to auto-populate services based on industry selection

export interface SuggestedService {
  name: string
  price: number
  priceType: 'fixed' | 'hourly' | 'per_sqft'
  duration: number // minutes
}

export interface Industry {
  name: string
  icon: string
  slug: string
  category: string
  services: SuggestedService[]
}

export const industries: Industry[] = [
  // Outdoor & Property
  {
    name: 'Landscaping', icon: '🌳', slug: 'landscaping', category: 'Outdoor',
    services: [
      { name: 'Landscape Design Consultation', price: 150, priceType: 'fixed', duration: 60 },
      { name: 'Garden Installation', price: 75, priceType: 'hourly', duration: 240 },
      { name: 'Hardscape / Paver Installation', price: 5, priceType: 'per_sqft', duration: 480 },
      { name: 'Sod Installation', price: 2, priceType: 'per_sqft', duration: 240 },
      { name: 'Landscape Maintenance (weekly)', price: 200, priceType: 'fixed', duration: 120 },
    ],
  },
  {
    name: 'Lawn Care', icon: '🌱', slug: 'lawn-care', category: 'Outdoor',
    services: [
      { name: 'Lawn Mowing', price: 50, priceType: 'fixed', duration: 60 },
      { name: 'Edging & Blowing', price: 30, priceType: 'fixed', duration: 30 },
      { name: 'Fertilizing & Weed Control', price: 75, priceType: 'fixed', duration: 45 },
      { name: 'Aeration & Overseeding', price: 150, priceType: 'fixed', duration: 120 },
      { name: 'Full Yard Cleanup', price: 200, priceType: 'fixed', duration: 180 },
    ],
  },
  {
    name: 'Tree Service', icon: '🌲', slug: 'tree-service', category: 'Outdoor',
    services: [
      { name: 'Tree Trimming', price: 300, priceType: 'fixed', duration: 180 },
      { name: 'Tree Removal', price: 800, priceType: 'fixed', duration: 480 },
      { name: 'Stump Grinding', price: 200, priceType: 'fixed', duration: 120 },
      { name: 'Emergency Storm Cleanup', price: 500, priceType: 'fixed', duration: 240 },
    ],
  },
  {
    name: 'Pool Service', icon: '🏊', slug: 'pool-service', category: 'Outdoor',
    services: [
      { name: 'Weekly Pool Cleaning', price: 120, priceType: 'fixed', duration: 45 },
      { name: 'Chemical Balancing', price: 80, priceType: 'fixed', duration: 30 },
      { name: 'Filter Cleaning', price: 100, priceType: 'fixed', duration: 60 },
      { name: 'Pool Opening (seasonal)', price: 250, priceType: 'fixed', duration: 120 },
      { name: 'Equipment Repair', price: 85, priceType: 'hourly', duration: 120 },
    ],
  },
  {
    name: 'Pressure Washing', icon: '💦', slug: 'pressure-washing', category: 'Outdoor',
    services: [
      { name: 'Driveway Pressure Wash', price: 150, priceType: 'fixed', duration: 90 },
      { name: 'House Exterior Wash', price: 300, priceType: 'fixed', duration: 180 },
      { name: 'Deck / Patio Cleaning', price: 175, priceType: 'fixed', duration: 90 },
      { name: 'Fence Cleaning', price: 200, priceType: 'fixed', duration: 120 },
    ],
  },
  {
    name: 'Fencing', icon: '🏗️', slug: 'fencing', category: 'Outdoor',
    services: [
      { name: 'Wood Fence Install', price: 30, priceType: 'per_sqft', duration: 480 },
      { name: 'Chain Link Fence Install', price: 15, priceType: 'per_sqft', duration: 480 },
      { name: 'Fence Repair', price: 75, priceType: 'hourly', duration: 120 },
      { name: 'Gate Installation', price: 400, priceType: 'fixed', duration: 240 },
    ],
  },
  {
    name: 'Irrigation & Sprinkler', icon: '💧', slug: 'irrigation', category: 'Outdoor',
    services: [
      { name: 'Sprinkler System Install', price: 2500, priceType: 'fixed', duration: 480 },
      { name: 'Sprinkler Repair', price: 85, priceType: 'hourly', duration: 60 },
      { name: 'System Winterization', price: 100, priceType: 'fixed', duration: 45 },
      { name: 'Drip Irrigation Setup', price: 500, priceType: 'fixed', duration: 240 },
    ],
  },
  {
    name: 'Snow Removal', icon: '❄️', slug: 'snow-removal', category: 'Outdoor',
    services: [
      { name: 'Driveway Snow Removal', price: 75, priceType: 'fixed', duration: 45 },
      { name: 'Commercial Lot Plowing', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Sidewalk Salting', price: 50, priceType: 'fixed', duration: 30 },
      { name: 'Seasonal Snow Contract', price: 500, priceType: 'fixed', duration: 60 },
    ],
  },

  // Home Trades
  {
    name: 'Plumbing', icon: '🔧', slug: 'plumbing', category: 'Trades',
    services: [
      { name: 'Drain Cleaning', price: 150, priceType: 'fixed', duration: 60 },
      { name: 'Faucet / Fixture Install', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Water Heater Install', price: 1200, priceType: 'fixed', duration: 240 },
      { name: 'Leak Repair', price: 95, priceType: 'hourly', duration: 60 },
      { name: 'Toilet Repair / Replace', price: 250, priceType: 'fixed', duration: 90 },
    ],
  },
  {
    name: 'Electrical', icon: '⚡', slug: 'electrical', category: 'Trades',
    services: [
      { name: 'Outlet / Switch Install', price: 150, priceType: 'fixed', duration: 45 },
      { name: 'Ceiling Fan Install', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Panel Upgrade', price: 2000, priceType: 'fixed', duration: 480 },
      { name: 'Lighting Install', price: 100, priceType: 'hourly', duration: 120 },
      { name: 'Electrical Troubleshooting', price: 95, priceType: 'hourly', duration: 60 },
    ],
  },
  {
    name: 'HVAC', icon: '❄️', slug: 'hvac', category: 'Trades',
    services: [
      { name: 'AC Tune-Up', price: 120, priceType: 'fixed', duration: 60 },
      { name: 'Furnace Repair', price: 95, priceType: 'hourly', duration: 120 },
      { name: 'AC Installation', price: 4500, priceType: 'fixed', duration: 480 },
      { name: 'Duct Cleaning', price: 400, priceType: 'fixed', duration: 180 },
      { name: 'Thermostat Install', price: 200, priceType: 'fixed', duration: 60 },
    ],
  },
  {
    name: 'Roofing', icon: '🏠', slug: 'roofing', category: 'Trades',
    services: [
      { name: 'Roof Inspection', price: 200, priceType: 'fixed', duration: 60 },
      { name: 'Roof Repair', price: 500, priceType: 'fixed', duration: 240 },
      { name: 'Roof Replacement', price: 5, priceType: 'per_sqft', duration: 480 },
      { name: 'Gutter Installation', price: 10, priceType: 'per_sqft', duration: 240 },
    ],
  },
  {
    name: 'Painting', icon: '🎨', slug: 'painting', category: 'Trades',
    services: [
      { name: 'Interior Room Painting', price: 400, priceType: 'fixed', duration: 240 },
      { name: 'Exterior House Painting', price: 3000, priceType: 'fixed', duration: 480 },
      { name: 'Cabinet Painting', price: 1500, priceType: 'fixed', duration: 480 },
      { name: 'Deck / Fence Staining', price: 500, priceType: 'fixed', duration: 240 },
      { name: 'Touch-Up / Patch Work', price: 75, priceType: 'hourly', duration: 120 },
    ],
  },
  {
    name: 'Flooring', icon: '🪵', slug: 'flooring', category: 'Trades',
    services: [
      { name: 'Hardwood Floor Install', price: 8, priceType: 'per_sqft', duration: 480 },
      { name: 'Tile Install', price: 10, priceType: 'per_sqft', duration: 480 },
      { name: 'Carpet Install', price: 5, priceType: 'per_sqft', duration: 240 },
      { name: 'Floor Refinishing', price: 4, priceType: 'per_sqft', duration: 480 },
      { name: 'Floor Repair', price: 85, priceType: 'hourly', duration: 120 },
    ],
  },
  {
    name: 'Carpentry', icon: '🪚', slug: 'carpentry', category: 'Trades',
    services: [
      { name: 'Custom Shelving', price: 500, priceType: 'fixed', duration: 240 },
      { name: 'Deck Building', price: 5000, priceType: 'fixed', duration: 480 },
      { name: 'Door Install / Repair', price: 250, priceType: 'fixed', duration: 120 },
      { name: 'Trim & Molding', price: 75, priceType: 'hourly', duration: 240 },
    ],
  },
  {
    name: 'Drywall', icon: '🧱', slug: 'drywall', category: 'Trades',
    services: [
      { name: 'Drywall Patch Repair', price: 150, priceType: 'fixed', duration: 90 },
      { name: 'Drywall Install (new)', price: 2, priceType: 'per_sqft', duration: 480 },
      { name: 'Texture / Skim Coat', price: 2, priceType: 'per_sqft', duration: 240 },
      { name: 'Popcorn Ceiling Removal', price: 3, priceType: 'per_sqft', duration: 480 },
    ],
  },
  {
    name: 'Concrete & Masonry', icon: '🧱', slug: 'concrete', category: 'Trades',
    services: [
      { name: 'Concrete Pouring', price: 8, priceType: 'per_sqft', duration: 480 },
      { name: 'Retaining Wall', price: 3000, priceType: 'fixed', duration: 480 },
      { name: 'Concrete Repair', price: 85, priceType: 'hourly', duration: 240 },
      { name: 'Stamped Concrete', price: 12, priceType: 'per_sqft', duration: 480 },
    ],
  },

  {
    name: 'Sheet Metal', icon: '🏭', slug: 'sheet-metal', category: 'Trades',
    services: [
      { name: 'Custom Ductwork Fabrication', price: 1500, priceType: 'fixed', duration: 480 },
      { name: 'Gutter & Downspout Install', price: 12, priceType: 'per_sqft', duration: 240 },
      { name: 'Flashing & Trim Work', price: 85, priceType: 'hourly', duration: 180 },
      { name: 'Metal Roofing Install', price: 10, priceType: 'per_sqft', duration: 480 },
      { name: 'HVAC Sheet Metal Fabrication', price: 2000, priceType: 'fixed', duration: 480 },
    ],
  },

  // Cleaning & Maintenance
  {
    name: 'House Cleaning', icon: '🧹', slug: 'cleaning', category: 'Cleaning',
    services: [
      { name: 'Standard Cleaning', price: 150, priceType: 'fixed', duration: 120 },
      { name: 'Deep Cleaning', price: 300, priceType: 'fixed', duration: 240 },
      { name: 'Move-In / Move-Out Clean', price: 400, priceType: 'fixed', duration: 300 },
      { name: 'Recurring Weekly Cleaning', price: 120, priceType: 'fixed', duration: 120 },
    ],
  },
  {
    name: 'Commercial Cleaning', icon: '🏢', slug: 'commercial-cleaning', category: 'Cleaning',
    services: [
      { name: 'Office Cleaning', price: 200, priceType: 'fixed', duration: 120 },
      { name: 'Post-Construction Cleanup', price: 500, priceType: 'fixed', duration: 480 },
      { name: 'Floor Stripping & Waxing', price: 400, priceType: 'fixed', duration: 240 },
      { name: 'Restroom Sanitization', price: 100, priceType: 'fixed', duration: 60 },
    ],
  },
  {
    name: 'Carpet Cleaning', icon: '🧽', slug: 'carpet-cleaning', category: 'Cleaning',
    services: [
      { name: 'Carpet Steam Cleaning (per room)', price: 50, priceType: 'fixed', duration: 30 },
      { name: 'Upholstery Cleaning', price: 100, priceType: 'fixed', duration: 60 },
      { name: 'Stain Treatment', price: 75, priceType: 'fixed', duration: 30 },
      { name: 'Whole House Carpet Clean', price: 250, priceType: 'fixed', duration: 180 },
    ],
  },
  {
    name: 'Window Cleaning', icon: '🪟', slug: 'window-cleaning', category: 'Cleaning',
    services: [
      { name: 'Interior Window Cleaning', price: 8, priceType: 'fixed', duration: 120 },
      { name: 'Exterior Window Cleaning', price: 10, priceType: 'fixed', duration: 120 },
      { name: 'Screen Cleaning', price: 5, priceType: 'fixed', duration: 60 },
      { name: 'Storm Window Service', price: 200, priceType: 'fixed', duration: 120 },
    ],
  },

  // Repair & Install
  {
    name: 'Handyman', icon: '🛠️', slug: 'handyman', category: 'Repair',
    services: [
      { name: 'General Repair (hourly)', price: 75, priceType: 'hourly', duration: 60 },
      { name: 'Furniture Assembly', price: 100, priceType: 'fixed', duration: 60 },
      { name: 'TV Mounting', price: 150, priceType: 'fixed', duration: 60 },
      { name: 'Shelving & Organization', price: 200, priceType: 'fixed', duration: 120 },
      { name: 'Drywall Patch', price: 125, priceType: 'fixed', duration: 60 },
    ],
  },
  {
    name: 'Appliance Repair', icon: '🔌', slug: 'appliance-repair', category: 'Repair',
    services: [
      { name: 'Diagnostic Visit', price: 80, priceType: 'fixed', duration: 45 },
      { name: 'Washer / Dryer Repair', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Refrigerator Repair', price: 250, priceType: 'fixed', duration: 120 },
      { name: 'Dishwasher Repair', price: 175, priceType: 'fixed', duration: 90 },
    ],
  },
  {
    name: 'Garage Door', icon: '🚪', slug: 'garage-door', category: 'Repair',
    services: [
      { name: 'Garage Door Repair', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Spring Replacement', price: 300, priceType: 'fixed', duration: 120 },
      { name: 'Opener Install', price: 350, priceType: 'fixed', duration: 120 },
      { name: 'Full Door Replacement', price: 1200, priceType: 'fixed', duration: 480 },
    ],
  },
  {
    name: 'Locksmith', icon: '🔐', slug: 'locksmith', category: 'Repair',
    services: [
      { name: 'Lockout Service', price: 100, priceType: 'fixed', duration: 30 },
      { name: 'Lock Rekey', price: 75, priceType: 'fixed', duration: 30 },
      { name: 'Lock Replacement', price: 150, priceType: 'fixed', duration: 45 },
      { name: 'Smart Lock Install', price: 250, priceType: 'fixed', duration: 60 },
    ],
  },

  // Specialty Services
  {
    name: 'Pest Control', icon: '🐜', slug: 'pest-control', category: 'Specialty',
    services: [
      { name: 'General Pest Treatment', price: 150, priceType: 'fixed', duration: 60 },
      { name: 'Termite Inspection', price: 100, priceType: 'fixed', duration: 60 },
      { name: 'Rodent Control', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Quarterly Maintenance Plan', price: 100, priceType: 'fixed', duration: 30 },
    ],
  },
  {
    name: 'Solar Installation', icon: '☀️', slug: 'solar', category: 'Specialty',
    services: [
      { name: 'Solar Consultation', price: 0, priceType: 'fixed', duration: 60 },
      { name: 'Residential Solar Install', price: 15000, priceType: 'fixed', duration: 480 },
      { name: 'Solar Panel Cleaning', price: 200, priceType: 'fixed', duration: 90 },
      { name: 'Battery Storage Install', price: 8000, priceType: 'fixed', duration: 480 },
    ],
  },

  // Auto & Mobile
  {
    name: 'Auto Detailing', icon: '🚗', slug: 'auto-detailing', category: 'Auto',
    services: [
      { name: 'Exterior Wash & Wax', price: 100, priceType: 'fixed', duration: 90 },
      { name: 'Interior Detail', price: 150, priceType: 'fixed', duration: 120 },
      { name: 'Full Detail Package', price: 250, priceType: 'fixed', duration: 240 },
      { name: 'Ceramic Coating', price: 500, priceType: 'fixed', duration: 480 },
      { name: 'Paint Correction', price: 400, priceType: 'fixed', duration: 360 },
    ],
  },
  {
    name: 'Mobile Car Wash', icon: '🚙', slug: 'mobile-car-wash', category: 'Auto',
    services: [
      { name: 'Basic Wash', price: 30, priceType: 'fixed', duration: 30 },
      { name: 'Premium Wash', price: 60, priceType: 'fixed', duration: 60 },
      { name: 'Interior Vacuum & Wipe', price: 50, priceType: 'fixed', duration: 45 },
      { name: 'Full Service Wash', price: 100, priceType: 'fixed', duration: 90 },
    ],
  },

  // Moving & Hauling
  {
    name: 'Moving', icon: '📦', slug: 'moving', category: 'Moving',
    services: [
      { name: 'Local Move (2 movers)', price: 120, priceType: 'hourly', duration: 240 },
      { name: 'Loading / Unloading Only', price: 100, priceType: 'hourly', duration: 120 },
      { name: 'Packing Service', price: 80, priceType: 'hourly', duration: 180 },
      { name: 'Furniture Disassembly & Reassembly', price: 200, priceType: 'fixed', duration: 120 },
    ],
  },
  {
    name: 'Junk Removal', icon: '🗑️', slug: 'junk-removal', category: 'Moving',
    services: [
      { name: 'Single Item Pickup', price: 75, priceType: 'fixed', duration: 30 },
      { name: 'Half Truck Load', price: 250, priceType: 'fixed', duration: 60 },
      { name: 'Full Truck Load', price: 400, priceType: 'fixed', duration: 90 },
      { name: 'Estate Cleanout', price: 800, priceType: 'fixed', duration: 480 },
    ],
  },

  // Pet & Personal
  {
    name: 'Pet Sitting', icon: '🐕', slug: 'pet-sitting', category: 'Personal',
    services: [
      { name: 'Daily Pet Visit (30 min)', price: 25, priceType: 'fixed', duration: 30 },
      { name: 'Overnight Pet Sitting', price: 75, priceType: 'fixed', duration: 720 },
      { name: 'Dog Walking (30 min)', price: 20, priceType: 'fixed', duration: 30 },
      { name: 'Pet Boarding (per night)', price: 50, priceType: 'fixed', duration: 1440 },
    ],
  },
  {
    name: 'Pet Grooming', icon: '🐩', slug: 'pet-grooming', category: 'Personal',
    services: [
      { name: 'Bath & Brush', price: 40, priceType: 'fixed', duration: 60 },
      { name: 'Full Groom (small dog)', price: 60, priceType: 'fixed', duration: 90 },
      { name: 'Full Groom (large dog)', price: 90, priceType: 'fixed', duration: 120 },
      { name: 'Nail Trim', price: 15, priceType: 'fixed', duration: 15 },
    ],
  },

  // Events & Creative
  {
    name: 'Photography', icon: '📷', slug: 'photography', category: 'Events',
    services: [
      { name: 'Portrait Session (1 hr)', price: 200, priceType: 'fixed', duration: 60 },
      { name: 'Event Photography (4 hrs)', price: 800, priceType: 'fixed', duration: 240 },
      { name: 'Real Estate Photography', price: 200, priceType: 'fixed', duration: 60 },
      { name: 'Headshots', price: 150, priceType: 'fixed', duration: 30 },
    ],
  },
]

// Helper to get all unique categories
export const categories = ['All', 'Outdoor', 'Trades', 'Cleaning', 'Repair', 'Specialty', 'Auto', 'Moving', 'Personal', 'Events'] as const

// Helper to find an industry by slug
export function getIndustryBySlug(slug: string): Industry | undefined {
  return industries.find((i) => i.slug === slug)
}
