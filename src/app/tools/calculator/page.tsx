'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calculator, AlertTriangle, DollarSign, Clock, Info } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type RateType = 'hourly' | 'salary';

export default function CalculatorPage() {
  const t = useTranslations('tools.calculator');
  const [rateType, setRateType] = useState<RateType>('hourly');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [annualSalary, setAnnualSalary] = useState<string>('');
  const [daysLate, setDaysLate] = useState<string>('');
  const [result, setResult] = useState<{
    dailyWage: number;
    penalty: number;
    effectiveDays: number;
  } | null>(null);

  const calculatePenalty = () => {
    let dailyWage = 0;

    if (rateType === 'hourly') {
      const rate = parseFloat(hourlyRate);
      if (isNaN(rate) || rate <= 0) return;
      dailyWage = rate * 8;
    } else {
      const salary = parseFloat(annualSalary);
      if (isNaN(salary) || salary <= 0) return;
      dailyWage = salary / 365;
    }

    const days = parseInt(daysLate);
    if (isNaN(days) || days < 0) return;

    const effectiveDays = Math.min(days, 30);
    const penalty = dailyWage * effectiveDays;

    setResult({ dailyWage, penalty, effectiveDays });
  };

  const resetCalculator = () => {
    setHourlyRate('');
    setAnnualSalary('');
    setDaysLate('');
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1000px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <Image
                  src="/logo-01262026.png"
                  alt="ToolTime Pro"
                  width={140}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <Link href="/tools" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t('backToTools')}</span>
              </Link>
            </div>

            <LanguageSwitcher />
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-6">
        {/* Title */}
        <div className="flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl">
            <Calculator className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500">{t('subtitle')}</p>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">{t('laborCodeTitle')}</h3>
              <p className="text-red-700 text-sm mt-1">{t('laborCodeText')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calculator */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-6 h-6 text-[#f5a623]" />
              <h2 className="text-lg font-semibold text-gray-900">{t('calculateTitle')}</h2>
            </div>

            {/* Rate Type Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('paymentType')}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRateType('hourly')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    rateType === 'hourly'
                      ? 'bg-[#1a1a2e] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('hourlyWorker')}
                </button>
                <button
                  type="button"
                  onClick={() => setRateType('salary')}
                  className={`p-3 rounded-lg font-medium text-sm transition-all ${
                    rateType === 'salary'
                      ? 'bg-[#1a1a2e] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {t('salariedWorker')}
                </button>
              </div>
            </div>

            {/* Rate Input */}
            {rateType === 'hourly' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('hourlyRate')}</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="25.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('dailyWageCalc')}</p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('annualSalary')}</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(e.target.value)}
                    placeholder="52000"
                    step="1"
                    min="0"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t('dailyWageCalcSalary')}</p>
              </div>
            )}

            {/* Days Late */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('daysLate')}</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={daysLate}
                  onChange={(e) => setDaysLate(e.target.value)}
                  placeholder="10"
                  min="0"
                  max="999"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5a623] focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('maxPenalty')}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={calculatePenalty}
                className="flex-1 bg-[#f5a623] text-[#1a1a2e] py-3 rounded-lg font-semibold hover:bg-[#e6991a] transition-colors"
              >
                {t('calculate')}
              </button>
              <button
                onClick={resetCalculator}
                className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('reset')}
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">{t('resultTitle')}</h2>

            {result ? (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('dailyWageRate')}</span>
                    <span className="font-semibold text-gray-900">${result.dailyWage.toFixed(2)}/day</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('daysEntered')}</span>
                    <span className="font-semibold text-gray-900">{daysLate} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('daysApplied')}</span>
                    <span className="font-semibold text-gray-900">{result.effectiveDays} days</span>
                  </div>
                </div>

                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
                  <p className="text-sm text-red-600 font-medium mb-2">{t('estimatedPenalty')}</p>
                  <p className="text-4xl font-bold text-red-700">${result.penalty.toFixed(2)}</p>
                  <p className="text-xs text-red-500 mt-2">
                    (${result.dailyWage.toFixed(2)} x {result.effectiveDays} days)
                  </p>
                </div>

                <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                  <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">{t('additionalNote')}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('resultPlaceholder')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Examples */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('examplesTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{t('example1Title')}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{t('example1Text')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{t('example2Title')}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{t('example2Text')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{t('example3Title')}</h4>
              <p className="text-sm text-gray-600 whitespace-pre-line">{t('example3Text')}</p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600">
              <p className="font-medium text-blue-800 mb-1">{t('disclaimer')}</p>
              <p>{t('disclaimerText')}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-8 text-center text-white">
          <h3 className="text-xl font-bold mb-2">{t('getFullProtection')}</h3>
          <p className="text-gray-300 mb-6">{t('ctaText')}</p>
          <Link
            href="/auth/signup"
            className="inline-block bg-[#f5a623] text-[#1a1a2e] px-8 py-3 rounded-lg font-bold hover:bg-[#e6991a] transition-colors"
          >
            {t('startTrial')}
          </Link>
        </div>
      </div>
    </main>
  );
}
