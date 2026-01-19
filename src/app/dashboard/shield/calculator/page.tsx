'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, AlertTriangle, DollarSign, Clock, Info } from 'lucide-react';

type RateType = 'hourly' | 'salary';

export default function CalculatorPage() {
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
      dailyWage = rate * 8; // Assuming 8-hour day
    } else {
      const salary = parseFloat(annualSalary);
      if (isNaN(salary) || salary <= 0) return;
      dailyWage = salary / 365; // Daily rate for salary workers
    }

    const days = parseInt(daysLate);
    if (isNaN(days) || days < 0) return;

    // Cap at 30 days per Labor Code 203
    const effectiveDays = Math.min(days, 30);
    const penalty = dailyWage * effectiveDays;

    setResult({
      dailyWage,
      penalty,
      effectiveDays,
    });
  };

  const resetCalculator = () => {
    setHourlyRate('');
    setAnnualSalary('');
    setDaysLate('');
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/shield" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Waiting Time Penalty Calculator</h1>
          <p className="text-gray-500">Calculate potential penalties for late final wage payments</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="card bg-red-50 border-2 border-red-200">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">California Labor Code Section 203</h3>
            <p className="text-red-700 text-sm mt-1">
              If an employer willfully fails to pay wages due at termination, the employee&apos;s wages
              continue as a penalty from the due date at the same rate until paid or for 30 days,
              whichever is less.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-6 h-6 text-gold-500" />
            <h2 className="text-lg font-semibold text-navy-500">Calculate Penalty</h2>
          </div>

          {/* Rate Type Toggle */}
          <div className="mb-6">
            <label className="input-label">Payment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRateType('hourly')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  rateType === 'hourly'
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Hourly Worker
              </button>
              <button
                type="button"
                onClick={() => setRateType('salary')}
                className={`p-3 rounded-lg font-medium text-sm transition-all ${
                  rateType === 'salary'
                    ? 'bg-navy-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Salaried Worker
              </button>
            </div>
          </div>

          {/* Rate Input */}
          {rateType === 'hourly' ? (
            <div className="mb-4">
              <label className="input-label">Hourly Rate ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="25.00"
                  step="0.01"
                  min="0"
                  className="input pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Daily wage = hourly rate x 8 hours</p>
            </div>
          ) : (
            <div className="mb-4">
              <label className="input-label">Annual Salary ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  value={annualSalary}
                  onChange={(e) => setAnnualSalary(e.target.value)}
                  placeholder="52000"
                  step="1"
                  min="0"
                  className="input pl-10"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Daily wage = annual salary / 365</p>
            </div>
          )}

          {/* Days Late */}
          <div className="mb-6">
            <label className="input-label">Days Late</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                value={daysLate}
                onChange={(e) => setDaysLate(e.target.value)}
                placeholder="Enter days late"
                min="0"
                max="999"
                className="input pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Maximum penalty is 30 days (capped by law)</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={calculatePenalty} className="btn-secondary flex-1">
              Calculate Penalty
            </button>
            <button onClick={resetCalculator} className="btn-outline">
              Reset
            </button>
          </div>
        </div>

        {/* Result */}
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-6">Penalty Estimate</h2>

          {result ? (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Daily Wage Rate</span>
                  <span className="font-semibold text-navy-500">
                    ${result.dailyWage.toFixed(2)}/day
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Days Late (entered)</span>
                  <span className="font-semibold text-navy-500">{daysLate} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Days Applied (max 30)</span>
                  <span className="font-semibold text-navy-500">{result.effectiveDays} days</span>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
                <p className="text-sm text-red-600 font-medium mb-2">Estimated Waiting Time Penalty</p>
                <p className="text-4xl font-bold text-red-700">${result.penalty.toFixed(2)}</p>
                <p className="text-xs text-red-500 mt-2">
                  (${result.dailyWage.toFixed(2)} x {result.effectiveDays} days)
                </p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">
                  This is in ADDITION to the unpaid wages still owed. Total liability = unpaid wages +
                  waiting time penalty.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter wage information and days late to calculate the penalty</p>
            </div>
          )}
        </div>
      </div>

      {/* Examples */}
      <div className="card">
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Example Scenarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-navy-500 mb-2">Landscaper @ $20/hr</h4>
            <p className="text-sm text-gray-600">
              Final pay 10 days late
              <br />
              Daily wage: $160
              <br />
              <span className="font-semibold text-red-600">Penalty: $1,600</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-navy-500 mb-2">Pool Tech @ $25/hr</h4>
            <p className="text-sm text-gray-600">
              Final pay 5 days late
              <br />
              Daily wage: $200
              <br />
              <span className="font-semibold text-red-600">Penalty: $1,000</span>
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-navy-500 mb-2">Manager @ $60K/yr</h4>
            <p className="text-sm text-gray-600">
              Final pay 30 days late
              <br />
              Daily wage: $164.38
              <br />
              <span className="font-semibold text-red-600">Penalty: $4,931.51</span>
            </p>
          </div>
        </div>
      </div>

      {/* Legal Notice */}
      <div className="card bg-navy-50">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-navy-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium text-navy-500 mb-1">Disclaimer</p>
            <p>
              This calculator provides estimates for informational purposes only. Actual penalties may
              vary based on specific circumstances, good faith disputes, and other factors. The
              &quot;willfulness&quot; requirement means penalties may not apply if the delay was due to a
              genuine dispute over wages owed. Always consult with an employment attorney for specific
              situations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
