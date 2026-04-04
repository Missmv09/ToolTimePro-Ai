'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  Calculator,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Percent,
} from 'lucide-react';

// Demo trades
const trades = [
  { id: 'painting', icon: '🎨', name: 'Painting', desc: 'Interior & exterior' },
  { id: 'electrical', icon: '⚡', name: 'Electrical', desc: 'Wiring & fixtures' },
  { id: 'plumbing', icon: '🔧', name: 'Plumbing', desc: 'Pipes & fixtures' },
  { id: 'carpentry', icon: '🪚', name: 'Carpentry', desc: 'Framing & trim' },
  { id: 'roofing', icon: '🏠', name: 'Roofing', desc: 'Shingles & repairs' },
  { id: 'fencing', icon: '🏗️', name: 'Fencing', desc: 'Wood, vinyl & chain link' },
  { id: 'concrete', icon: '🧱', name: 'Concrete', desc: 'Slabs, driveways & patios' },
  { id: 'landscaping', icon: '🌿', name: 'Landscaping', desc: 'Sod, plants & hardscape' },
  { id: 'flooring', icon: '🪵', name: 'Flooring', desc: 'Tile, hardwood & vinyl' },
];

// Demo estimate result (simulated painting job)
const demoEstimate = {
  materialTotal: 487.50,
  laborHours: 16,
  laborRate: 45,
  laborEstimate: 720,
  categories: [
    {
      name: 'Paint & Primer',
      items: [
        { name: 'Interior Latex Paint', brand: 'Behr Premium Plus', qty: '3 gal', unitPrice: 38.98, total: 116.94 },
        { name: 'Primer/Sealer', brand: 'Kilz Original', qty: '2 gal', unitPrice: 24.98, total: 49.96 },
      ],
    },
    {
      name: 'Supplies & Tools',
      items: [
        { name: 'Roller Cover 3-Pack', brand: 'Wooster', qty: '2 pk', unitPrice: 12.49, total: 24.98 },
        { name: 'Roller Frame 9"', brand: 'Wooster', qty: '1 ea', unitPrice: 8.98, total: 8.98 },
        { name: 'Angled Brush 2.5"', brand: 'Purdy', qty: '2 ea', unitPrice: 14.99, total: 29.98 },
        { name: 'Paint Tray & Liner', brand: 'Generic', qty: '2 ea', unitPrice: 5.99, total: 11.98 },
      ],
    },
    {
      name: 'Prep Materials',
      items: [
        { name: 'Painter\'s Tape 1.88"', brand: '3M ScotchBlue', qty: '4 rolls', unitPrice: 7.98, total: 31.92 },
        { name: 'Drop Cloth 9x12', brand: 'Generic', qty: '3 ea', unitPrice: 12.99, total: 38.97 },
        { name: 'Sandpaper 150-Grit Pack', brand: '3M', qty: '1 pk', unitPrice: 8.49, total: 8.49 },
        { name: 'Caulk & Caulk Gun', brand: 'DAP', qty: '2 tubes', unitPrice: 6.49, total: 12.98 },
      ],
    },
  ],
  notes: [
    'Prices based on 2026 retail averages — actual costs may vary by region.',
    'Labor estimate assumes 2-person crew for standard 1,200 sqft interior.',
    'Includes 10% material waste factor.',
  ],
};

const tierMultipliers = [
  { name: 'Economy', label: 'Good', multiplier: 0.8, color: '#5c5c70' },
  { name: 'Standard', label: 'Better', multiplier: 1.0, color: '#f5a623' },
  { name: 'Premium', label: 'Best', multiplier: 1.25, color: '#00c853' },
];

const markupPresets = [10, 15, 20, 25, 30, 40, 50];

