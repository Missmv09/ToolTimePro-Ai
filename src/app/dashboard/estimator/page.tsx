'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { TRADE_ESTIMATORS, getEstimatorByTrade } from '@/lib/material-estimator';
import type { PriceTier, EstimateResult } from '@/lib/materials-database';
import { calculateMarkup, DEFAULT_TRADE_MARKUPS, type MarkupResult } from '@/lib/supplier-pricing';
import {
  Calculator,
  Paintbrush,
  Wrench,
  Zap,
  TreePine,
  Layers,
  Hammer,
  ArrowLeft,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  ShoppingCart,
  FileText,
  ChevronDown,
  ChevronUp,
  Home,
  Fence,
  Square,
  Droplets,
  Waves,
  Thermometer,
  Sun,
  DoorOpen,
  TrendingUp,
  Percent,
  Users,
  Receipt,
  Save,
  Loader2,
} from 'lucide-react';

const TRADE_ICONS: Record<string, typeof Calculator> = {
  Paintbrush, Wrench, Zap, TreePine, Layers, Hammer, Home, Fence, Square, Droplets, Waves, Thermometer, Sun, DoorOpen,
};

const TIER_LABELS: Record<PriceTier, { label: string; description: string; color: string }> = {
  economy: { label: 'Good', description: 'Budget-friendly, gets the job done', color: 'border-green-300 bg-green-50' },
  standard: { label: 'Better', description: 'Most popular, great value', color: 'border-blue-300 bg-blue-50' },
  premium: { label: 'Best', description: 'Top brands, longest lasting', color: 'border-purple-300 bg-purple-50' },
};

