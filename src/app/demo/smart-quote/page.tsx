'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  FileText,
  DollarSign,
  CheckCircle,
  TrendingUp,
  ArrowRight,
  Zap,
  Star,
  Sparkles,
  Camera,
  Mic,
  PenLine,
} from 'lucide-react';

// Demo data
const demoStats = {
  sent: 124,
  accepted: 89,
  avgValue: 1250,
  closeRate: 72,
};

const demoLineItems = [
  { id: '1', description: 'Lawn Mowing — Front & Back', quantity: 1, unit: 'each', price: 45, total: 45, aiMin: 35, aiMax: 55 },
  { id: '2', description: 'Hedge Trimming', quantity: 2, unit: 'hour', price: 65, total: 130, aiMin: 55, aiMax: 80 },
  { id: '3', description: 'Sprinkler Head Replacement', quantity: 4, unit: 'each', price: 35, total: 140, aiMin: 25, aiMax: 45 },
  { id: '4', description: 'Mulch Installation', quantity: 3, unit: 'cubic_yard', price: 85, total: 255, aiMin: 70, aiMax: 100 },
  { id: '5', description: 'Spring Cleanup & Debris Removal', quantity: 1, unit: 'each', price: 175, total: 175, aiMin: 150, aiMax: 225 },
];

const demoCustomer = {
  name: 'Sarah Chen',
  address: '456 Oak Valley Dr, Austin, TX 78745',
  phone: '(512) 555-0147',
  email: 'sarah.chen@email.com',
};

const demoTiers = [
  { name: 'Good', multiplier: 1.0, color: '#5c5c70', extras: ['Basic lawn care', 'Standard mulch', 'Basic cleanup'] },
  { name: 'Better', multiplier: 1.35, color: '#f5a623', extras: ['Premium lawn care', 'Hardwood mulch', 'Deep cleanup', 'Edging included'] },
  { name: 'Best', multiplier: 1.7, color: '#00c853', extras: ['Full-service lawn care', 'Premium cedar mulch', 'Complete cleanup', 'Edging + blow-off', 'Fertilizer application'] },
];

const quickAddServices = [
  { icon: '🌿', name: 'Lawn Care', price: 45 },
  { icon: '🌳', name: 'Tree Trim', price: 120 },
  { icon: '🧹', name: 'Cleanup', price: 65 },
  { icon: '🔧', name: 'Repair', price: 85 },
  { icon: '🏊', name: 'Pool Service', price: 95 },
  { icon: '🪟', name: 'Window Clean', price: 8 },
  { icon: '🎨', name: 'Painting', price: 3 },
  { icon: '⚡', name: 'Electrical', price: 95 },
];

const unitLabels: Record<string, string> = {
  each: 'ea',
  hour: 'hr',
  sqft: 'sqft',
  linear_ft: 'lf',
  cubic_yard: 'cy',
};

