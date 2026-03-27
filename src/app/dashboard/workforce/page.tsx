'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWorkforce } from '@/hooks/useWorkforce';
import {
  Users,
  UserCheck,
  FileText,
  Shield,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  DollarSign,
  ClipboardCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
} from 'lucide-react';

export default function WorkforcePage() {
  const { profiles, guardrails, stats, isLoading } = useWorkforce();
  const [filter, setFilter] = useState<'all' | 'w2' | '1099'>('all');

  const filteredProfiles = profiles.filter(p => {
    if (filter === 'w2') return p.classification === 'w2_employee';
    if (filter === '1099') return p.classification === '1099_contractor';
    return true;
  });

  const tools = [
    {
      id: 'onboard',
      title: 'Classify & Onboard Worker',
      description: 'Run the ABC test and set up a new worker as W-2 employee or 1099 contractor with the right compliance profile.',
      icon: UserCheck,
      href: '/dashboard/workforce/onboard',
      color: 'bg-blue-500',
    },
    {
      id: 'guardrails',
      title: 'Compliance Guardrails',
      description: 'Auto-detect when 1099 contractors are being treated like employees. Prevent misclassification before it becomes a lawsuit.',
      icon: Shield,
      href: '/dashboard/workforce/guardrails',
      color: 'bg-red-500',
      badge: stats.activeGuardrails > 0 ? stats.activeGuardrails : undefined,
    },
    {
      id: 'payments',
      title: 'Blended Payments',
      description: 'Separate payment flows: payroll tracking for W-2 employees, invoice management for 1099 contractors. All in one view.',
      icon: DollarSign,
      href: '/dashboard/workforce/payments',
      color: 'bg-green-500',
    },
    {
      id: 'compliance-rules',
      title: 'State Compliance Rules',
      description: 'Classification tests, wage rules, break requirements, and contractor laws for CA, TX, FL, NY, and IL — with last-verified dates.',
      icon: Globe,
      href: '/dashboard/workforce/compliance-rules',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-navy-gradient rounded-2xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gold-500 rounded-xl flex items-center justify-center">
            <Users className="w-8 h-8 text-navy-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Blended Workforce Management</h1>
            <p className="text-white/70">W-2 Employees + 1099 Contractors in One Place</p>
          </div>
        </div>
        <p className="text-white/80 max-w-2xl">
          Manage your mixed workforce with confidence. Separate workflows for employees and contractors,
          automatic compliance guardrails, and different payment flows — all while staying compliant
          with California labor law.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Users className="w-5 h-5 text-navy-500" />
          </div>
          <p className="text-2xl font-bold text-navy-500">{isLoading ? '...' : stats.totalWorkers}</p>
          <p className="text-sm text-gray-500">Total Workers</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{isLoading ? '...' : stats.w2Count}</p>
          <p className="text-sm text-gray-500">W-2 Employees</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{isLoading ? '...' : stats.contractorCount}</p>
          <p className="text-sm text-gray-500">1099 Contractors</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{isLoading ? '...' : stats.violationCount}</p>
          <p className="text-sm text-gray-500">Violations</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{isLoading ? '...' : stats.reviewsDue}</p>
          <p className="text-sm text-gray-500">Reviews Due</p>
        </div>
      </div>

      {/* Active Guardrails Banner */}
      {stats.activeGuardrails > 0 && (
        <Link href="/dashboard/workforce/guardrails" className="block">
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 hover:bg-red-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800">
                    {stats.violationCount > 0
                      ? `${stats.violationCount} Compliance Violation${stats.violationCount > 1 ? 's' : ''} Detected`
                      : `${stats.warningCount} Compliance Warning${stats.warningCount > 1 ? 's' : ''}`
                    }
                  </h3>
                  <p className="text-red-700 text-sm mt-1">
                    {stats.missingW9Count > 0 && `${stats.missingW9Count} missing W-9 form${stats.missingW9Count > 1 ? 's' : ''}. `}
                    {stats.expiredInsuranceCount > 0 && `${stats.expiredInsuranceCount} expired insurance. `}
                    Review and resolve these issues to stay compliant.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </Link>
      )}

      {/* Tools Grid */}
      <div>
        <h2 className="text-lg font-semibold text-navy-500 mb-4">Workforce Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <Link key={tool.id} href={tool.href} className="card-hover group">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 ${tool.color} rounded-lg flex items-center justify-center flex-shrink-0 relative`}>
                  <tool.icon className="w-6 h-6 text-white" />
                  {'badge' in tool && tool.badge && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-gold-600 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Worker Roster */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-navy-500">Worker Roster</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({stats.totalWorkers})
            </button>
            <button
              onClick={() => setFilter('w2')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === 'w2' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              W-2 ({stats.w2Count})
            </button>
            <button
              onClick={() => setFilter('1099')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === '1099' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              1099 ({stats.contractorCount})
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading workforce data...</div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {stats.totalWorkers === 0 ? 'No Workers Classified Yet' : 'No Workers Match Filter'}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {stats.totalWorkers === 0
                ? 'Start by classifying your team members as W-2 employees or 1099 contractors.'
                : 'Try a different filter to see more workers.'}
            </p>
            {stats.totalWorkers === 0 && (
              <Link
                href="/dashboard/workforce/onboard"
                className="btn-primary inline-flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Classify First Worker
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Worker</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Compliance</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Next Review</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((profile) => {
                  const isW2 = profile.classification === 'w2_employee';
                  const workerGuardrails = guardrails.filter(g => g.worker_id === profile.user_id);
                  const hasViolation = workerGuardrails.some(g => g.severity === 'violation');
                  const hasWarning = workerGuardrails.some(g => g.severity === 'warning');
                  const reviewDue = profile.next_review_date && new Date(profile.next_review_date) <= new Date();
                  const rate = isW2 ? profile.hourly_rate : profile.contractor_rate;
                  const rateLabel = isW2 ? '/hr' : `/${profile.contractor_rate_type || 'hr'}`;

                  return (
                    <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {profile.user?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{profile.user?.email}</p>
                          {!isW2 && profile.business_name && (
                            <p className="text-xs text-orange-600">{profile.business_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          isW2
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {isW2 ? (
                            <><Briefcase className="w-3 h-3" /> W-2</>
                          ) : (
                            <><FileText className="w-3 h-3" /> 1099</>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {rate ? (
                          <span className="text-sm font-medium text-gray-700">
                            ${rate.toFixed(2)}{rateLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {hasViolation ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <AlertCircle className="w-3.5 h-3.5" /> Violation
                          </span>
                        ) : hasWarning ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600">
                            <AlertTriangle className="w-3.5 h-3.5" /> Warning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" /> Compliant
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {profile.next_review_date ? (
                          <span className={`text-sm ${reviewDue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {new Date(profile.next_review_date).toLocaleDateString()}
                            {reviewDue && ' (overdue)'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/dashboard/workforce/onboard?edit=${profile.user_id}`}
                          className="text-sm text-gold-600 hover:text-gold-700 font-medium"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Key Differences Section */}
      <div className="card bg-gray-50">
        <h2 className="text-lg font-semibold text-navy-500 mb-4">W-2 vs 1099: What Changes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-blue-700">W-2 Employees</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Time tracking with overtime & break compliance
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Payroll-ready hours with OT/DT calculations
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Meal & rest break alerts (CA compliant)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Set schedules and dispatch to jobs
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Final wage deadline tracking
              </li>
            </ul>
          </div>
          <div className="bg-white rounded-xl p-5 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-orange-700">1099 Contractors</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                Simple time logging (no overtime/break rules)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                Invoice-based payment with Net 15/30 terms
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                W-9 & insurance tracking with expiry alerts
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                Misclassification guardrails (auto-detect risks)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                1099-NEC ready reporting at year-end
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Why This Matters */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <TrendingUp className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">Why Blended Workforce Management Matters</h3>
            <p className="text-yellow-700 text-sm mt-1">
              In California, misclassifying even one worker as a 1099 contractor when they should be W-2
              can result in penalties of <strong>$5,000-$25,000 per violation</strong>, plus back taxes,
              overtime, benefits, and potential PAGA lawsuits. ToolTime Shield monitors your workforce
              automatically and alerts you before a mistake becomes a lawsuit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
