'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  CheckSquare,
  DollarSign,
  UserPlus,
  UserMinus,
  AlertTriangle,
  FileCheck,
  Users,
  ExternalLink,
  Search,
  Lock,
  Award,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Shield,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JennyExecChat from '@/components/jenny/JennyExecChat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Template {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  category: 'onboarding' | 'offboarding' | 'compliance' | 'forms';
  downloadUrl: string;
}

const templates: Template[] = [
  {
    id: 'new-hire-checklist',
    title: 'New Hire Checklist',
    description: 'Complete checklist for W-2 employees and 1099 contractors. Covers required forms, equipment, training, and first-day setup.',
    icon: CheckSquare,
    category: 'onboarding',
    downloadUrl: '/templates/new-hire-checklist.html',
  },
  {
    id: 'offer-letter',
    title: 'Offer Letter Template',
    description: 'California-compliant at-will employment offer letter. Includes compensation details, benefits overview, and required CA disclosures.',
    icon: FileText,
    category: 'onboarding',
    downloadUrl: '/templates/offer-letter.html',
  },
  {
    id: 'termination-checklist',
    title: 'Termination Checklist',
    description: 'Step-by-step checklist for employee separation. Covers final pay, benefits, equipment return, and exit procedures.',
    icon: UserMinus,
    category: 'offboarding',
    downloadUrl: '/templates/termination-checklist.html',
  },
  {
    id: 'final-pay-calculator',
    title: 'Final Pay Calculator',
    description: 'California final pay rules calculator. Determines payment timeline (same day vs 72 hours) based on termination type.',
    icon: DollarSign,
    category: 'offboarding',
    downloadUrl: '/templates/final-pay-calculator.html',
  },
  {
    id: 'wage-theft-notice',
    title: 'Wage Theft Prevention Notice',
    description: 'Required California DLSE Notice to Employee (Labor Code Section 2810.5). Must be provided at time of hire.',
    icon: AlertTriangle,
    category: 'compliance',
    downloadUrl: '/templates/wage-theft-notice.html',
  },
  {
    id: 'contractor-vs-employee',
    title: 'Contractor vs Employee Cheat Sheet',
    description: 'Quick reference guide for AB5 classification. Includes ABC test criteria and common scenarios for service businesses.',
    icon: Users,
    category: 'compliance',
    downloadUrl: '/templates/contractor-vs-employee.html',
  },
  {
    id: 'i9-w4-links',
    title: 'I-9 & W-4 Form Links',
    description: 'Direct links to official I-9, W-4, and California DE-4 forms with completion instructions and employer requirements.',
    icon: FileCheck,
    category: 'forms',
    downloadUrl: '/templates/i9-w4-links.html',
  },
];

const categories = [
  { id: 'all', label: 'All Templates' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'offboarding', label: 'Offboarding' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'forms', label: 'Forms' },
];

type TabId = 'templates' | 'documents' | 'onboarding';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'documents', label: 'Employee Documents', icon: Award },
  { id: 'onboarding', label: 'Onboarding Checklists', icon: CheckSquare },
];

// Required documents with tracking
interface DocRequirement {
  id: string;
  name: string;
  requiredFor: string;
  renewalPeriod: string;
  category: 'identity' | 'tax' | 'license' | 'safety' | 'insurance';
}

const DOC_REQUIREMENTS: DocRequirement[] = [
  { id: 'i9', name: 'I-9 Employment Verification', requiredFor: 'All Employees', renewalPeriod: 'At hire', category: 'identity' },
  { id: 'w4', name: 'W-4 Tax Withholding', requiredFor: 'W-2 Employees', renewalPeriod: 'Annually', category: 'tax' },
  { id: 'w9', name: 'W-9 Tax Form', requiredFor: '1099 Contractors', renewalPeriod: 'At hire', category: 'tax' },
  { id: 'drivers_license', name: "Driver's License", requiredFor: 'Field Workers', renewalPeriod: 'Per state rules', category: 'license' },
  { id: 'osha_cert', name: 'OSHA 10/30 Certification', requiredFor: 'Construction Workers', renewalPeriod: 'No expiry', category: 'safety' },
  { id: 'trade_license', name: 'Trade License / Journeyman Card', requiredFor: 'Licensed Trades', renewalPeriod: 'Per state rules', category: 'license' },
  { id: 'vehicle_insurance', name: 'Vehicle Insurance', requiredFor: 'Company Vehicle Users', renewalPeriod: 'Annually', category: 'insurance' },
  { id: 'workers_comp', name: "Workers' Comp Certificate", requiredFor: '1099 Contractors', renewalPeriod: 'Annually', category: 'insurance' },
  { id: 'harassment_training', name: 'Sexual Harassment Training (CA SB 1343)', requiredFor: 'CA Employees', renewalPeriod: 'Every 2 years', category: 'safety' },
  { id: 'heat_illness', name: 'Heat Illness Prevention Training', requiredFor: 'Outdoor Workers', renewalPeriod: 'Annually', category: 'safety' },
  { id: 'first_aid', name: 'First Aid / CPR Certification', requiredFor: 'Field Workers (recommended)', renewalPeriod: 'Every 2 years', category: 'safety' },
];

