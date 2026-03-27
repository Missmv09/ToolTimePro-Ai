'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkforce } from '@/hooks/useWorkforce';
import type { WorkerClassification } from '@/types/workforce';
import { getStateRules } from '@/lib/state-compliance';
import type { StateComplianceRules } from '@/lib/state-compliance';
import {
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Briefcase,
  FileText,
  CheckCircle,
  AlertTriangle,
  Shield,
  Save,
  Users,
  Globe,
} from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
}

type Step = 'select_worker' | 'classify' | 'profile_details' | 'review';

export default function OnboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editUserId = searchParams.get('edit');
  const { company, dbUser } = useAuth();
  const { profiles, saveWorkerProfile } = useWorkforce();

  const [step, setStep] = useState<Step>(editUserId ? 'classify' : 'select_worker');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<TeamMember | null>(null);
  const [classification, setClassification] = useState<WorkerClassification | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State-specific compliance rules
  const companyState = company?.state || 'CA';
  const stateRules = getStateRules(companyState);
  const minWage = stateRules?.wage.minimumWage || 7.25;
  const classificationTest = stateRules?.classification || null;

  // W-2 fields
  const [hourlyRate, setHourlyRate] = useState('');
  const [overtimeEligible, setOvertimeEligible] = useState(true);
  const [payFrequency, setPayFrequency] = useState<'weekly' | 'biweekly' | 'semimonthly' | 'monthly'>('biweekly');

  // 1099 fields
  const [businessName, setBusinessName] = useState('');
  const [contractorRate, setContractorRate] = useState('');
  const [contractorRateType, setContractorRateType] = useState<'hourly' | 'per_job' | 'daily'>('hourly');
  const [paymentMethod, setPaymentMethod] = useState<'invoice' | 'direct_deposit' | 'check'>('invoice');
  const [paymentTerms, setPaymentTerms] = useState('30');
  const [w9Received, setW9Received] = useState(false);
  const [insuranceVerified, setInsuranceVerified] = useState(false);
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [contractStartDate, setContractStartDate] = useState('');

  // Fetch team members
  useEffect(() => {
    async function fetchTeam() {
      if (!company?.id) return;
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role, is_active')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .in('role', ['worker', 'worker_admin'])
        .order('full_name');
      setTeamMembers((data || []) as TeamMember[]);

      // If editing, pre-select the worker
      if (editUserId && data) {
        const worker = data.find((m: TeamMember) => m.id === editUserId);
        if (worker) {
          setSelectedWorker(worker as TeamMember);
          // Load existing profile
          const existing = profiles.find(p => p.user_id === editUserId);
          if (existing) {
            setClassification(existing.classification);
            if (existing.classification === 'w2_employee') {
              setHourlyRate(existing.hourly_rate?.toString() || '');
              setOvertimeEligible(existing.overtime_eligible);
              setPayFrequency(existing.pay_frequency || 'biweekly');
            } else {
              setBusinessName(existing.business_name || '');
              setContractorRate(existing.contractor_rate?.toString() || '');
              setContractorRateType(existing.contractor_rate_type || 'hourly');
              setPaymentMethod(existing.payment_method || 'invoice');
              setPaymentTerms(existing.payment_terms_days?.toString() || '30');
              setW9Received(existing.w9_received);
              setInsuranceVerified(existing.insurance_verified);
              setInsuranceExpiry(existing.insurance_expiry?.split('T')[0] || '');
              setLicenseNumber(existing.license_number || '');
              setContractStartDate(existing.contract_start_date?.split('T')[0] || '');
            }
          }
        }
      }
    }
    fetchTeam();
  }, [company?.id, editUserId, profiles]);

  const alreadyClassified = (workerId: string) =>
    profiles.some(p => p.user_id === workerId);

  const handleSave = async () => {
    if (!selectedWorker || !classification) return;
    setSaving(true);
    setError(null);

    const profileData: Record<string, unknown> = {};

    if (classification === 'w2_employee') {
      profileData.hourly_rate = hourlyRate ? parseFloat(hourlyRate) : null;
      profileData.overtime_eligible = overtimeEligible;
      profileData.pay_frequency = payFrequency;
      profileData.classification_method = 'manual';
      // Clear 1099 fields
      profileData.business_name = null;
      profileData.contractor_rate = null;
      profileData.contractor_rate_type = null;
      profileData.payment_method = null;
    } else {
      profileData.business_name = businessName || null;
      profileData.contractor_rate = contractorRate ? parseFloat(contractorRate) : null;
      profileData.contractor_rate_type = contractorRateType;
      profileData.payment_method = paymentMethod;
      profileData.payment_terms_days = parseInt(paymentTerms) || 30;
      profileData.w9_received = w9Received;
      profileData.w9_received_date = w9Received ? new Date().toISOString() : null;
      profileData.insurance_verified = insuranceVerified;
      profileData.insurance_expiry = insuranceExpiry ? new Date(insuranceExpiry).toISOString() : null;
      profileData.license_number = licenseNumber || null;
      profileData.contract_start_date = contractStartDate ? new Date(contractStartDate).toISOString() : null;
      profileData.classification_method = 'manual';
      profileData.overtime_eligible = false;
      // Clear W-2 fields
      profileData.hourly_rate = null;
      profileData.pay_frequency = null;
    }

    const result = await saveWorkerProfile(selectedWorker.id, classification, profileData);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/dashboard/workforce');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workforce" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-500">
            {editUserId ? 'Edit Worker Classification' : 'Classify & Onboard Worker'}
          </h1>
          <p className="text-gray-500 text-sm">
            Set up a worker as W-2 employee or 1099 contractor with the right compliance profile.
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {(['select_worker', 'classify', 'profile_details', 'review'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-gold-500 text-navy-500' :
              ['select_worker', 'classify', 'profile_details', 'review'].indexOf(step) > i
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {['select_worker', 'classify', 'profile_details', 'review'].indexOf(step) > i ? (
                <CheckCircle className="w-5 h-5" />
              ) : i + 1}
            </div>
            {i < 3 && <div className="flex-1 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Worker */}
      {step === 'select_worker' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">Select Team Member</h2>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No team members found. Add workers in Team Management first.</p>
              <Link href="/dashboard/team" className="text-gold-600 hover:text-gold-700 text-sm font-medium mt-2 inline-block">
                Go to Team Management
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map(member => {
                const isClassified = alreadyClassified(member.id);
                const existingProfile = profiles.find(p => p.user_id === member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedWorker(member);
                      setStep('classify');
                    }}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedWorker?.id === member.id
                        ? 'border-gold-500 bg-gold-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{member.full_name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      {isClassified && existingProfile && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          existingProfile.classification === 'w2_employee'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {existingProfile.classification === 'w2_employee' ? 'W-2' : '1099'} (classified)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Classification */}
      {step === 'classify' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-2">
            Classify: {selectedWorker?.full_name}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            How should this worker be classified? If unsure,{' '}
            <Link href="/dashboard/shield/classification" className="text-gold-600 hover:text-gold-700 font-medium">
              run the classification test first
            </Link>.
          </p>

          {classificationTest && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-navy-500" />
                <p className="text-sm font-medium text-navy-500">
                  {stateRules?.stateName} uses the {classificationTest.testName}
                </p>
              </div>
              <p className="text-xs text-gray-600">{classificationTest.description}</p>
              {classificationTest.prongs.length > 0 && (
                <div className="mt-2 space-y-1">
                  {classificationTest.prongs.map(prong => (
                    <p key={prong.letter} className="text-xs text-gray-500">
                      <span className="font-medium">Prong {prong.letter}:</span> {prong.title}
                    </p>
                  ))}
                </div>
              )}
              <Link
                href="/dashboard/workforce/compliance-rules"
                className="text-xs text-gold-600 hover:text-gold-700 font-medium mt-2 inline-block"
              >
                View full {stateRules?.stateName} compliance rules
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setClassification('w2_employee')}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                classification === 'w2_employee'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <Briefcase className={`w-8 h-8 mb-3 ${classification === 'w2_employee' ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-900">W-2 Employee</h3>
              <p className="text-sm text-gray-500 mt-1">
                You control when, where, and how they work. They use your tools. Full overtime, break, and wage protections apply.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                <li>- Time tracking with OT/DT</li>
                <li>- Meal & rest break compliance</li>
                <li>- Payroll-ready hours</li>
                <li>- Schedule assignment</li>
              </ul>
            </button>

            <button
              onClick={() => setClassification('1099_contractor')}
              className={`p-6 rounded-xl border-2 text-left transition-all ${
                classification === '1099_contractor'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-orange-200'
              }`}
            >
              <FileText className={`w-8 h-8 mb-3 ${classification === '1099_contractor' ? 'text-orange-500' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-gray-900">1099 Contractor</h3>
              <p className="text-sm text-gray-500 mt-1">
                They control their own schedule and methods. They have their own business, tools, and insurance.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
                <li>- Simple time logging</li>
                <li>- Invoice-based payment</li>
                <li>- W-9 & insurance tracking</li>
                <li>- Misclassification guardrails</li>
              </ul>
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium text-yellow-800">When in doubt, classify as W-2</p>
                <p className="mt-1">
                  {stateRules?.stateName || 'Most states'} presume{stateRules ? 's' : ''} all workers are employees.
                  The burden is on you to prove a worker qualifies as an independent contractor
                  under the {classificationTest?.testName || 'applicable classification test'}.
                  {stateRules && ` Misclassification penalties: ${stateRules.classification.penaltyRange}.`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('select_worker')}
              className="btn-outline flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep('profile_details')}
              disabled={!classification}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Profile Details */}
      {step === 'profile_details' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">
            {classification === 'w2_employee' ? 'Employee Details' : 'Contractor Details'}
          </h2>

          {classification === 'w2_employee' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="16"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(e.target.value)}
                  placeholder={`e.g. 25.00 (${companyState} min: $${minWage.toFixed(2)})`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
                {hourlyRate && parseFloat(hourlyRate) < minWage && (
                  <p className="text-red-500 text-xs mt-1">Below {stateRules?.stateName || companyState} minimum wage (${minWage.toFixed(2)}/hr)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pay Frequency</label>
                <select
                  value={payFrequency}
                  onChange={e => setPayFrequency(e.target.value as typeof payFrequency)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="semimonthly">Semi-monthly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="overtimeEligible"
                  checked={overtimeEligible}
                  onChange={e => setOvertimeEligible(e.target.checked)}
                  className="w-4 h-4 text-gold-500 rounded"
                />
                <label htmlFor="overtimeEligible" className="text-sm text-gray-700">
                  Eligible for overtime (1.5x after 8 hrs/day, 2x after 12 hrs/day)
                </label>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                <p className="font-medium text-blue-800 mb-1">What ToolTime will track for this employee:</p>
                <ul className="space-y-1">
                  <li>- Clock in/out with GPS location</li>
                  <li>- Meal breaks (required after 5 hrs) and rest breaks (every 4 hrs)</li>
                  <li>- Overtime at 1.5x (after 8 hrs) and double time at 2x (after 12 hrs)</li>
                  <li>- Break attestation and compliance alerts</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (if applicable)</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Smith Plumbing LLC"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={contractorRate}
                    onChange={e => setContractorRate(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type</label>
                  <select
                    value={contractorRateType}
                    onChange={e => setContractorRateType(e.target.value as typeof contractorRateType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="hourly">Per Hour</option>
                    <option value="per_job">Per Job</option>
                    <option value="daily">Per Day</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="direct_deposit">Direct Deposit</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="0">Due on Receipt</option>
                    <option value="15">Net 15</option>
                    <option value="30">Net 30</option>
                    <option value="45">Net 45</option>
                    <option value="60">Net 60</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start Date</label>
                <input
                  type="date"
                  value={contractStartDate}
                  onChange={e => setContractStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor License # (if applicable)</label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={e => setLicenseNumber(e.target.value)}
                  placeholder="e.g. CSLB #123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium text-gray-700 mb-3">Compliance Documents</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="w9"
                      checked={w9Received}
                      onChange={e => setW9Received(e.target.checked)}
                      className="w-4 h-4 text-gold-500 rounded"
                    />
                    <label htmlFor="w9" className="text-sm text-gray-700">
                      W-9 form received and on file
                    </label>
                    {!w9Received && (
                      <span className="text-xs text-red-500 font-medium">Required</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="insurance"
                      checked={insuranceVerified}
                      onChange={e => setInsuranceVerified(e.target.checked)}
                      className="w-4 h-4 text-gold-500 rounded"
                    />
                    <label htmlFor="insurance" className="text-sm text-gray-700">
                      Proof of insurance verified
                    </label>
                  </div>
                  {insuranceVerified && (
                    <div className="ml-7">
                      <label className="block text-sm text-gray-600 mb-1">Insurance Expiry Date</label>
                      <input
                        type="date"
                        value={insuranceExpiry}
                        onChange={e => setInsuranceExpiry(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4 text-sm text-orange-700">
                <p className="font-medium text-orange-800 mb-1">What ToolTime will do for this contractor:</p>
                <ul className="space-y-1">
                  <li>- Simple time logging (no overtime or break rules)</li>
                  <li>- Invoice-based payment tracking</li>
                  <li>- Auto-detect misclassification risks (guardrails)</li>
                  <li>- W-9 and insurance expiry reminders</li>
                  <li>- 1099-NEC data for year-end reporting</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep('classify')}
              className="btn-outline flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep('review')}
              className="btn-primary flex items-center gap-2"
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Save */}
      {step === 'review' && (
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">Review & Confirm</h2>

          <div className="bg-gray-50 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                classification === 'w2_employee' ? 'bg-blue-100' : 'bg-orange-100'
              }`}>
                {classification === 'w2_employee' ? (
                  <Briefcase className="w-6 h-6 text-blue-500" />
                ) : (
                  <FileText className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedWorker?.full_name}</p>
                <p className="text-sm text-gray-500">{selectedWorker?.email}</p>
              </div>
              <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
                classification === 'w2_employee'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-orange-100 text-orange-700'
              }`}>
                {classification === 'w2_employee' ? 'W-2 Employee' : '1099 Contractor'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {classification === 'w2_employee' ? (
                <>
                  <div>
                    <p className="text-gray-500">Hourly Rate</p>
                    <p className="font-medium">{hourlyRate ? `$${parseFloat(hourlyRate).toFixed(2)}/hr` : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pay Frequency</p>
                    <p className="font-medium capitalize">{payFrequency}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Overtime Eligible</p>
                    <p className="font-medium">{overtimeEligible ? 'Yes' : 'No'}</p>
                  </div>
                </>
              ) : (
                <>
                  {businessName && (
                    <div>
                      <p className="text-gray-500">Business Name</p>
                      <p className="font-medium">{businessName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Rate</p>
                    <p className="font-medium">
                      {contractorRate ? `$${parseFloat(contractorRate).toFixed(2)}/${contractorRateType === 'per_job' ? 'job' : contractorRateType === 'daily' ? 'day' : 'hr'}` : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment</p>
                    <p className="font-medium capitalize">{paymentMethod} / Net {paymentTerms}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">W-9 on File</p>
                    <p className={`font-medium ${w9Received ? 'text-green-600' : 'text-red-600'}`}>
                      {w9Received ? 'Yes' : 'No - Required'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Insurance</p>
                    <p className={`font-medium ${insuranceVerified ? 'text-green-600' : 'text-gray-500'}`}>
                      {insuranceVerified ? `Verified (exp: ${insuranceExpiry || 'N/A'})` : 'Not verified'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {classification === '1099_contractor' && !w9Received && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">Missing W-9 Form</p>
                  <p>You can save this profile, but a compliance guardrail will flag this contractor until a W-9 is on file. Do not issue payments without it.</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep('profile_details')}
              className="btn-outline flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : editUserId ? 'Update Classification' : 'Save & Classify'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
