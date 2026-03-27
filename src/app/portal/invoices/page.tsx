'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  amount_paid: number;
  status: string;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
}

export default function PortalInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch(`/api/portal?action=invoices`, { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => {
        setInvoices(data.invoices || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = invoices.filter(inv => {
    if (filter === 'open') return ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status);
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const totalOwed = invoices
    .filter(inv => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total - inv.amount_paid), 0);

  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading invoices...</div>;
  }

  const getStatusBadge = (inv: Invoice) => {
    const isOverdue = inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid');

    if (inv.status === 'paid') return { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle };
    if (isOverdue) return { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertCircle };
    if (inv.status === 'partial') return { label: 'Partial', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
    return { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: FileText };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Your Invoices</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <DollarSign className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className={`text-2xl font-bold ${totalOwed > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            ${totalOwed.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Amount Due</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Paid</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `All (${invoices.length})` },
          { key: 'open', label: `Open (${invoices.filter(i => ['sent', 'viewed', 'partial', 'overdue'].includes(i.status)).length})` },
          { key: 'paid', label: `Paid (${invoices.filter(i => i.status === 'paid').length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No invoices found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => {
            const badge = getStatusBadge(inv);
            const StatusIcon = badge.icon;
            const balance = inv.total - inv.amount_paid;
            const canPay = ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status) && balance > 0;

            return (
              <div key={inv.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">Invoice #{inv.invoice_number}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                      {inv.sent_at && (
                        <p>Sent {new Date(inv.sent_at).toLocaleDateString()}</p>
                      )}
                      {inv.due_date && inv.status !== 'paid' && (
                        <p>Due {new Date(inv.due_date).toLocaleDateString()}</p>
                      )}
                      {inv.paid_at && (
                        <p className="text-green-600">Paid {new Date(inv.paid_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">${inv.total.toFixed(2)}</p>
                    {inv.amount_paid > 0 && inv.status !== 'paid' && (
                      <p className="text-xs text-gray-400">Paid: ${inv.amount_paid.toFixed(2)}</p>
                    )}
                    {balance > 0 && inv.status !== 'paid' && (
                      <p className="text-sm font-medium text-orange-600">Balance: ${balance.toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {canPay && (
                  <Link
                    href={`/invoice/${inv.id}`}
                    className="mt-4 w-full bg-green-500 text-white py-2.5 rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay ${balance.toFixed(2)} Now
                  </Link>
                )}

                {inv.status === 'paid' && (
                  <Link
                    href={`/invoice/${inv.id}`}
                    className="mt-3 text-sm text-blue-600 font-medium flex items-center gap-1"
                  >
                    View Receipt <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
