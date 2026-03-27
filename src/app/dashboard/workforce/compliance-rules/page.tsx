'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  getEnabledStates,
  isRulesStale,
} from '@/lib/state-compliance';
import type { StateComplianceRules } from '@/lib/state-compliance';
import {
  ArrowLeft,
  Globe,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Shield,
  DollarSign,
  Coffee,
  FileText,
  Scale,
  Info,
} from 'lucide-react';

export default function ComplianceRulesPage() {
  const states = getEnabledStates();
  const [expandedState, setExpandedState] = useState<string | null>(null);

  const staleCount = states.filter(s => isRulesStale(s.stateCode)).length;

  const toggleState = (code: string) => {
    setExpandedState(prev => prev === code ? null : code);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workforce" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-500">State Compliance Rules</h1>
          <p className="text-gray-500 text-sm">
            Classification tests, wage rules, and break requirements by state
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <Globe className="w-6 h-6 text-navy-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-navy-500">{states.length}</p>
          <p className="text-sm text-gray-500">States Covered</p>
        </div>
        <div className="card text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{states.length - staleCount}</p>
          <p className="text-sm text-gray-500">Rules Current</p>
        </div>
        <div className="card text-center">
          <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-600">{staleCount}</p>
          <p className="text-sm text-gray-500">Need Review</p>
        </div>
      </div>

      {/* How Updates Work */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800">How Compliance Rules Stay Current</h3>
            <p className="text-blue-700 text-sm mt-1">
              Each state&apos;s rules include a <strong>last verified date</strong> and a link to the official
              state labor department. Rules are flagged for review every 6 months. When laws change
              (minimum wage increases, new classification tests, updated penalties), ToolTime pushes
              updates through the platform. You&apos;ll see a notification when rules for your state are updated.
            </p>
            <p className="text-blue-600 text-xs mt-2">
              Labor laws are complex. These rules cover the most common scenarios for trades contractors.
              Always consult an employment attorney for edge cases.
            </p>
          </div>
        </div>
      </div>

      {/* State Cards */}
      <div className="space-y-4">
        {states.map(state => {
          const isExpanded = expandedState === state.stateCode;
          const stale = isRulesStale(state.stateCode);

          return (
            <div key={state.stateCode} className="card overflow-hidden">
              {/* State Header */}
              <button
                onClick={() => toggleState(state.stateCode)}
                className="w-full flex items-center justify-between p-1 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-navy-gradient rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {state.stateCode}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-navy-500">{state.stateName}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-medium">{state.classification.testName}</span>
                      <span>|</span>
                      <span>Min Wage: ${state.wage.minimumWage.toFixed(2)}/hr</span>
                      <span>|</span>
                      <span className={stale ? 'text-yellow-600 font-medium' : 'text-green-600'}>
                        {stale ? 'Review needed' : 'Current'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {stale ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t mt-3 pt-4 space-y-6">
                  {/* Meta */}
                  <div className="flex items-center gap-6 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Last verified: {new Date(state.lastUpdated).toLocaleDateString()}
                    </span>
                    <span>Effective: {new Date(state.effectiveDate).toLocaleDateString()}</span>
                    <a
                      href={state.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gold-600 hover:text-gold-700 font-medium"
                    >
                      Official Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Classification Test */}
                  <div>
                    <h4 className="font-semibold text-navy-500 flex items-center gap-2 mb-2">
                      <Scale className="w-4 h-4" /> Classification Test: {state.classification.testName}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">{state.classification.description}</p>

                    <div className="space-y-2">
                      {state.classification.prongs.map(prong => (
                        <div key={prong.letter} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-800">
                            Prong {prong.letter}: {prong.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{prong.description}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <div className="bg-blue-50 rounded p-2">
                              <span className="font-medium text-blue-700">= Employee:</span>{' '}
                              <span className="text-blue-600">{prong.employeeAnswer}</span>
                            </div>
                            <div className="bg-orange-50 rounded p-2">
                              <span className="font-medium text-orange-700">= Contractor:</span>{' '}
                              <span className="text-orange-600">{prong.contractorAnswer}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-red-50 rounded-lg p-3 mt-2 text-xs text-red-700">
                      <strong>Penalties:</strong> {state.classification.penaltyRange}
                      {state.classification.notes && (
                        <p className="mt-1 text-red-600">{state.classification.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Wage Rules */}
                  <div>
                    <h4 className="font-semibold text-navy-500 flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4" /> Wage & Overtime Rules
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-navy-500">${state.wage.minimumWage.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Min Wage/hr</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-navy-500">{state.wage.overtimeMultiplier}x</p>
                        <p className="text-xs text-gray-500">
                          OT after {state.wage.overtimeThresholdDaily ? `${state.wage.overtimeThresholdDaily}h/day or ` : ''}{state.wage.overtimeThresholdWeekly}h/wk
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-navy-500">
                          {state.wage.doubleTimeMultiplier ? `${state.wage.doubleTimeMultiplier}x` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {state.wage.doubleTimeThresholdDaily ? `Double Time after ${state.wage.doubleTimeThresholdDaily}h/day` : 'No double time'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-navy-500">
                          {state.wage.tippedMinimumWage ? `$${state.wage.tippedMinimumWage.toFixed(2)}` : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">Tipped Min Wage</p>
                      </div>
                    </div>
                    {state.wage.localMinimumWageOverrides.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        <strong>Local overrides:</strong>{' '}
                        {state.wage.localMinimumWageOverrides.map(o => `${o.locality}: $${o.rate.toFixed(2)}`).join(' | ')}
                      </div>
                    )}
                  </div>

                  {/* Break Rules */}
                  <div>
                    <h4 className="font-semibold text-navy-500 flex items-center gap-2 mb-2">
                      <Coffee className="w-4 h-4" /> Break Requirements
                    </h4>
                    {!state.breaks.mealBreakRequired && !state.breaks.restBreakRequired ? (
                      <p className="text-sm text-gray-500 italic">
                        {state.stateName} does not require meal or rest breaks for adult employees.
                        However, providing breaks is still recommended as a best practice.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-lg p-3 ${state.breaks.mealBreakRequired ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
                          <p className="text-sm font-medium text-gray-700">Meal Break</p>
                          {state.breaks.mealBreakRequired ? (
                            <p className="text-xs text-gray-600 mt-1">
                              {state.breaks.mealBreakDurationMinutes} min after {state.breaks.mealBreakAfterHours} hours.
                              {state.breaks.breakWaiverAllowed && ' Waiver allowed under certain conditions.'}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">Not required</p>
                          )}
                        </div>
                        <div className={`rounded-lg p-3 ${state.breaks.restBreakRequired ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
                          <p className="text-sm font-medium text-gray-700">Rest Break</p>
                          {state.breaks.restBreakRequired ? (
                            <p className="text-xs text-gray-600 mt-1">
                              {state.breaks.restBreakDurationMinutes} min per {state.breaks.restBreakPerHours} hours
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">Not required</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contractor Rules */}
                  <div>
                    <h4 className="font-semibold text-navy-500 flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4" /> 1099 Contractor Requirements
                    </h4>
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        {state.contractor.w9Required ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-gray-200" />
                        )}
                        W-9 Required
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {state.contractor.writtenContractRequired ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-gray-200" />
                        )}
                        Written Contract
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {state.contractor.insuranceRequired ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-gray-200" />
                        )}
                        Insurance Required
                      </div>
                    </div>
                    <p className="text-xs text-gray-600"><strong>Licensing:</strong> {state.contractor.licensingNotes}</p>
                  </div>

                  {/* Final Pay */}
                  <div>
                    <h4 className="font-semibold text-navy-500 flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" /> Final Pay Deadlines
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Fired/Terminated</p>
                        <p className="font-medium text-gray-800">{state.finalPay.terminationDeadline}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Quit (with notice)</p>
                        <p className="font-medium text-gray-800">{state.finalPay.quitWithNoticeDeadline}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">Quit (no notice)</p>
                        <p className="font-medium text-gray-800">{state.finalPay.quitWithoutNoticeDeadline}</p>
                      </div>
                    </div>
                    {state.finalPay.waitingTimePenalty && (
                      <p className="text-xs text-red-600 mt-2">
                        Waiting time penalties apply for late final pay
                        {state.finalPay.waitingTimePenaltyMaxDays && ` (up to ${state.finalPay.waitingTimePenaltyMaxDays} days)`}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Coming Soon */}
      <div className="card bg-gray-50 text-center py-8">
        <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h3 className="font-medium text-gray-600">More States Coming Soon</h3>
        <p className="text-sm text-gray-400 mt-1">
          Currently covering CA, TX, FL, NY, and IL. Additional states are added based on customer demand.
        </p>
      </div>
    </div>
  );
}