export default function EstimatorDemo() {
  const t = useTranslations('demo.estimator');
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [markup, setMarkup] = useState(25);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Paint & Primer': true,
    'Supplies & Tools': true,
    'Prep Materials': true,
  });

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Calculations
  const materialWithMarkup = demoEstimate.materialTotal * (1 + markup / 100);
  const customerTotal = materialWithMarkup + demoEstimate.laborEstimate;
  const profit = materialWithMarkup - demoEstimate.materialTotal;
  const profitMargin = customerTotal > 0 ? (profit / customerTotal) * 100 : 0;
  const grandTotal = demoEstimate.materialTotal + demoEstimate.laborEstimate;

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Demo Banner */}
      <div className="bg-[#1a1a2e] text-white py-3 px-4 text-center">
        <p className="text-sm">
          <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded font-bold mr-2">
            DEMO
          </span>
          {t('bannerText')}{' '}
          <Link href="/auth/signup" className="text-[#f5a623] underline">
            {t('bannerSignUp')}
          </Link>{' '}
          {t('bannerSuffix')}
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">{t('title')}</h1>
            <p className="text-[#5c5c70]">{t('subtitle')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {!selectedTrade ? (
          /* Trade Selection Grid */
          <div>
            <h3 className="text-sm font-bold text-[#5c5c70] uppercase tracking-wider mb-4">{t('selectTrade')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {trades.map((trade) => (
                <button
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade.id)}
                  className="p-5 bg-white rounded-xl border-2 border-gray-200 hover:border-[#f5a623] hover:shadow-md transition-all text-left"
                >
                  <span className="text-3xl mb-3 block">{trade.icon}</span>
                  <p className="font-bold text-[#1a1a2e]">{trade.name}</p>
                  <p className="text-sm text-[#5c5c70]">{trade.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Results View */
          <div>
            <button
              onClick={() => setSelectedTrade(null)}
              className="flex items-center gap-2 text-[#f5a623] font-semibold mb-6 hover:underline"
            >
              <ArrowLeft size={18} />
              {t('backToTrades')}
            </button>

            {/* Cost Breakdown Cards */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-[#5c5c70] mb-1">{t('materials')}</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">${demoEstimate.materialTotal.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-[#5c5c70] mb-1">{t('labor')} ({demoEstimate.laborHours} hrs)</p>
                <p className="text-2xl font-bold text-[#1a1a2e]">${demoEstimate.laborEstimate.toFixed(2)}</p>
              </div>
              <div className="bg-[#1a1a2e] rounded-xl p-5">
                <p className="text-sm text-white/70 mb-1">{t('yourCost')}</p>
                <p className="text-2xl font-bold text-[#f5a623]">${grandTotal.toFixed(2)}</p>
              </div>
            </div>

            {/* Markup Calculator */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Percent size={18} className="text-[#f5a623]" />
                <h3 className="font-bold text-[#1a1a2e]">{t('markupCalc')}</h3>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {markupPresets.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setMarkup(pct)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      markup === pct
                        ? 'bg-[#f5a623] text-[#1a1a2e]'
                        : 'bg-gray-100 text-[#5c5c70] hover:bg-gray-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={markup}
                onChange={(e) => setMarkup(Number(e.target.value))}
                className="w-full mb-6 accent-[#f5a623]"
              />

              {/* Customer Quote Summary */}
              <div className="bg-[#fafafa] rounded-xl p-5">
                <h4 className="text-sm font-bold text-[#5c5c70] uppercase tracking-wider mb-3">{t('customerQuote')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5c5c70]">{t('materialsMarkup')}</span>
                    <span className="text-[#1a1a2e] font-medium">${materialWithMarkup.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#5c5c70]">{t('labor')}</span>
                    <span className="text-[#1a1a2e] font-medium">${demoEstimate.laborEstimate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                    <span className="text-[#1a1a2e]">{t('quoteTotal')}</span>
                    <span className="text-[#1a1a2e]">${customerTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-semibold">{t('profit')}</span>
                    <span className="text-green-600 font-semibold">${profit.toFixed(2)} ({profitMargin.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tier Comparison */}
            <div className="mb-8">
              <h3 className="font-bold text-[#1a1a2e] mb-4">{t('tierComparison')}</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {tierMultipliers.map((tier) => {
                  const tierMaterial = demoEstimate.materialTotal * tier.multiplier;
                  const tierCustomer = tierMaterial * (1 + markup / 100) + demoEstimate.laborEstimate;
                  return (
                    <div
                      key={tier.name}
                      className={`p-5 rounded-xl border-2 ${
                        tier.name === 'Standard' ? 'border-[#f5a623] shadow-md' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[#1a1a2e]">{tier.label}</span>
                        {tier.name === 'Standard' && (
                          <span className="bg-[#f5a623] text-[#1a1a2e] text-xs font-bold px-2 py-0.5 rounded-full">
                            {t('mostPopular')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#5c5c70] mb-1">{tier.name}</p>
                      <p className="text-2xl font-bold text-[#1a1a2e]">${tierCustomer.toFixed(2)}</p>
                      <p className="text-xs text-[#5c5c70] mt-1">{t('materialCost')}: ${tierMaterial.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Material Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <h3 className="font-bold text-[#1a1a2e] mb-4">{t('materialBreakdown')}</h3>
              {demoEstimate.categories.map((cat) => (
                <div key={cat.name} className="mb-4 last:mb-0">
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="flex items-center justify-between w-full py-3 border-b border-gray-200 text-left"
                  >
                    <span className="font-semibold text-[#1a1a2e]">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#5c5c70]">
                        ${cat.items.reduce((s, i) => s + i.total, 0).toFixed(2)}
                      </span>
                      {expandedCategories[cat.name] ? (
                        <ChevronUp size={18} className="text-[#5c5c70]" />
                      ) : (
                        <ChevronDown size={18} className="text-[#5c5c70]" />
                      )}
                    </div>
                  </button>
                  {expandedCategories[cat.name] && (
                    <table className="w-full text-sm mt-2">
                      <thead>
                        <tr className="text-[#5c5c70]">
                          <th className="text-left py-2 font-medium">{t('thItem')}</th>
                          <th className="text-left py-2 font-medium">{t('thBrand')}</th>
                          <th className="text-center py-2 font-medium">{t('thQty')}</th>
                          <th className="text-right py-2 font-medium">{t('thUnitPrice')}</th>
                          <th className="text-right py-2 font-medium">{t('thTotal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.items.map((item) => (
                          <tr key={item.name} className="border-t border-gray-100">
                            <td className="py-2 text-[#1a1a2e]">{item.name}</td>
                            <td className="py-2 text-[#5c5c70]">{item.brand}</td>
                            <td className="py-2 text-center text-[#5c5c70]">{item.qty}</td>
                            <td className="py-2 text-right text-[#1a1a2e]">${item.unitPrice.toFixed(2)}</td>
                            <td className="py-2 text-right font-semibold text-[#1a1a2e]">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
              <h4 className="font-semibold text-amber-800 mb-2">{t('notes')}</h4>
              <ul className="space-y-1">
                {demoEstimate.notes.map((note, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <CheckCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-[#fef3d6] rounded-xl p-8 text-center">
          <Calculator className="w-12 h-12 text-[#f5a623] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">{t('ctaTitle')}</h3>
          <p className="text-[#5c5c70] mb-6 max-w-lg mx-auto">{t('ctaDesc')}</p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold hover:bg-[#2d2d44] transition-colors no-underline"
          >
            {t('getStartedFree')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-[#5c5c70]">
            {t('poweredBy')}{' '}
            <Link href="/" className="text-[#f5a623] font-medium no-underline hover:underline">
              ToolTime Pro
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
