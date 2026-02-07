'use client';

import { Paintbrush, Trees, Waves, Sparkles, Wrench, Home, HardHat, Droplets, Zap, Thermometer, Bug, Scissors, Truck, Car, Fence } from 'lucide-react';

const trades = [
  {
    id: 'painter',
    label: 'Painting',
    description: 'Interior & exterior painting',
    icon: Paintbrush,
  },
  {
    id: 'landscaper',
    label: 'Landscaping',
    description: 'Lawn care & landscaping',
    icon: Trees,
  },
  {
    id: 'pool',
    label: 'Pool Service',
    description: 'Pool cleaning & maintenance',
    icon: Waves,
  },
  {
    id: 'cleaner',
    label: 'Cleaning',
    description: 'Residential & commercial cleaning',
    icon: Sparkles,
  },
  {
    id: 'plumber',
    label: 'Plumbing',
    description: 'Plumbing repair & installation',
    icon: Droplets,
  },
  {
    id: 'electrician',
    label: 'Electrical',
    description: 'Wiring, panels & repairs',
    icon: Zap,
  },
  {
    id: 'hvac',
    label: 'HVAC',
    description: 'Heating, cooling & air quality',
    icon: Thermometer,
  },
  {
    id: 'handyman',
    label: 'Handyman',
    description: 'General repairs & maintenance',
    icon: Wrench,
  },
  {
    id: 'roofer',
    label: 'Roofing',
    description: 'Roof repair & installation',
    icon: Home,
  },
  {
    id: 'pest',
    label: 'Pest Control',
    description: 'Pest removal & prevention',
    icon: Bug,
  },
  {
    id: 'pressure-washer',
    label: 'Pressure Washing',
    description: 'Exterior cleaning & restoration',
    icon: Droplets,
  },
  {
    id: 'flooring',
    label: 'Flooring',
    description: 'Flooring install & refinishing',
    icon: Fence,
  },
  {
    id: 'mover',
    label: 'Moving & Junk Removal',
    description: 'Hauling, moving & cleanouts',
    icon: Truck,
  },
  {
    id: 'auto',
    label: 'Auto Detailing',
    description: 'Car detailing & mobile wash',
    icon: Car,
  },
  {
    id: 'tree',
    label: 'Tree Service',
    description: 'Trimming, removal & stump grinding',
    icon: Scissors,
  },
  {
    id: 'general',
    label: 'General Contractor',
    description: 'Full-service contracting',
    icon: HardHat,
  },
];

export default function Step1TradeSelect({ wizardData, setWizardData }) {
  const selected = wizardData.trade;

  const handleSelect = (tradeId) => {
    setWizardData((prev) => ({ ...prev, trade: tradeId }));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-500 mb-2">What type of business do you run?</h2>
      <p className="text-gray-500 mb-8">
        We&apos;ll show you templates designed specifically for your trade.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {trades.map((trade) => {
          const isSelected = selected === trade.id;
          const Icon = trade.icon;

          return (
            <button
              key={trade.id}
              onClick={() => handleSelect(trade.id)}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover-lift text-center ${
                isSelected
                  ? 'border-gold-500 bg-gold-50 shadow-card-hover'
                  : 'border-gray-200 bg-white hover:border-gold-300 hover:shadow-card'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}

              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  isSelected ? 'bg-gold-500 text-navy-500' : 'bg-navy-50 text-navy-400'
                }`}
              >
                <Icon size={28} />
              </div>

              <div>
                <p className={`font-semibold ${isSelected ? 'text-navy-500' : 'text-navy-500'}`}>
                  {trade.label}
                </p>
                <p className="text-xs text-gray-500 mt-1">{trade.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
