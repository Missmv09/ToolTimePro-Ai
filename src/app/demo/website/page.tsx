'use client';

import { useState } from 'react';
import Link from 'next/link';

// Industry options with default content
const industryOptions = [
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: '🌿',
    heroImage: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=80',
    defaultServices: ['Lawn Mowing', 'Tree Trimming', 'Hedge Shaping', 'Yard Cleanup', 'Irrigation Repair'],
    defaultTagline: 'Beautiful Lawns, Happy Customers',
  },
  {
    id: 'cleaning',
    name: 'House Cleaning',
    icon: '🧹',
    heroImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80',
    defaultServices: ['Deep Cleaning', 'Regular Cleaning', 'Move-In/Move-Out', 'Office Cleaning', 'Window Washing'],
    defaultTagline: 'Spotless Homes, Every Time',
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: '🔧',
    heroImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1200&q=80',
    defaultServices: ['Drain Cleaning', 'Leak Repair', 'Water Heater Install', 'Pipe Replacement', 'Emergency Service'],
    defaultTagline: 'Fast Fixes, Fair Prices',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: '💡',
    heroImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80',
    defaultServices: ['Panel Upgrades', 'Outlet Installation', 'Lighting', 'Rewiring', 'EV Charger Install'],
    defaultTagline: 'Powering Your Home Safely',
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: '🎨',
    heroImage: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=1200&q=80',
    defaultServices: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Deck Staining', 'Drywall Repair'],
    defaultTagline: 'Color Your World Beautiful',
  },
  {
    id: 'pool',
    name: 'Pool Service',
    icon: '🏊',
    heroImage: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&q=80',
    defaultServices: ['Weekly Cleaning', 'Chemical Balancing', 'Filter Repair', 'Pump Service', 'Pool Opening/Closing'],
    defaultTagline: 'Crystal Clear Pools Year-Round',
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: '❄️',
    heroImage: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&q=80',
    defaultServices: ['AC Repair', 'Furnace Service', 'Duct Cleaning', 'System Installation', 'Maintenance Plans'],
    defaultTagline: 'Comfort in Every Season',
  },
  {
    id: 'detailing',
    name: 'Auto Detailing',
    icon: '🚗',
    heroImage: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=1200&q=80',
    defaultServices: ['Full Detail', 'Interior Clean', 'Exterior Wash', 'Ceramic Coating', 'Paint Correction'],
    defaultTagline: 'Showroom Shine, Every Time',
  },
];

// Color scheme options
const colorSchemes = [
  { id: 'navy-gold', name: 'Navy & Gold', primary: '#1e3a5f', secondary: '#d4af37', bg: '#f8f9fa' },
  { id: 'green-cream', name: 'Forest Green', primary: '#2d5a27', secondary: '#8bc34a', bg: '#f5f7f2' },
  { id: 'blue-orange', name: 'Blue & Orange', primary: '#1976d2', secondary: '#ff9800', bg: '#fafafa' },
  { id: 'red-black', name: 'Bold Red', primary: '#c62828', secondary: '#212121', bg: '#fafafa' },
  { id: 'purple-pink', name: 'Purple & Pink', primary: '#6a1b9a', secondary: '#e91e63', bg: '#faf5fc' },
  { id: 'teal-coral', name: 'Teal & Coral', primary: '#00796b', secondary: '#ff7043', bg: '#f5fafa' },
];

// Demo testimonials
const demoTestimonials = [
  { name: 'John M.', text: 'Best service in town! They were on time and did an amazing job.', rating: 5 },
  { name: 'Sarah K.', text: 'Professional, affordable, and friendly. Highly recommend!', rating: 5 },
  { name: 'Mike R.', text: 'Been using them for years. Always reliable and great quality.', rating: 5 },
];

