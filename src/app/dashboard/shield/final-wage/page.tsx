'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';

type TerminationType = 'fired' | 'quit72' | 'quitless72' | 'layoff' | '';

interface RuleInfo {
  title: string;
  deadline: string;
  description: string;
  color: string;
}

const rules: Record<string, RuleInfo> = {
  fired: {
    title: 'Fired / Discharged (Involuntary)',
    deadline: 'IMMEDIATELY - Same Day',
    description:
      'When you fire or discharge an employee, all wages earned and unpaid at the time of termination are due immediately. This includes regular wages, overtime, commissions, and accrued vacation/PTO.',
    color: 'red',
  },
  quit72: {
    title: 'Quit with 72+ Hours Notice',
    deadline: 'Last Day of Work',
    description:
      'When an employee quits and gives at least 72 hours advance notice, final wages are due on their last day of work.',
    color: 'green',
  },
  quitless72: {
    title: 'Quit with Less Than 72 Hours Notice',
    deadline: 'Within 72 Hours',
    description:
      'When an employee quits without giving 72 hours notice, you have up to 72 hours from the time of quitting to pay final wages.',
    color: 'yellow',
  },
  layoff: {
    title: 'Layoff (Group or Individual)',
    deadline: 'IMMEDIATELY - Same Day',
    description:
      'Layoffs are treated the same as involuntary termination. Final wages must be paid immediately on the last day of work.',
    color: 'red',
  },
};

export default function FinalWagePage() {
  const [selectedType, setSelectedType] = useState<TerminationType>('');
  const [lastDay, setLastDay] = useState<string>('');

  const calculateDeadline = (): string => {
    if (!lastDay || !selectedType) return '';

    const lastDate = new Date(lastDay + 'T12:00:00');

    if (selectedType === 'quitless72') {
      lastDate.setDate(lastDate.getDate() + 3);
    }

    return lastDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const rule = selectedType ? rules[selectedType] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/shield" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Final Wage Rules Guide</h1>
          <p className="text-gray-500">California final pay requirements by termination type</p>
        </div>
      </div>

      {/* Overview Card */}
      <div className="card bg-navy-gradient text-white">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-8 h-8 text-gold-500" />
          <h2 className="text-xl font-bold">California Final Pay Deadlines</h2>
        </div>
        <p className="text-white/80">
          California has some of the strictest final pay laws in the country. Missing these deadlines can
          result in &quot;waiting time penalties&quot; of up to 30 days of wages.
        </p>
      </div>

      {/* Rules Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(rules).map(([key, rule]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key as TerminationType)}
            className={`card text-left transition-all ${
              selectedType === key
                ? 'ring-2 ring-gold-500 border-gold-500'
                : 'hover:shadow-card-hover'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  rule.color === 'red'
                    ? 'bg-red-100'
                    : rule.color === 'yellow'
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
                }`}
              >
                <Clock
                  className={`w-5 h-5 ${
                    rule.color === 'red'
                      ? 'text-red-600'
                      : rule.color === 'yellow'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                />
              </div>
              <div>
                <h3 className="font-semibold text-navy-500">{rule.title}</h3>
                <p
                  className={`text-sm font-medium mt-1 ${
                    rule.color === 'red'
                      ? 'text-red-600'
                      : rule.color === 'yellow'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {rule.deadline}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Rule Details */}
      {rule && (
        <div className="card">
          <h3 className="text-lg font-semibold text-navy-500 mb-4">{rule.title}</h3>
          <p className="text-gray-600 mb-6">{rule.description}</p>

          {/* Deadline Calculator */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="font-medium text-navy-500 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gold-500" />
              Calculate Your Deadline
            </h4>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="input-label">Last Day Worked</label>
                <input
                  type="date"
                  value={lastDay}
                  onChange={(e) => setLastDay(e.target.value)}
                  className="input"
                />
              </div>
              {lastDay && (
                <div className="flex-1">
                  <label className="input-label">Payment Deadline</label>
                  <div
                    className={`p-3 rounded-lg font-medium ${
                      selectedType === 'quitless72'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedType === 'fired' || selectedType === 'layoff'
                      ? `${calculateDeadline()} (Same Day)`
                      : selectedType === 'quit72'
                      ? `${calculateDeadline()} (Last Day)`
                      : `By ${calculateDeadline()}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* What Must Be Included */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy-500 mb-4">What Must Be Included in Final Pay?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-navy-500">All wages earned</p>
              <p className="text-sm text-gray-500">Regular pay through last day worked</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-navy-500">Overtime pay</p>
              <p className="text-sm text-gray-500">Any OT from final pay period</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-navy-500">Accrued vacation/PTO</p>
              <p className="text-sm text-gray-500">CA requires payout - cannot forfeit</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-navy-500">Commissions earned</p>
              <p className="text-sm text-gray-500">Any earned but unpaid commissions</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-navy-500">Bonuses owed</p>
              <p className="text-sm text-gray-500">If already earned/promised</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-navy-500">Expense reimbursements</p>
              <p className="text-sm text-gray-500">Outstanding business expenses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning about deductions */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Deduction Warning</h3>
            <p className="text-red-700 text-sm mt-1">
              California law severely limits what you can deduct from final pay. You generally
              <strong> CANNOT </strong>
              deduct for damaged equipment, cash shortages, unreturned uniforms, or tools - even if
              the employee signed an agreement allowing it. Consult an attorney before making any
              deductions.
            </p>
          </div>
        </div>
      </div>

      {/* Penalty Info */}
      <div className="card bg-navy-50">
        <h3 className="text-lg font-semibold text-navy-500 mb-4">Waiting Time Penalties</h3>
        <p className="text-gray-600 mb-4">
          If you don&apos;t pay final wages on time, the employee is entitled to &quot;waiting time
          penalties&quot;:
        </p>
        <div className="bg-white p-4 rounded-lg">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-3xl font-bold text-red-600">30 days</span>
            <span className="text-gray-600">maximum penalty</span>
          </div>
          <p className="text-sm text-gray-600">
            <strong>Calculation:</strong> One day&apos;s wages for each day payment is late, up to 30
            days. For example, an employee earning $200/day whose pay is 10 days late could be owed
            $2,000 in penalties (in addition to wages).
          </p>
        </div>
        <Link href="/dashboard/shield/calculator" className="btn-secondary mt-4 inline-flex">
          Calculate Potential Penalty
        </Link>
      </div>
    </div>
  );
}
