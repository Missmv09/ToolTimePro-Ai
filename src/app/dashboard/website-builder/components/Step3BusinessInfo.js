'use client';

import { useState, useRef } from 'react';
import { X, Plus, Sparkles, RefreshCw } from 'lucide-react';

const serviceSuggestions = {
  painter: ['Interior Painting', 'Exterior Painting', 'Cabinet Refinishing', 'Drywall Repair', 'Color Consultation', 'Deck Staining', 'Wallpaper Removal', 'Pressure Washing'],
  landscaper: ['Lawn Maintenance', 'Landscape Design', 'Tree Trimming', 'Irrigation', 'Hardscaping', 'Mulching', 'Sod Installation', 'Seasonal Cleanup'],
  pool: ['Weekly Cleaning', 'Equipment Repair', 'Filter Replacement', 'Chemical Balancing', 'Green Pool Recovery', 'Pool Remodeling', 'Heater Service', 'Leak Detection'],
  cleaner: ['Regular Cleaning', 'Deep Cleaning', 'Move-In/Out', 'Office Cleaning', 'Post-Construction', 'Window Cleaning', 'Carpet Cleaning', 'Organizing'],
  handyman: ['Plumbing Repairs', 'Electrical Fixes', 'Drywall Patching', 'Door Installation', 'Furniture Assembly', 'Tile Work', 'Fence Repair', 'Caulking'],
  roofer: ['Roof Inspection', 'Shingle Repair', 'Full Replacement', 'Gutter Installation', 'Leak Repair', 'Flat Roofing', 'Tile Roofing', 'Emergency Tarping'],
  general: ['Remodeling', 'Room Additions', 'Kitchen Renovation', 'Bathroom Renovation', 'Flooring', 'Framing', 'Permits', 'Project Management'],
};

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function Step3BusinessInfo({ wizardData, setWizardData }) {
  const [serviceInput, setServiceInput] = useState('');
  const [errors, setErrors] = useState({});
  const serviceInputRef = useRef(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  const suggestions = serviceSuggestions[wizardData.trade] || serviceSuggestions.general;
  const availableSuggestions = suggestions.filter(
    (s) => !wizardData.services.includes(s)
  );

  const updateField = (field, value) => {
    setWizardData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handlePhoneChange = (e) => {
    updateField('phone', formatPhone(e.target.value));
  };

  const addService = (service) => {
    const trimmed = service.trim();
    if (trimmed && !wizardData.services.includes(trimmed)) {
      setWizardData((prev) => ({
        ...prev,
        services: [...prev.services, trimmed],
      }));
    }
    setServiceInput('');
    serviceInputRef.current?.focus();
  };

  const removeService = (service) => {
    setWizardData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s !== service),
    }));
  };

  const handleServiceKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (serviceInput.trim()) {
        addService(serviceInput);
      }
    }
  };

  const suggestTaglines = async () => {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await fetch('/api/website-builder/ai-suggest/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: wizardData.businessName,
          trade: wizardData.trade,
          services: wizardData.services,
          serviceArea: wizardData.serviceArea,
        }),
      });
      const data = await res.json();
      if (data.suggestions?.length) {
        setAiSuggestions(data.suggestions);
      }
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">Tell us about your business</h2>
      <p className="text-gray-500 mb-8">
        This info will appear on your website. Don&apos;t worry — you can change it anytime.
      </p>

      <div className="max-w-2xl space-y-5">
        {/* Business Name */}
        <div>
          <label className="input-label">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={`input ${errors.businessName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
            placeholder="Bob's Painting Co."
            value={wizardData.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
          />
          {errors.businessName && (
            <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>
          )}
        </div>

        {/* Tagline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="input-label mb-0">Tagline</label>
            <button
              type="button"
              onClick={suggestTaglines}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-gold-50 text-gold-700 border border-gold-200 hover:bg-gold-100 transition-colors disabled:opacity-50"
            >
              {aiLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {aiLoading ? 'Thinking...' : 'Suggest with AI'}
            </button>
          </div>
          <input
            type="text"
            className="input"
            placeholder="Quality work, every time"
            value={wizardData.tagline}
            onChange={(e) => updateField('tagline', e.target.value)}
          />
          {aiSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {aiSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { updateField('tagline', s); setAiSuggestions([]); }}
                  className="px-3 py-1.5 bg-gold-50 text-navy-500 rounded-full text-xs border border-gold-200 hover:bg-gold-100 hover:border-gold-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {aiSuggestions.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">Type your own or tap &ldquo;Suggest with AI&rdquo; for ideas</p>
          )}
        </div>

        {/* Phone & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              className={`input ${errors.phone ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              placeholder="(310) 555-1234"
              value={wizardData.phone}
              onChange={handlePhoneChange}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className="input-label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="bob@email.com"
              value={wizardData.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
        </div>

        {/* Service Area */}
        <div>
          <label className="input-label">Service Area</label>
          <input
            type="text"
            className="input"
            placeholder="Los Angeles & surrounding areas"
            value={wizardData.serviceArea}
            onChange={(e) => updateField('serviceArea', e.target.value)}
          />
        </div>

        {/* License & Years */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">License # (CSLB)</label>
            <input
              type="text"
              className="input"
              placeholder="Optional — builds trust"
              value={wizardData.licenseNumber}
              onChange={(e) => updateField('licenseNumber', e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Years in Business</label>
            <select
              className="input"
              value={wizardData.yearsInBusiness}
              onChange={(e) => updateField('yearsInBusiness', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="1-5">1-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="10-20">10-20 years</option>
              <option value="20+">20+ years</option>
            </select>
          </div>
        </div>

        {/* Services */}
        <div>
          <label className="input-label">
            Services Offered <span className="text-red-500">*</span>
          </label>

          {/* Selected services tags */}
          {wizardData.services.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {wizardData.services.map((service) => (
                <span
                  key={service}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gold-50 text-navy-500 rounded-full text-sm font-medium border border-gold-200"
                >
                  {service}
                  <button
                    onClick={() => removeService(service)}
                    className="text-navy-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Service input */}
          <div className="flex gap-2">
            <input
              ref={serviceInputRef}
              type="text"
              className={`input ${errors.services ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              placeholder="Type a service and press Enter"
              value={serviceInput}
              onChange={(e) => setServiceInput(e.target.value)}
              onKeyDown={handleServiceKeyDown}
            />
            <button
              type="button"
              onClick={() => serviceInput.trim() && addService(serviceInput)}
              className="btn-outline px-3 flex-shrink-0"
            >
              <Plus size={18} />
            </button>
          </div>
          {errors.services && (
            <p className="text-xs text-red-500 mt-1">{errors.services}</p>
          )}

          {/* Suggestions */}
          {availableSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">Click to add:</p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((service) => (
                  <button
                    key={service}
                    onClick={() => addService(service)}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs hover:bg-gold-50 hover:text-navy-500 hover:border-gold-200 border border-gray-200 transition-colors"
                  >
                    + {service}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