export default function WebsiteDemoPage() {
  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Business info state
  const [selectedIndustry, setSelectedIndustry] = useState(industryOptions[0]);
  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [selectedColorScheme, setSelectedColorScheme] = useState(colorSchemes[0]);

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Initialize defaults when industry changes
  const handleIndustryChange = (industry: typeof industryOptions[0]) => {
    setSelectedIndustry(industry);
    setServices(industry.defaultServices);
    if (!tagline) {
      setTagline(industry.defaultTagline);
    }
  };

  // Add/remove services
  const addService = (service: string) => {
    if (service && !services.includes(service)) {
      setServices([...services, service]);
    }
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  // Get display values
  const displayName = businessName || `${selectedIndustry.name} Pro`;
  const displayTagline = tagline || selectedIndustry.defaultTagline;
  const displayPhone = phone || '(555) 123-4567';
  const displayServices = services.length > 0 ? services : selectedIndustry.defaultServices;

  // Render the website preview
  const renderWebsitePreview = () => (
    <div
      className={`bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${
        previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
      }`}
      style={{ backgroundColor: selectedColorScheme.bg }}
    >
      {/* Preview Browser Chrome */}
      <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex-1 bg-gray-700 rounded px-3 py-1 text-sm text-gray-300 text-center">
          www.{displayName.toLowerCase().replace(/\s+/g, '')}.com
        </div>
      </div>

      {/* Website Content */}
      <div className="max-h-[600px] overflow-y-auto">
        {/* Navigation */}
        <nav
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: selectedColorScheme.primary }}
        >
          <div className="text-white font-bold text-xl">{displayName}</div>
          <div className={`flex gap-6 text-white/90 text-sm ${previewMode === 'mobile' ? 'hidden' : ''}`}>
            <span className="hover:text-white cursor-pointer">Home</span>
            <span className="hover:text-white cursor-pointer">Services</span>
            <span className="hover:text-white cursor-pointer">About</span>
            <span className="hover:text-white cursor-pointer">Reviews</span>
            <span className="hover:text-white cursor-pointer">Contact</span>
          </div>
          <a
            href="#"
            className="px-4 py-2 rounded-lg font-semibold text-sm"
            style={{ backgroundColor: selectedColorScheme.secondary, color: selectedColorScheme.primary }}
          >
            {displayPhone}
          </a>
        </nav>

        {/* Hero Section */}
        <div className="relative h-64 md:h-80 bg-gray-900">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${selectedIndustry.heroImage})` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          <div className="relative z-10 h-full flex flex-col justify-center px-8">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{displayTagline}</h1>
            <p className="text-white/80 text-lg mb-6 max-w-xl">
              Professional {selectedIndustry.name.toLowerCase()} services you can trust.
              Serving the local community with quality work and fair prices.
            </p>
            <div className="flex gap-4">
              <button
                className="px-6 py-3 rounded-lg font-semibold"
                style={{ backgroundColor: selectedColorScheme.secondary, color: selectedColorScheme.primary }}
              >
                Get Free Quote
              </button>
              <button className="px-6 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white/10">
                Our Services
              </button>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="py-6 px-8 bg-white border-b">
          <div className={`grid ${previewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'} gap-4 text-center`}>
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">✓</span>
              <span className="text-sm text-gray-600">Licensed & Insured</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">⭐</span>
              <span className="text-sm text-gray-600">5-Star Rated</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">🕐</span>
              <span className="text-sm text-gray-600">Same-Day Service</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">💯</span>
              <span className="text-sm text-gray-600">Satisfaction Guaranteed</span>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="py-12 px-8">
          <h2
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: selectedColorScheme.primary }}
          >
            Our Services
          </h2>
          <div className={`grid ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
            {displayServices.slice(0, 6).map((service, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white text-xl"
                  style={{ backgroundColor: selectedColorScheme.primary }}
                >
                  {selectedIndustry.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{service}</h3>
                <p className="text-sm text-gray-600">
                  Professional {service.toLowerCase()} service with attention to detail.
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div
          className="py-12 px-8 text-center text-white"
          style={{ backgroundColor: selectedColorScheme.primary }}
        >
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            Request a free quote today and see why we&apos;re the top-rated {selectedIndustry.name.toLowerCase()} service in the area.
          </p>
          <button
            className="px-8 py-4 rounded-lg font-bold text-lg"
            style={{ backgroundColor: selectedColorScheme.secondary, color: selectedColorScheme.primary }}
          >
            Get Your Free Quote
          </button>
        </div>

        {/* Reviews Section */}
        <div className="py-12 px-8 bg-gray-50">
          <h2
            className="text-2xl font-bold mb-8 text-center"
            style={{ color: selectedColorScheme.primary }}
          >
            What Our Customers Say
          </h2>
          <div className={`grid ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-3'} gap-6`}>
            {demoTestimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4">&quot;{testimonial.text}&quot;</p>
                <p className="font-semibold text-gray-900">— {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="py-12 px-8 bg-white">
          <div className={`grid ${previewMode === 'mobile' ? 'grid-cols-1' : 'grid-cols-2'} gap-8`}>
            <div>
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: selectedColorScheme.primary }}
              >
                Contact Us
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📞</span>
                  <span className="text-gray-700">{displayPhone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📧</span>
                  <span className="text-gray-700">{email || `info@${displayName.toLowerCase().replace(/\s+/g, '')}.com`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <span className="text-gray-700">{address || 'Serving the Greater Metro Area'}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-4">Request a Quote</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  disabled
                />
                <textarea
                  placeholder="How can we help?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg h-20"
                  disabled
                />
                <button
                  className="w-full py-3 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: selectedColorScheme.primary }}
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className="py-8 px-8 text-center text-white/80 text-sm"
          style={{ backgroundColor: selectedColorScheme.primary }}
        >
          <p className="font-bold text-white mb-2">{displayName}</p>
          <p>&copy; {new Date().getFullYear()} {displayName}. All rights reserved.</p>
          <p className="mt-2 text-white/60">Powered by ToolTime Pro</p>
        </footer>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-500 to-navy-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">🌐</span>
            <h1 className="text-3xl font-bold">Website Builder Demo</h1>
          </div>
          <p className="text-white/80">See a sample of the professional website we&apos;d build for your business.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                    currentStep >= step
                      ? 'bg-gold-500 text-navy-900'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step}
                </div>
                <span className={`ml-2 font-medium ${currentStep >= step ? 'text-navy-500' : 'text-gray-400'}`}>
                  {step === 1 ? 'Industry' : step === 2 ? 'Details' : 'Preview'}
                </span>
                {step < 3 && (
                  <div className={`w-12 h-1 mx-4 rounded ${currentStep > step ? 'bg-gold-500' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Industry Selection */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-navy-500 mb-2 text-center">What type of business do you run?</h2>
            <p className="text-gray-600 mb-8 text-center">We&apos;ll customize your demo website based on your industry.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {industryOptions.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => handleIndustryChange(industry)}
                  className={`p-6 rounded-xl border-2 transition-all text-center ${
                    selectedIndustry.id === industry.id
                      ? 'border-gold-500 bg-gold-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{industry.icon}</div>
                  <div className="font-semibold text-navy-500">{industry.name}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (!services.length) {
                    setServices(selectedIndustry.defaultServices);
                  }
                  setCurrentStep(2);
                }}
                className="px-8 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Business Details */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-navy-500 mb-2 text-center">Tell us about your business</h2>
            <p className="text-gray-600 mb-8 text-center">This info will appear on your demo website. Leave blank to use placeholders.</p>

            <div className="max-w-2xl mx-auto space-y-6">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={`e.g., ${selectedIndustry.name} Pro`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={selectedIndustry.defaultTagline}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              {/* Phone & Email */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@yourbusiness.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Area</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Serving San Jose and surrounding areas"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Services</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {services.map((service, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-navy-100 text-navy-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {service}
                      <button
                        onClick={() => removeService(index)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a service..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        addService(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.currentTarget.previousSibling as HTMLInputElement;
                      if (input.value) {
                        addService(input.value);
                        input.value = '';
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Color Scheme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color Scheme</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {colorSchemes.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => setSelectedColorScheme(scheme)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedColorScheme.id === scheme.id
                          ? 'border-gold-500'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: scheme.primary }}
                        ></div>
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: scheme.secondary }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-600">{scheme.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-8 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
              >
                See My Website →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {currentStep === 3 && (
          <div>
            {/* Preview Controls */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Edit Details
              </button>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Preview:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      previewMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    🖥️ Desktop
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      previewMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    📱 Mobile
                  </button>
                </div>
              </div>

              <Link
                href="/auth/register"
                className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
              >
                Get This Website →
              </Link>
            </div>

            {/* Website Preview */}
            {renderWebsitePreview()}

            {/* CTA Section */}
            <div className="mt-8 bg-gradient-to-r from-navy-500 to-navy-600 rounded-xl p-8 text-center text-white">
              <h2 className="text-2xl font-bold mb-3">Love what you see?</h2>
              <p className="text-white/80 mb-6 max-w-xl mx-auto">
                We&apos;ll build this website for you — plus online booking, AI chatbot, invoicing, and more.
                All included in your ToolTime Pro subscription.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/auth/register"
                  className="px-8 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/#get-started"
                  className="px-8 py-3 border-2 border-white text-white hover:bg-white/10 font-semibold rounded-lg transition-colors"
                >
                  Schedule Demo Call
                </Link>
              </div>
              <p className="text-white/60 text-sm mt-4">No credit card required. Setup done for you in days.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
