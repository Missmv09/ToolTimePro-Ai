'use client';

import { Check, Crown } from 'lucide-react';

export default function DomainCard({ domain, isSelected, onSelect }) {
  const { domainName, available, premium, price, renewalPrice } = domain;

  return (
    <div
      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
        !available
          ? 'border-gray-100 bg-gray-50 opacity-60'
          : isSelected
            ? 'border-gold-500 bg-gold-50 shadow-card'
            : 'border-gray-200 bg-white hover:border-gold-300 hover:shadow-card cursor-pointer'
      }`}
      onClick={() => available && onSelect(domain)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-semibold truncate ${available ? 'text-navy-500' : 'text-gray-400 line-through'}`}>
              {domainName}
            </p>
            {premium && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                <Crown size={10} />
                Premium
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {available ? `$${price || '12.99'}/year` : 'Taken'}
            {available && renewalPrice && renewalPrice !== price && (
              <span className="text-gray-400"> · Renews at ${renewalPrice}/yr</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex-shrink-0 ml-3">
        {!available ? (
          <span className="badge text-gray-400 bg-gray-100">Taken</span>
        ) : isSelected ? (
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gold-500 text-navy-500 rounded-lg text-sm font-semibold">
            <Check size={14} />
            Selected
          </span>
        ) : (
          <button className="px-3 py-1.5 bg-navy-500 text-white rounded-lg text-sm font-medium hover:bg-navy-600 transition-colors">
            Select
          </button>
        )}
      </div>
    </div>
  );
}
