'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkforce } from '@/hooks/useWorkforce';
import {
  ArrowLeft,
  DollarSign,
  Briefcase,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Send,
  Download,
} from 'lucide-react';

interface PayPeriodSummary {
  w2_workers: {
    name: string;
    regular_hours: number;
    overtime_hours: number;
    double_time_hours: number;
    rate: number;
    gross_pay: number;
  }[];
  contractor_invoices: {
    id: string;
    contractor_name: string;
    description: string;
    total: number;
    status: string;
    period_start: string;
    period_end: string;
  }[];
  total_w2_payroll: number;
  total_contractor_cost: number;
  total_labor_cost: number;
}

export default function PaymentsPage() {
  const { company } = useAuth();
  const { profiles, contractorInvoices, stats, isLoading } = useWorkforce();
  const [view, setView] = useState<'overview' | 'w2' | '1099'>('overview');
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [summary, setSummary] = useState<PayPeriodSummary | null>(null);

  // New invoice form
  const [selectedContractor, setSelectedContractor] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceHours, setInvoiceHours] = useState('');
  const [invoiceRate, setInvoiceRate] = useState('');
  const [invoicePeriodStart, setInvoicePeriodStart] = useState('');
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showNewInvoice) {
        setShowNewInvoice(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showNewInvoice]);

  const contractors = useMemo(() => profiles.filter(p => p.classification === '1099_contractor'), [profiles]);
  const w2Workers = useMemo(() => profiles.filter(p => p.classification === 'w2_employee'), [profiles]);

  // Calculate pay period summary
  const calculateSummary = useCallback(async () => {
    if (!company?.id) return;

    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Get time entries for W-2 workers
    const w2UserIds = w2Workers.map(w => w.user_id);
    let w2PayData: PayPeriodSummary['w2_workers'] = [];

    if (w2UserIds.length > 0) {
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('user_id, clock_in, clock_out, break_minutes')
        .eq('company_id', company.id)
        .in('user_id', w2UserIds)
        .gte('clock_in', twoWeeksAgo.toISOString())
        .not('clock_out', 'is', null)
        .eq('status', 'completed');

      // Group by worker
      const byWorker = new Map<string, typeof timeEntries>();
      (timeEntries || []).forEach(entry => {
        const list = byWorker.get(entry.user_id!) || [];
        list.push(entry);
        byWorker.set(entry.user_id!, list);
      });

      w2PayData = w2Workers.map(worker => {
        const entries = byWorker.get(worker.user_id) || [];
        let totalRegular = 0;
        let totalOT = 0;
        let totalDT = 0;

        entries.forEach(entry => {
          const clockIn = new Date(entry.clock_in);
          const clockOut = new Date(entry.clock_out!);
          const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) - (entry.break_minutes || 0) / 60;
          const h = Math.max(0, hours);

          if (h > 12) {
            totalRegular += 8;
            totalOT += 4;
            totalDT += h - 12;
          } else if (h > 8) {
            totalRegular += 8;
            totalOT += h - 8;
          } else {
            totalRegular += h;
          }
        });

        const rate = worker.hourly_rate || 0;
        const gross = (totalRegular * rate) + (totalOT * rate * 1.5) + (totalDT * rate * 2);

        return {
          name: worker.user?.full_name || 'Unknown',
          regular_hours: Math.round(totalRegular * 100) / 100,
          overtime_hours: Math.round(totalOT * 100) / 100,
          double_time_hours: Math.round(totalDT * 100) / 100,
          rate,
          gross_pay: Math.round(gross * 100) / 100,
        };
      });
    }

    const recentInvoices = contractorInvoices.slice(0, 20).map(inv => ({
      id: inv.id,
      contractor_name: inv.contractor_name,
      description: inv.description,
      total: inv.total,
      status: inv.status,
      period_start: inv.period_start,
      period_end: inv.period_end,
    }));

    const totalW2 = w2PayData.reduce((s, w) => s + w.gross_pay, 0);
    const totalContractor = recentInvoices
      .filter(i => i.status === 'approved' || i.status === 'paid')
      .reduce((s, i) => s + i.total, 0);

    setSummary({
      w2_workers: w2PayData,
      contractor_invoices: recentInvoices,
      total_w2_payroll: totalW2,
      total_contractor_cost: totalContractor,
      total_labor_cost: totalW2 + totalContractor,
    });
  }, [company?.id, w2Workers, contractorInvoices]);

  useEffect(() => {
    if (!isLoading) {
      calculateSummary();
    }
  }, [isLoading, calculateSummary]);

  // Helper: calculate invoice total based on rate type
  const getInvoiceTotal = useCallback((hours: string, rate: string, rateType: string | null) => {
    const h = parseFloat(hours) || 0;
    const r = parseFloat(rate) || 0;
    if (rateType === 'per_job' || rateType === 'daily') return r;
    return h * r; // hourly
  }, []);

  const handleCreateInvoice = async () => {
    if (!company?.id || !selectedContractor) return;
    setSaving(true);

    const contractor = contractors.find(c => c.user_id === selectedContractor);
    if (!contractor) { setSaving(false); return; }

    const rate = parseFloat(invoiceRate) || contractor.contractor_rate || 0;
    const rateType = contractor.contractor_rate_type || 'hourly';
    const hours = parseFloat(invoiceHours) || 0;
    const subtotal = getInvoiceTotal(invoiceHours, invoiceRate, rateType);

    const invoiceNum = `CI-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from('contractor_invoices').insert({
      company_id: company.id,
      contractor_id: selectedContractor,
      contractor_name: contractor.user?.full_name || 'Unknown',
      invoice_number: invoiceNum,
      description: invoiceDescription,
      hours_worked: hours || null,
      rate,
      rate_type: rateType,
      subtotal,
      total: subtotal,
      status: 'draft',
      period_start: invoicePeriodStart,
      period_end: invoicePeriodEnd,
      payment_method: contractor.payment_method,
    });

    if (!error) {
      setShowNewInvoice(false);
      setSelectedContractor('');
      setInvoiceDescription('');
      setInvoiceHours('');
      setInvoiceRate('');
      setInvoicePeriodStart('');
      setInvoicePeriodEnd('');
      // Refresh data so summary updates
      calculateSummary();
    }
    setSaving(false);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'approved': return 'bg-blue-100 text-blue-700';
      case 'submitted': return 'bg-yellow-100 text-yellow-700';
      case 'disputed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workforce" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-500">Blended Payments</h1>
          <p className="text-gray-500 text-sm">
            Payroll tracking for W-2 employees, invoice management for 1099 contractors
          </p>
        </div>
        <button
          onClick={() => setShowNewInvoice(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Contractor Invoice
        </button>
      </div>

      {/* Labor Cost Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card border-2 border-navy-100">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-navy-500" />
            <p className="text-sm font-medium text-gray-500">Total Labor Cost (2 wks)</p>
          </div>
          <p className="text-3xl font-bold text-navy-500">
            ${(summary?.total_labor_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card border-2 border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <p className="text-sm font-medium text-gray-500">W-2 Payroll</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            ${(summary?.total_w2_payroll || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{stats.w2Count} employees</p>
        </div>
        <div className="card border-2 border-orange-100">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-orange-500" />
            <p className="text-sm font-medium text-gray-500">1099 Invoices</p>
          </div>
          <p className="text-3xl font-bold text-orange-600">
            ${(summary?.total_contractor_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-1">{stats.contractorCount} contractors</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 border-b">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'w2', label: `W-2 Payroll (${stats.w2Count})` },
          { key: '1099', label: `1099 Invoices (${stats.contractorCount})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key as typeof view)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === tab.key
                ? 'border-gold-500 text-gold-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* W-2 Payroll Table */}
      {(view === 'overview' || view === 'w2') && (
        <div className="card">
          <h3 className="font-semibold text-navy-500 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            W-2 Employee Hours (Last 2 Weeks)
          </h3>
          {(summary?.w2_workers || []).length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No W-2 employee time entries found for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Employee</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Regular</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">OT (1.5x)</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">DT (2x)</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Rate</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Gross Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.w2_workers.map((worker, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{worker.name}</td>
                      <td className="py-2 px-3 text-sm text-right text-gray-600">{worker.regular_hours}h</td>
                      <td className="py-2 px-3 text-sm text-right text-orange-600">{worker.overtime_hours}h</td>
                      <td className="py-2 px-3 text-sm text-right text-red-600">{worker.double_time_hours}h</td>
                      <td className="py-2 px-3 text-sm text-right text-gray-600">${worker.rate.toFixed(2)}/hr</td>
                      <td className="py-2 px-3 text-sm text-right font-semibold text-gray-900">
                        ${worker.gross_pay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50">
                    <td className="py-2 px-3 text-sm font-bold text-blue-700" colSpan={5}>Total W-2 Payroll</td>
                    <td className="py-2 px-3 text-sm text-right font-bold text-blue-700">
                      ${(summary?.total_w2_payroll || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 1099 Invoices Table */}
      {(view === 'overview' || view === '1099') && (
        <div className="card">
          <h3 className="font-semibold text-navy-500 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            1099 Contractor Invoices
          </h3>
          {(summary?.contractor_invoices || []).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">No contractor invoices yet.</p>
              <button
                onClick={() => setShowNewInvoice(true)}
                className="text-gold-600 hover:text-gold-700 text-sm font-medium mt-2"
              >
                Create first invoice
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Contractor</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Period</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary?.contractor_invoices.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-sm font-medium text-gray-900">{inv.contractor_name}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 max-w-xs truncate">{inv.description}</td>
                      <td className="py-2 px-3 text-sm text-gray-500">
                        {new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 text-sm text-right font-semibold text-gray-900">
                        ${inv.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusStyle(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-orange-50">
                    <td className="py-2 px-3 text-sm font-bold text-orange-700" colSpan={3}>Total Contractor Cost</td>
                    <td className="py-2 px-3 text-sm text-right font-bold text-orange-700">
                      ${(summary?.total_contractor_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Contractor Invoice Modal */}
      {showNewInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewInvoice(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy-500">New Contractor Invoice</h3>
              <button onClick={() => setShowNewInvoice(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contractor</label>
                <select
                  value={selectedContractor}
                  onChange={e => {
                    setSelectedContractor(e.target.value);
                    const c = contractors.find(c => c.user_id === e.target.value);
                    if (c?.contractor_rate) setInvoiceRate(c.contractor_rate.toString());
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                >
                  <option value="">Select contractor...</option>
                  {contractors.map(c => (
                    <option key={c.user_id} value={c.user_id}>
                      {c.user?.full_name || 'Unknown'} {c.business_name ? `(${c.business_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={invoiceDescription}
                  onChange={e => setInvoiceDescription(e.target.value)}
                  placeholder="e.g. Plumbing work at 123 Main St"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    value={invoiceHours}
                    onChange={e => setInvoiceHours(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={invoiceRate}
                    onChange={e => setInvoiceRate(e.target.value)}
                    placeholder="e.g. 45.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={invoicePeriodStart}
                    onChange={e => setInvoicePeriodStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input
                    type="date"
                    value={invoicePeriodEnd}
                    onChange={e => setInvoicePeriodEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              </div>

              {invoiceRate && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-gray-500">Estimated Total:</p>
                  <p className="text-xl font-bold text-navy-500">
                    ${getInvoiceTotal(
                      invoiceHours,
                      invoiceRate,
                      contractors.find(c => c.user_id === selectedContractor)?.contractor_rate_type || 'hourly'
                    ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewInvoice(false)} className="btn-outline">
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={!selectedContractor || !invoiceDescription || !invoiceRate || !invoicePeriodStart || !invoicePeriodEnd || saving}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {saving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