export default function EstimatorPage() {
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [selectedTier, setSelectedTier] = useState<PriceTier>('standard');
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [step, setStep] = useState<'trade' | 'specs' | 'results'>('trade');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Markup state
  const [markupResult, setMarkupResult] = useState<MarkupResult | null>(null);
  const [customMarkup, setCustomMarkup] = useState<number | null>(null);
  const [showMarkup, setShowMarkup] = useState(true);

  // "What I Actually Paid" state
  const [showPriceLog, setShowPriceLog] = useState(false);
  const [actualPrices, setActualPrices] = useState<Record<string, string>>({});
  const [storeName, setStoreName] = useState('');
  const [savingPrices, setSavingPrices] = useState(false);
  const [pricesSaved, setPricesSaved] = useState(false);

  const estimator = selectedTrade ? getEstimatorByTrade(selectedTrade) : null;

  // Initialize defaults when trade is selected
  const initializeAnswers = (trade: string) => {
    const est = getEstimatorByTrade(trade);
    if (!est) return;
    const defaults: Record<string, unknown> = {};
    for (const q of est.questions) {
      if (q.defaultValue !== undefined) {
        defaults[q.id] = q.defaultValue;
      }
    }
    setAnswers(defaults);
    setSelectedTrade(trade);
    setResult(null);
    setMarkupResult(null);
    setCustomMarkup(null);
    setActualPrices({});
    setStoreName('');
    setPricesSaved(false);
    setShowPriceLog(false);
    setStep('specs');
  };

  // Calculate markup whenever result or markup % changes
  const recalcMarkup = useCallback((estimateResult: EstimateResult, trade: string, overrideMarkup?: number | null) => {
    const markup = calculateMarkup(
      estimateResult.materialTotal,
      estimateResult.laborEstimate,
      trade,
      overrideMarkup != null ? { trade, materialMarkupPercent: overrideMarkup, laborMarkupPercent: 0 } : null,
    );
    setMarkupResult(markup);
  }, []);

  const handleCalculate = () => {
    if (!estimator || !selectedTrade) return;
    const res = estimator.calculate(answers, selectedTier);
    setResult(res);
    setStep('results');
    recalcMarkup(res, selectedTrade, customMarkup);
  };

  const handleMarkupChange = (percent: number) => {
    setCustomMarkup(percent);
    if (result && selectedTrade) {
      recalcMarkup(result, selectedTrade, percent);
    }
  };

  // Submit actual prices
  const handleSavePrices = async () => {
    if (!result || !selectedTrade) return;
    const items = result.items
      .filter(item => actualPrices[item.materialId] && Number(actualPrices[item.materialId]) > 0)
      .map(item => ({
        materialId: item.materialId,
        trade: selectedTrade,
        tier: selectedTier,
        estimatedPrice: item.unitPrice,
        actualPrice: Number(actualPrices[item.materialId]),
        storeName: storeName || undefined,
      }));

    if (items.length === 0) return;

    setSavingPrices(true);
    try {
      const response = await fetch('/api/material-price-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (response.ok) {
        setPricesSaved(true);
        setTimeout(() => setPricesSaved(false), 3000);
      }
    } catch {
      console.error('Failed to save price logs');
    } finally {
      setSavingPrices(false);
    }
  };

  const shouldShowQuestion = (q: NonNullable<typeof estimator>['questions'][0]) => {
    if (!q.showWhen) return true;
    return answers[q.showWhen.field] === q.showWhen.value ||
      String(answers[q.showWhen.field]) === String(q.showWhen.value);
  };

  // Group result items by category
  const groupedItems = useMemo(() => {
    if (!result) return {};
    const groups: Record<string, typeof result.items> = {};
    for (const item of result.items) {
      const category = item.name.includes('Paint') || item.name.includes('Primer') ? 'Paint & Primer' :
        item.name.includes('Tape') || item.name.includes('Drop') || item.name.includes('Roller') || item.name.includes('Brush') || item.name.includes('Tray') ? 'Supplies & Tools' :
        item.name.includes('Caulk') || item.name.includes('Spackle') || item.name.includes('Sand') ? 'Prep Materials' :
        'Materials';
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    }
    return groups;
  }, [result]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // Get default markup for current trade
  const defaultMarkup = selectedTrade
    ? (DEFAULT_TRADE_MARKUPS[selectedTrade] || DEFAULT_TRADE_MARKUPS._default).material
    : 20;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-navy-gradient rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gold-500 rounded-xl flex items-center justify-center">
            <Calculator className="w-8 h-8 text-navy-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Material Estimator</h1>
            <p className="text-white/70">Know Your Costs Before You Quote</p>
          </div>
        </div>
        <p className="text-white/80 max-w-2xl">
          Calculate material costs, add your markup, and generate a customer-ready quote.
          Good / Better / Best pricing tiers with built-in profit margin.
        </p>
      </div>

      {/* Step 1: Select Trade */}
      {step === 'trade' && (
        <div>
          <h2 className="text-lg font-semibold text-navy-500 mb-4">What type of work?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRADE_ESTIMATORS.map(est => {
              const Icon = TRADE_ICONS[est.icon] || Calculator;
              return (
                <button
                  key={est.trade}
                  onClick={() => initializeAnswers(est.trade)}
                  className="card-hover text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center group-hover:bg-gold-500 transition-colors">
                      <Icon className="w-6 h-6 text-gold-600 group-hover:text-navy-500 transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-500 group-hover:text-gold-600 transition-colors">
                        {est.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{est.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Job Specs */}
      {step === 'specs' && estimator && (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => { setStep('trade'); setSelectedTrade(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-lg font-semibold text-navy-500">{estimator.name} — Job Details</h2>
          </div>

          <div className="space-y-5">
            {estimator.questions.filter(shouldShowQuestion).map(q => (
              <div key={q.id + (q.showWhen?.field || '')}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {q.type === 'number' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={answers[q.id] as number || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value ? Number(e.target.value) : '' }))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-lg"
                    />
                    {q.unit && <span className="text-sm text-gray-500">{q.unit}</span>}
                  </div>
                )}

                {q.type === 'select' && (
                  <select
                    value={String(answers[q.id] || q.defaultValue || '')}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-sm"
                  >
                    {q.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {q.type === 'checkbox' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={answers[q.id] === true}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.checked }))}
                      className="w-5 h-5 text-gold-500 rounded border-gray-300 focus:ring-gold-500"
                    />
                    <span className="text-sm text-gray-600">{q.helpText || 'Yes'}</span>
                  </label>
                )}

                {q.helpText && q.type !== 'checkbox' && (
                  <p className="text-xs text-gray-400 mt-1">{q.helpText}</p>
                )}
              </div>
            ))}
          </div>

          {/* Tier Selection */}
          <div className="border-t mt-6 pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Material quality tier</h3>
            <div className="grid grid-cols-3 gap-3">
              {(['economy', 'standard', 'premium'] as PriceTier[]).map(tier => {
                const info = TIER_LABELS[tier];
                const isSelected = selectedTier === tier;
                return (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(tier)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected ? info.color + ' ring-2 ring-offset-1 ring-gold-400' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-900">{info.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={handleCalculate} className="btn-primary flex items-center gap-2 text-lg px-8 py-3">
              <Calculator className="w-5 h-5" />
              Calculate Estimate
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && result && estimator && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('specs')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-lg font-semibold text-navy-500">{estimator.name} Estimate</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              selectedTier === 'economy' ? 'bg-green-100 text-green-700' :
              selectedTier === 'standard' ? 'bg-blue-100 text-blue-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {TIER_LABELS[selectedTier].label} Tier
            </span>
          </div>

          {/* Cost Summary — Your Cost (what you pay) */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Your Cost (what you pay)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card border-2 border-orange-100 text-center">
                <Package className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-600">
                  ${result.materialTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">Materials</p>
              </div>
              <div className="card border-2 border-blue-100 text-center">
                <Clock className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-600">
                  ${result.laborEstimate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">Labor ({result.laborHours}h est.)</p>
              </div>
              <div className="card border-2 border-gray-200 text-center">
                <DollarSign className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-700">
                  ${result.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">Your Total Cost</p>
              </div>
            </div>
          </div>

          {/* Markup Controls + Customer Price */}
          <div className="card border-2 border-green-200 bg-green-50/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-800 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Customer Price (what they pay)
              </h3>
              <button
                onClick={() => setShowMarkup(!showMarkup)}
                className="text-sm text-green-600 hover:text-green-700"
              >
                {showMarkup ? 'Hide markup' : 'Show markup'}
              </button>
            </div>

            {showMarkup && (
              <div className="mb-4 p-4 bg-white rounded-xl border border-green-200">
                <div className="flex items-center gap-4 mb-3">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Material Markup
                  </label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={customMarkup ?? defaultMarkup}
                      onChange={e => handleMarkupChange(Number(e.target.value))}
                      className="flex-1 accent-green-600"
                    />
                    <div className="flex items-center gap-1 min-w-[80px]">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={customMarkup ?? defaultMarkup}
                        onChange={e => handleMarkupChange(Number(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm font-medium"
                      />
                      <Percent className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[10, 15, 20, 25, 30, 40, 50].map(pct => (
                    <button
                      key={pct}
                      onClick={() => handleMarkupChange(pct)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        (customMarkup ?? defaultMarkup) === pct
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Industry default for {estimator.name}: {defaultMarkup}% material markup
                </p>
              </div>
            )}

            {/* Customer totals */}
            {markupResult && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Materials + Markup</p>
                  <p className="text-xl font-bold text-green-700">
                    ${markupResult.customerMaterialTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Labor</p>
                  <p className="text-xl font-bold text-green-700">
                    ${markupResult.customerLaborTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-green-300 text-center">
                  <p className="text-xs text-gray-500 mb-1">Quote Customer</p>
                  <p className="text-2xl font-bold text-green-800">
                    ${markupResult.customerGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-green-200 text-center">
                  <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Your Profit
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    ${markupResult.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-green-500">{markupResult.profitMarginPercent}% margin</p>
                </div>
              </div>
            )}
          </div>

          {/* Compare Tiers */}
          <div className="card bg-gray-50">
            <h3 className="font-medium text-gray-700 mb-3">Compare All Tiers</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {(['economy', 'standard', 'premium'] as PriceTier[]).map(tier => {
                const tierResult = estimator.calculate(answers, tier);
                const tierMarkup = calculateMarkup(
                  tierResult.materialTotal,
                  tierResult.laborEstimate,
                  selectedTrade || '',
                  customMarkup != null ? { trade: selectedTrade || '', materialMarkupPercent: customMarkup, laborMarkupPercent: 0 } : null,
                );
                const info = TIER_LABELS[tier];
                const isActive = tier === selectedTier;
                return (
                  <button
                    key={tier}
                    onClick={() => {
                      setSelectedTier(tier);
                      const newResult = estimator.calculate(answers, tier);
                      setResult(newResult);
                      recalcMarkup(newResult, selectedTrade || '', customMarkup);
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isActive ? info.color + ' ring-2 ring-gold-400' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm">{info.label}</p>
                    <p className="text-xs text-gray-400 mt-1">Cost: ${tierResult.grandTotal.toFixed(2)}</p>
                    <p className="text-lg font-bold text-green-700 mt-1">
                      Quote: ${tierMarkup.customerGrandTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-500">+${tierMarkup.totalProfit.toFixed(2)} profit</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Material List */}
          <div className="card">
            <h3 className="font-semibold text-navy-500 mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Material List ({result.items.length} items)
            </h3>

            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className="mb-4">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full py-2 text-left"
                >
                  <span className="font-medium text-gray-700 text-sm">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      ${items.reduce((s, i) => s + i.total, 0).toFixed(2)}
                    </span>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {!expandedCategories.has(category) && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 border-b">
                          <th className="pb-1 pr-2">Item</th>
                          <th className="pb-1 pr-2">Brand</th>
                          <th className="pb-1 pr-2 text-right">Qty</th>
                          <th className="pb-1 pr-2 text-right">Unit Price</th>
                          <th className="pb-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 pr-2">
                              <p className="font-medium text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-400">{item.description}</p>
                            </td>
                            <td className="py-2 pr-2 text-xs text-gray-500">{item.brand}</td>
                            <td className="py-2 pr-2 text-right text-gray-700">{item.quantity} {item.unit}</td>
                            <td className="py-2 pr-2 text-right text-gray-500">${item.unitPrice.toFixed(2)}</td>
                            <td className="py-2 text-right font-medium text-gray-900">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold text-navy-500">Material Total</span>
              <span className="text-xl font-bold text-navy-500">
                ${result.materialTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Notes */}
          {result.notes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-medium text-yellow-800 text-sm mb-2">Notes</h3>
              <ul className="space-y-1">
                {result.notes.map((note, i) => (
                  <li key={i} className="text-sm text-yellow-700 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* What I Actually Paid */}
          <div className="card border border-purple-200">
            <button
              onClick={() => setShowPriceLog(!showPriceLog)}
              className="flex items-center justify-between w-full"
            >
              <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                What I Actually Paid
              </h3>
              <div className="flex items-center gap-2">
                {pricesSaved && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Saved
                  </span>
                )}
                {showPriceLog ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {showPriceLog && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600">
                  After buying materials, log what you actually paid. Over time, this builds a real-world price
                  database that helps keep your quotes accurate — and alerts you when prices drift.
                </p>

                {/* Store name */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Store</label>
                  <input
                    type="text"
                    placeholder="e.g., Home Depot Riverside"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Price entry table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 border-b">
                        <th className="pb-2 pr-2">Item</th>
                        <th className="pb-2 pr-2 text-right">Estimated</th>
                        <th className="pb-2 pr-2 text-right">Actual Price</th>
                        <th className="pb-2 text-right">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item, idx) => {
                        const actual = Number(actualPrices[item.materialId]) || 0;
                        const diff = actual > 0 ? actual - item.unitPrice : 0;
                        const diffPct = actual > 0 && item.unitPrice > 0
                          ? ((diff / item.unitPrice) * 100).toFixed(1)
                          : null;

                        return (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2 pr-2">
                              <p className="font-medium text-gray-800 text-xs">{item.name}</p>
                              <p className="text-xs text-gray-400">{item.brand}</p>
                            </td>
                            <td className="py-2 pr-2 text-right text-gray-500">
                              ${item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-2 pr-2 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="$0.00"
                                value={actualPrices[item.materialId] || ''}
                                onChange={e => setActualPrices(prev => ({
                                  ...prev,
                                  [item.materialId]: e.target.value,
                                }))}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </td>
                            <td className="py-2 text-right">
                              {diffPct !== null && (
                                <span className={`text-xs font-medium ${
                                  diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'
                                }`}>
                                  {diff > 0 ? '+' : ''}{diffPct}%
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-gray-400">
                    Only items with prices entered will be logged
                  </p>
                  <button
                    onClick={handleSavePrices}
                    disabled={savingPrices || Object.values(actualPrices).filter(v => Number(v) > 0).length === 0}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50"
                  >
                    {savingPrices ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Actual Prices
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-blue-800 text-sm mb-2">About Pricing</h3>
            <p className="text-sm text-blue-700">
              Material prices are based on 2026 retail pricing from Home Depot, Lowe&apos;s, and specialty suppliers.
              Your markup is applied on top to calculate the customer quote price. Log what you actually paid to
              help ToolTime keep prices accurate for all contractors.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/dashboard/smart-quote?materials=${encodeURIComponent(JSON.stringify(
                result.items.map(i => ({
                  description: `${i.name} (${i.brand})`,
                  quantity: i.quantity,
                  unit_price: markupResult
                    ? Math.round(i.unitPrice * (1 + markupResult.materialMarkupPercent / 100) * 100) / 100
                    : i.unitPrice,
                }))
              ))}`}
              className="btn-primary flex items-center justify-center gap-2 flex-1"
            >
              <FileText className="w-4 h-4" />
              Add to Quote {markupResult ? `($${markupResult.customerGrandTotal.toFixed(2)})` : ''}
            </Link>
            <button
              onClick={() => setStep('specs')}
              className="btn-outline flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Adjust Specs
            </button>
            <button
              onClick={() => { setStep('trade'); setSelectedTrade(null); setResult(null); setMarkupResult(null); setActualPrices({}); setShowPriceLog(false); }}
              className="btn-outline flex items-center justify-center gap-2"
            >
              New Estimate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
