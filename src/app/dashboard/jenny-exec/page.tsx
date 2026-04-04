'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Users,
  TrendingUp,
  Brain,
  Lock,
  AlertTriangle,
  FileText,
  DollarSign,
  Briefcase,
  UserCheck,
  BarChart3,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JennyExecChat from '@/components/jenny/JennyExecChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Tab = 'compliance' | 'hr' | 'insights';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string; size?: number }>; color: string; bgColor: string }[] = [
  { id: 'compliance', label: 'Compliance', icon: Shield, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 'hr', label: 'HR', icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 'insights', label: 'Business Insights', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-50' },
];

interface InsightsData {
  monthlyRevenue: number;
  jobsCompleted: number;
  avgJobValue: number;
  activeWorkers: number;
}

export default function JennyExecDashboard() {
  const { dbUser, company } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('compliance');
  const [insights, setInsights] = useState<InsightsData>({ monthlyRevenue: 0, jobsCompleted: 0, avgJobValue: 0, activeWorkers: 0 });
  const [insightsLoading, setInsightsLoading] = useState(false);

  const isOwner = dbUser?.role === 'owner';
  const isBetaTester = !!company?.is_beta_tester;
  const hasJennyExec = (company?.addons || []).includes('jenny_exec_admin');
  const hasAccess = isOwner && (isBetaTester || hasJennyExec);

  useEffect(() => {
    if (!hasAccess || !company?.id || activeTab !== 'insights') return;

    const fetchInsights = async () => {
      setInsightsLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        // Monthly revenue from paid invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total')
          .eq('company_id', company.id)
          .eq('status', 'paid')
          .gte('created_at', startOfMonth);

        const revenue = (invoices || []).reduce((sum: number, inv: { total: number }) => sum + (inv.total || 0), 0);

        // Jobs completed this month
        const { count: jobCount } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('status', 'completed')
          .gte('created_at', startOfMonth);

        // Active workers
        const { count: workerCount } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .in('role', ['worker', 'worker_admin'])
          .eq('is_active', true);

        const jobs = jobCount || 0;
        setInsights({
          monthlyRevenue: revenue,
          jobsCompleted: jobs,
          avgJobValue: jobs > 0 ? revenue / jobs : 0,
          activeWorkers: workerCount || 0,
        });
      } catch (err) {
        console.error('Error fetching insights:', err);
      } finally {
        setInsightsLoading(false);
      }
    };

    fetchInsights();
  }, [hasAccess, company?.id, activeTab]);

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Jenny Exec Admin</h1>
          <p className="text-gray-500 mb-6">
            Your AI-powered executive assistant for compliance, HR, and business insights.
            Available to business owners for $79/mo.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors no-underline"
          >
            View Plans & Add-ons
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-navy-500 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-green-500 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            Jenny Exec Admin
          </h1>
          <p className="text-gray-500 mt-1">
            AI-powered compliance advisor, HR guidance, and business intelligence
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? `${tab.color} border-current`
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Access Cards */}
              <Link
                href="/dashboard/compliance"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-blue-600 transition-colors">
                    CA Compliance Dashboard
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Monitor meal/rest break violations, overtime alerts, and attestations
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 mt-1" />
              </Link>

              <Link
                href="/dashboard/workforce/compliance-rules"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-blue-600 transition-colors">
                    Compliance Rules
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure state-specific labor law rules and alert thresholds
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 mt-1" />
              </Link>

              <Link
                href="/dashboard/time-logs"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-blue-600 transition-colors">
                    Time Logs & Attestations
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Review worker time entries and break attestation records
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 mt-1" />
              </Link>
            </div>

            {/* Jenny Compliance Chat */}
            <JennyExecChat mode="compliance" inline />
          </div>
        )}

        {/* HR Tab */}
        {activeTab === 'hr' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link
                href="/dashboard/hr-toolkit"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-purple-600 transition-colors">
                    HR Templates & Documents
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Download checklists, offer letters, compliance forms, and more
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-500 mt-1" />
              </Link>

              <Link
                href="/dashboard/workforce/onboard"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-purple-600 transition-colors">
                    Employee Onboarding
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage onboarding workflows, certifications, and document collection
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-500 mt-1" />
              </Link>

              <Link
                href="/dashboard/workforce/guardrails"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-purple-600 transition-colors">
                    Safety & Guardrails
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Configure safety rules, checklists, and worker guardrails
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-purple-500 mt-1" />
              </Link>
            </div>

            {/* Employee Document Tracker */}
            <div className="card">
              <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" />
                Employee Document Tracker
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Track certifications, licenses, and required documents for your team members.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Document</th>
                      <th className="table-header">Required For</th>
                      <th className="table-header">Renewal</th>
                      <th className="table-header">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { doc: 'I-9 Employment Verification', required: 'All Employees', renewal: 'At hire', status: 'required' },
                      { doc: 'W-4 Tax Withholding', required: 'W-2 Employees', renewal: 'Annually', status: 'required' },
                      { doc: "Driver's License", required: 'Field Workers', renewal: 'Per state rules', status: 'track' },
                      { doc: 'OSHA 10/30 Certification', required: 'Construction', renewal: 'No expiry', status: 'track' },
                      { doc: 'Trade License/Journeyman', required: 'Licensed Trades', renewal: 'Per state rules', status: 'track' },
                      { doc: 'Vehicle Insurance', required: 'Company Vehicles', renewal: 'Annually', status: 'track' },
                      { doc: 'Workers Comp Certificate', required: '1099 Contractors', renewal: 'Annually', status: 'required' },
                      { doc: 'Sexual Harassment Training', required: 'CA Employees', renewal: 'Every 2 years', status: 'required' },
                    ].map((row) => (
                      <tr key={row.doc} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">{row.doc}</td>
                        <td className="table-cell text-gray-500">{row.required}</td>
                        <td className="table-cell text-gray-500">{row.renewal}</td>
                        <td className="table-cell">
                          {row.status === 'required' ? (
                            <span className="badge-danger">Required</span>
                          ) : (
                            <span className="badge-info">Track</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Jenny HR Chat */}
            <JennyExecChat mode="hr" inline />
          </div>
        )}

        {/* Business Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="stat-value text-green-600">
                      {insightsLoading ? '...' : `$${insights.monthlyRevenue.toLocaleString()}`}
                    </p>
                    <p className="stat-label">Monthly Revenue</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="stat-value text-blue-600">
                      {insightsLoading ? '...' : insights.jobsCompleted}
                    </p>
                    <p className="stat-label">Jobs Completed</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="stat-value text-amber-600">
                      {insightsLoading ? '...' : `$${Math.round(insights.avgJobValue).toLocaleString()}`}
                    </p>
                    <p className="stat-label">Avg Job Value</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="stat-value text-purple-600">
                      {insightsLoading ? '...' : insights.activeWorkers}
                    </p>
                    <p className="stat-label">Active Workers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Link
                href="/dashboard/workforce/payments"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-green-600 transition-colors">
                    Payroll & Payments
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Track worker payments, overtime costs, and payroll summaries
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-green-500 mt-1" />
              </Link>

              <Link
                href="/dashboard/invoices"
                className="card-hover group flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-navy-500 group-hover:text-green-600 transition-colors">
                    Revenue & Invoices
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Review invoicing trends, payment status, and cash flow
                  </p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-green-500 mt-1" />
              </Link>
            </div>

            {/* Jenny Insights Chat */}
            <JennyExecChat mode="insights" inline />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