interface WorkerDoc {
  worker_id: string;
  worker_name: string;
  worker_role: string;
  classification: string | null;
  insurance_expiry: string | null;
  w9_received: boolean;
  insurance_verified: boolean;
}

interface OnboardingTask {
  id: string;
  label: string;
  description: string;
}

const ONBOARDING_TASKS: OnboardingTask[] = [
  { id: 'account_created', label: 'Account Created', description: 'Team member added to ToolTime Pro with login credentials' },
  { id: 'classification', label: 'Worker Classified', description: 'Classified as W-2 employee or 1099 contractor' },
  { id: 'forms_collected', label: 'Tax Forms Collected', description: 'W-4 (employee) or W-9 (contractor) on file' },
  { id: 'i9_verified', label: 'I-9 Verified', description: 'Employment eligibility verified within 3 business days of hire' },
  { id: 'wage_notice', label: 'Wage Notice Provided', description: 'CA Wage Theft Prevention Notice provided at time of hire' },
  { id: 'handbook_signed', label: 'Handbook Acknowledged', description: 'Employee handbook and policies acknowledged' },
  { id: 'safety_training', label: 'Safety Training Completed', description: 'OSHA, heat illness, and job-specific safety training' },
  { id: 'harassment_training', label: 'Harassment Training', description: 'CA SB 1343 compliant harassment prevention training' },
  { id: 'equipment_issued', label: 'Equipment Issued', description: 'Tools, vehicle keys, uniforms, PPE issued and documented' },
  { id: 'app_setup', label: 'Worker App Setup', description: 'ToolTime worker app installed, clock-in tested' },
];