export default function SmartQuoteDemo() {
  const t = useTranslations('demo.smartQuote');
  const [selectedTier, setSelectedTier] = useState(1);

  const subtotal = demoLineItems.reduce((sum, item) => sum + item.total, 0);
  const taxRate = 0.0825; // TX
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;

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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('quotesSent'), value: demoStats.sent, icon: FileText },
            { label: t('accepted'), value: demoStats.accepted, icon: CheckCircle },
            { label: t('avgValue'), value: `$${demoStats.avgValue.toLocaleString()}`, icon: DollarSign },
            { label: t('closeRate'), value: `${demoStats.closeRate}%`, icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={18} className="text-[#f5a623]" />
                <span className="text-sm text-[#5c5c70]">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-[#1a1a2e]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Input Modes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-sm font-bold text-[#5c5c70] uppercase tracking-wider mb-4">{t('createQuote')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Sparkles, label: t('modeAI'), desc: t('modeAIDesc'), active: true },
              { icon: Mic, label: t('modeVoice'), desc: t('modeVoiceDesc'), active: false },
              { icon: Camera, label: t('modePhoto'), desc: t('modePhotoDesc'), active: false },
              { icon: PenLine, label: t('modeManual'), desc: t('modeManualDesc'), active: false },
            ].map((mode) => (
              <button
                key={mode.label}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode.active
                    ? 'border-[#f5a623] bg-[#fef3d6]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <mode.icon size={20} className={mode.active ? 'text-[#f5a623] mb-2' : 'text-[#5c5c70] mb-2'} />
                <p className="font-bold text-sm text-[#1a1a2e]">{mode.label}</p>
                <p className="text-xs text-[#5c5c70] mt-0.5">{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sample Quote */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-[#1a1a2e]">{t('quoteFor')} {demoCustomer.name}</h2>
              <p className="text-sm text-[#5c5c70]">{demoCustomer.address}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fef3d6] text-[#f5a623] rounded-full text-sm font-semibold self-start">
              <Sparkles size={14} />
              {t('aiPowered')}
            </span>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 text-[#5c5c70] font-medium">{t('thDescription')}</th>
                  <th className="text-center py-3 text-[#5c5c70] font-medium">{t('thQty')}</th>
                  <th className="text-center py-3 text-[#5c5c70] font-medium">{t('thUnit')}</th>
                  <th className="text-right py-3 text-[#5c5c70] font-medium">{t('thPrice')}</th>
                  <th className="text-right py-3 text-[#5c5c70] font-medium">{t('thTotal')}</th>
                  <th className="text-right py-3 text-[#5c5c70] font-medium">{t('thAIRange')}</th>
                </tr>
              </thead>
              <tbody>
                {demoLineItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 text-[#1a1a2e] font-medium">{item.description}</td>
                    <td className="py-3 text-center text-[#1a1a2e]">{item.quantity}</td>
                    <td className="py-3 text-center text-[#5c5c70]">{unitLabels[item.unit]}</td>
                    <td className="py-3 text-right text-[#1a1a2e]">${item.price.toFixed(2)}</td>
                    <td className="py-3 text-right font-semibold text-[#1a1a2e]">${item.total.toFixed(2)}</td>
                    <td className="py-3 text-right">
                      <span className="inline-block bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        ${item.aiMin}–${item.aiMax}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#5c5c70]">{t('subtotal')}</span>
                <span className="text-[#1a1a2e] font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#5c5c70]">{t('tax')} (8.25%)</span>
                <span className="text-[#1a1a2e] font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                <span className="text-[#1a1a2e]">{t('total')}</span>
                <span className="text-[#1a1a2e]">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Good / Better / Best Tiers */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-[#1a1a2e] mb-4">{t('tiersTitle')}</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {demoTiers.map((tier, index) => {
              const tierTotal = Math.round(subtotal * tier.multiplier * 100) / 100;
              const tierTax = Math.round(tierTotal * taxRate * 100) / 100;
              return (
                <button
                  key={tier.name}
                  onClick={() => setSelectedTier(index)}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${
                    selectedTier === index
                      ? 'border-[#f5a623] shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-[#1a1a2e]">{tier.name}</span>
                    {index === 1 && (
                      <span className="bg-[#f5a623] text-[#1a1a2e] text-xs font-bold px-2 py-0.5 rounded-full">
                        {t('popular')}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-[#1a1a2e] mb-1">${(tierTotal + tierTax).toFixed(2)}</p>
                  <p className="text-xs text-[#5c5c70] mb-3">{tier.multiplier}x {t('multiplier')}</p>
                  <ul className="space-y-1.5">
                    {tier.extras.map((extra) => (
                      <li key={extra} className="flex items-center gap-2 text-sm text-[#5c5c70]">
                        <CheckCircle size={14} className="text-green-500 shrink-0" />
                        {extra}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Add Services */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h3 className="text-sm font-bold text-[#5c5c70] uppercase tracking-wider mb-4">{t('quickAdd')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickAddServices.map((svc) => (
              <button
                key={svc.name}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#f5a623] hover:bg-[#fef3d6] transition-all text-left"
              >
                <span className="text-xl">{svc.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#1a1a2e]">{svc.name}</p>
                  <p className="text-xs text-[#5c5c70]">${svc.price}/{svc.price < 10 ? 'sqft' : 'ea'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#fef3d6] rounded-xl p-8 text-center">
          <Zap className="w-12 h-12 text-[#f5a623] mx-auto mb-4" />
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
