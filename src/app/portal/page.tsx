'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MapPin,
} from 'lucide-react';

interface DashboardData {
  customer: { name: string; email: string } | null;
  company: { name: string; phone: string } | null;
  upcomingJobs: { id: string; title: string; scheduled_date: string; scheduled_time_start: string; status: string }[];
  openInvoices: { id: string; invoice_number: string; total: number; amount_paid: number; status: string; due_date: string }[];
  pendingQuotes: { id: string; quote_number: string; title: string; total: number; status: string }[];
}

export default function PortalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch('/api/portal', { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading your portal...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-400">Unable to load data.</div>;
  }

  const totalOwed = (data.openInvoices || []).reduce((sum, inv) => sum + (inv.total - inv.amount_paid), 0);
  const hasOverdue = (data.openInvoices || []).some(inv => inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < new Date()));

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-navy-gradient rounded-2xl p-6 text-white">
        <h1 className="text-xl font-bold">Welcome, {data.customer?.name?.split(' ')[0] || 'there'}!</h1>
        <p className="text-white/70 text-sm mt-1">
          Your account with {data.company?.name || 'us'}. View appointments, pay invoices, and more.
        </p>
        {data.company?.phone && (
          <a href={`tel:${data.company.phone}`} className="inline-flex items-center gap-2 mt-3 bg-white/10 rounded-lg px-4 py-2 text-sm hover:bg-white/20 transition-colors">
            Call us: {data.company.phone}
          </a>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{(data.upcomingJobs || []).length}</p>
          <p className="text-xs text-gray-500">Upcoming</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <FileText className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{(data.openInvoices || []).length}</p>
          <p className="text-xs text-gray-500">Open Invoices</p>
        </div>
        <div className={`bg-white rounded-xl p-4 text-center shadow-sm ${hasOverdue ? 'ring-2 ring-red-200' : ''}`}>
          <DollarSign className={`w-5 h-5 mx-auto mb-1 ${hasOverdue ? 'text-red-500' : 'text-green-500'}`} />
          <p className={`text-2xl font-bold ${hasOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            ${totalOwed.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500">{hasOverdue ? 'Overdue' : 'Balance'}</p>
        </div>
      </div>

      {/* Next Appointment */}
      {(data.upcomingJobs || []).length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Next Appointment</h2>
            <Link href="/portal/appointments" className="text-sm text-blue-600 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data.upcomingJobs.slice(0, 2).map(job => (
            <div key={job.id} className="flex items-start gap-3 py-3 border-b last:border-0">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{job.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {job.scheduled_time_start && ` at ${job.scheduled_time_start}`}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                job.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {job.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Open Invoices */}
      {(data.openInvoices || []).length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Open Invoices</h2>
            <Link href="/portal/invoices" className="text-sm text-blue-600 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {data.openInvoices.slice(0, 3).map(inv => {
            const balance = inv.total - inv.amount_paid;
            const isOverdue = inv.status === 'overdue' || (inv.due_date && new Date(inv.due_date) < new Date());
            return (
              <div key={inv.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {isOverdue ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">Invoice #{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">
                      {inv.due_date ? `Due ${new Date(inv.due_date).toLocaleDateString()}` : 'No due date'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    ${balance.toFixed(2)}
                  </p>
                  <Link href={`/invoice/${inv.id}`} className="text-xs text-blue-600 font-medium">
                    Pay Now
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending Quotes */}
      {(data.pendingQuotes || []).length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Pending Quotes</h2>
          {data.pendingQuotes.map(quote => (
            <div key={quote.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <p className="font-medium text-gray-900">{quote.title || `Quote #${quote.quote_number}`}</p>
                <p className="text-xs text-gray-500 capitalize">{quote.status}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">${quote.total.toFixed(2)}</p>
                <Link href={`/quote/${quote.id}`} className="text-xs text-blue-600 font-medium">
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {(data.upcomingJobs || []).length === 0 && (data.openInvoices || []).length === 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700">All caught up!</h3>
          <p className="text-sm text-gray-500 mt-1">No upcoming appointments or open invoices.</p>
        </div>
      )}
    </div>
  );
}