export default function HRToolkitPage() {
  const { dbUser, company } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('templates');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [workerDocs, setWorkerDocs] = useState<WorkerDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const isOwner = dbUser?.role === 'owner';
  const isBetaTester = !!company?.is_beta_tester;
  const hasJennyExec = (company?.addons || []).includes('jenny_exec_admin');
  const hasAccess = isOwner && (isBetaTester || hasJennyExec);

  const fetchWorkerDocs = useCallback(async () => {
    if (!company?.id) return;
    setDocsLoading(true);
    try {
      // Fetch team members
      const { data: workers } = await supabase
        .from('users')
        .select('id, full_name, role, is_active')
        .eq('company_id', company.id)
        .in('role', ['worker', 'worker_admin'])
        .eq('is_active', true)
        .order('full_name');

      // Fetch workforce profiles for classification data
      const { data: profiles } = await supabase
        .from('workforce_profiles')
        .select('user_id, classification, w9_received, insurance_verified, insurance_expiry')
        .eq('company_id', company.id);

      const profileMap = new Map(
        (profiles || []).map((p: { user_id: string; classification: string | null; w9_received: boolean; insurance_verified: boolean; insurance_expiry: string | null }) => [p.user_id, p])
      );

      const docs: WorkerDoc[] = (workers || []).map((w: { id: string; full_name: string; role: string }) => {
        const profile = profileMap.get(w.id);
        return {
          worker_id: w.id,
          worker_name: w.full_name,
          worker_role: w.role,
          classification: profile?.classification || null,
          insurance_expiry: profile?.insurance_expiry || null,
          w9_received: profile?.w9_received || false,
          insurance_verified: profile?.insurance_verified || false,
        };
      });

      setWorkerDocs(docs);
    } catch (err) {
      console.error('Error fetching worker docs:', err);
    } finally {
      setDocsLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    if (hasAccess && activeTab === 'documents') {
      fetchWorkerDocs();
    }
  }, [hasAccess, activeTab, fetchWorkerDocs]);

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDownload = (template: Template) => {
    window.open(template.downloadUrl, '_blank');
  };

  // Calculate document compliance stats
  const expiringDocs = workerDocs.filter((w) => {
    if (!w.insurance_expiry) return false;
    const expiry = new Date(w.insurance_expiry);
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
    return expiry <= thirtyDaysOut && expiry > new Date();
  });

  const expiredDocs = workerDocs.filter((w) => {
    if (!w.insurance_expiry) return false;
    return new Date(w.insurance_expiry) < new Date();
  });

  const missingW9 = workerDocs.filter(
    (w) => w.classification === '1099_contractor' && !w.w9_received
  );

  const unclassified = workerDocs.filter((w) => !w.classification);

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Jenny Exec Admin Feature</h1>
          <p className="text-gray-500 mb-6">
            The HR Toolkit is part of Jenny Exec Admin — available to business owners
            for $79/mo. Get HR templates, compliance documents, and workforce management tools.
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">HR Toolkit</h1>
          <p className="text-gray-500 mt-1">
            Templates, employee document tracking, and onboarding checklists
          </p>
        </div>
        <Link
          href="/dashboard/workforce/onboard"
          className="btn-primary flex items-center gap-2 w-fit"
        >
          <UserPlus size={18} />
          Onboard Worker
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="card">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeCategory === category.id
                        ? 'bg-navy-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="card-hover group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gold-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gold-100 transition-colors">
                    <template.icon className="w-6 h-6 text-gold-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-navy-500 group-hover:text-gold-600 transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-3">{template.description}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="badge-gold capitalize">{template.category}</span>
                  <button
                    onClick={() => handleDownload(template)}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    <Download size={16} className="mr-1.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="card text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No templates found</h3>
              <p className="text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Quick Links */}
          <div className="card bg-navy-500">
            <h2 className="text-lg font-semibold text-white mb-4">Official Government Forms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="https://www.uscis.gov/i-9"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <FileCheck size={20} />
                <span>Form I-9</span>
                <ExternalLink size={14} className="ml-auto opacity-50" />
              </a>
              <a
                href="https://www.irs.gov/forms-pubs/about-form-w-4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <FileCheck size={20} />
                <span>Form W-4</span>
                <ExternalLink size={14} className="ml-auto opacity-50" />
              </a>
              <a
                href="https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de4.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <FileCheck size={20} />
                <span>CA Form DE-4</span>
                <ExternalLink size={14} className="ml-auto opacity-50" />
              </a>
              <a
                href="https://www.dir.ca.gov/dlse/lc2810.5notice.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
              >
                <FileCheck size={20} />
                <span>Wage Notice</span>
                <ExternalLink size={14} className="ml-auto opacity-50" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Employee Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Alert Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="stat-value text-red-600">{expiredDocs.length}</p>
                  <p className="stat-label">Expired</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="stat-value text-amber-600">{expiringDocs.length}</p>
                  <p className="stat-label">Expiring Soon</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="stat-value text-orange-600">{missingW9.length}</p>
                  <p className="stat-label">Missing W-9</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="stat-value text-gray-600">{unclassified.length}</p>
                  <p className="stat-label">Not Classified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Document Status Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-500 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Employee Document Status
              </h2>
              <button
                onClick={fetchWorkerDocs}
                className="btn-ghost text-sm"
                disabled={docsLoading}
              >
                {docsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {docsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : workerDocs.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No active workers</p>
                <p className="text-gray-400 text-sm mt-1">Add team members to start tracking documents</p>
                <Link href="/dashboard/team" className="text-gold-600 hover:text-gold-700 text-sm font-medium mt-3 inline-block">
                  Go to Team Management
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="table-header">Worker</th>
                      <th className="table-header">Classification</th>
                      <th className="table-header">W-9</th>
                      <th className="table-header">Insurance</th>
                      <th className="table-header">Insurance Expiry</th>
                      <th className="table-header">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workerDocs.map((worker) => {
                      const isExpired = worker.insurance_expiry && new Date(worker.insurance_expiry) < new Date();
                      const isExpiringSoon = worker.insurance_expiry && !isExpired &&
                        new Date(worker.insurance_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                      return (
                        <tr key={worker.worker_id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <div>
                              <p className="font-medium text-navy-500">{worker.worker_name}</p>
                              <p className="text-xs text-gray-400 capitalize">{worker.worker_role.replace('_', ' ')}</p>
                            </div>
                          </td>
                          <td className="table-cell">
                            {worker.classification ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                worker.classification === 'w2_employee'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {worker.classification === 'w2_employee' ? 'W-2' : '1099'}
                              </span>
                            ) : (
                              <span className="badge-warning">Not classified</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {worker.classification === '1099_contractor' ? (
                              worker.w9_received ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )
                            ) : (
                              <span className="text-gray-300">N/A</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {worker.insurance_verified ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            {worker.insurance_expiry ? (
                              <span className={`text-sm font-medium ${
                                isExpired ? 'text-red-600' :
                                isExpiringSoon ? 'text-amber-600' :
                                'text-gray-600'
                              }`}>
                                {isExpired && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                                {isExpiringSoon && <Clock className="w-4 h-4 inline mr-1" />}
                                {new Date(worker.insurance_expiry).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <Link
                              href={`/dashboard/workforce/onboard?edit=${worker.worker_id}`}
                              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                            >
                              Edit <ChevronRight size={14} />
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

          {/* Document Requirements Reference */}
          <div className="card">
            <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Required Documents Reference
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Documents you should collect and track for each worker type. Use the onboarding workflow to collect these systematically.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Document</th>
                    <th className="table-header">Required For</th>
                    <th className="table-header">Renewal</th>
                    <th className="table-header">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {DOC_REQUIREMENTS.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{doc.name}</td>
                      <td className="table-cell text-gray-500">{doc.requiredFor}</td>
                      <td className="table-cell text-gray-500">{doc.renewalPeriod}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          doc.category === 'identity' ? 'bg-blue-100 text-blue-700' :
                          doc.category === 'tax' ? 'bg-green-100 text-green-700' :
                          doc.category === 'license' ? 'bg-purple-100 text-purple-700' :
                          doc.category === 'safety' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {doc.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Checklists Tab */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {/* Onboarding Checklist */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-navy-500 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-purple-500" />
                  New Hire Onboarding Checklist
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Complete these steps for every new team member to ensure compliance
                </p>
              </div>
              <Link
                href="/dashboard/workforce/onboard"
                className="btn-primary text-sm flex items-center gap-2"
              >
                <UserPlus size={16} />
                Start Onboarding
              </Link>
            </div>

            <div className="space-y-3">
              {ONBOARDING_TASKS.map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-purple-200 transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-600">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-navy-500">{task.label}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                  </div>
                  {i < 3 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Required</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Workers Pending Onboarding */}
          {unclassified.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <h2 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Workers Pending Classification ({unclassified.length})
              </h2>
              <p className="text-sm text-amber-700 mb-4">
                These workers have not been classified as W-2 or 1099. Classify them to set up proper compliance tracking.
              </p>
              <div className="space-y-2">
                {unclassified.map((worker) => (
                  <div key={worker.worker_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200">
                    <div>
                      <p className="font-medium text-gray-900">{worker.worker_name}</p>
                      <p className="text-xs text-gray-500 capitalize">{worker.worker_role.replace('_', ' ')}</p>
                    </div>
                    <Link
                      href={`/dashboard/workforce/onboard?edit=${worker.worker_id}`}
                      className="btn-primary text-sm px-3 py-1.5"
                    >
                      Classify Now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offboarding Checklist */}
          <div className="card">
            <h2 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-500" />
              Offboarding Checklist
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Steps to complete when a team member leaves the company
            </p>
            <div className="space-y-2">
              {[
                { label: 'Deactivate Account', desc: 'Remove access to ToolTime Pro and worker app' },
                { label: 'Final Pay Calculation', desc: 'CA law: same day (fired) or 72 hours (quit). Use Final Pay Calculator template.' },
                { label: 'Collect Equipment', desc: 'Tools, vehicle keys, uniforms, company phone/tablet, PPE' },
                { label: 'Update Insurance', desc: 'Remove from workers comp policy, update vehicle insurance' },
                { label: 'COBRA Notice', desc: 'Send COBRA continuation notice if applicable (20+ employees)' },
                { label: 'Exit Documentation', desc: 'Separation letter, reason for termination, signed acknowledgment' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700 text-sm">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Jenny AI HR Advisor - always visible */}
      <JennyExecChat mode="hr" inline />
    </div>
    </DashboardLayout>
  );
}
