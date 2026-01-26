'use client';

import { useState } from 'react';
import Link from 'next/link';

// Demo invoice data
const demoInvoices = [
  { id: 'INV-1042', customer: 'John Martinez', amount: 150, status: 'paid', date: '2026-01-20', service: 'Lawn Mowing' },
  { id: 'INV-1041', customer: 'Sarah Chen', amount: 275, status: 'pending', date: '2026-01-19', service: 'Full Landscaping' },
  { id: 'INV-1040', customer: 'Mike Thompson', amount: 95, status: 'paid', date: '2026-01-18', service: 'Sprinkler Check' },
  { id: 'INV-1039', customer: 'Emily Davis', amount: 180, status: 'overdue', date: '2026-01-10', service: 'Tree Trimming' },
  { id: 'INV-1038', customer: 'Robert Wilson', amount: 320, status: 'paid', date: '2026-01-08', service: 'Landscaping Package' },
];

const demoStats = {
  outstanding: 455,
  paidThisMonth: 1245,
  overdueCount: 1,
  avgPayTime: 3.2,
};

export default function InvoicingDemoPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<typeof demoInvoices[0] | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Demo Banner */}
      <div className="bg-[#1a1a2e] text-white py-3 px-4 text-center">
        <p className="text-sm">
          <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded font-bold mr-2">
            DEMO
          </span>
          This is a preview of invoicing and payments.{' '}
          <Link href="/auth/signup" className="text-[#f5a623] underline">
            Sign up
          </Link>{' '}
          to start getting paid faster.
        </p>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">💰</span>
            <h1 className="text-3xl font-bold">Invoicing & Payments Demo</h1>
          </div>
          <p className="text-white/80">Professional invoices, online payments, and automatic reminders</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Outstanding</div>
            <div className="text-3xl font-bold text-[#f5a623]">${demoStats.outstanding}</div>
            <div className="text-xs text-gray-400">awaiting payment</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Paid This Month</div>
            <div className="text-3xl font-bold text-green-600">${demoStats.paidThisMonth}</div>
            <div className="text-xs text-gray-400">collected</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Overdue</div>
            <div className="text-3xl font-bold text-red-600">{demoStats.overdueCount}</div>
            <div className="text-xs text-gray-400">invoice(s)</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="text-sm text-gray-500 mb-1">Avg. Pay Time</div>
            <div className="text-3xl font-bold text-[#1a1a2e]">{demoStats.avgPayTime}</div>
            <div className="text-xs text-gray-400">days</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Invoice List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-[#1a1a2e]">Recent Invoices</h3>
                <button className="px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-semibold text-sm hover:bg-[#e6991a] transition-colors">
                  + New Invoice
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Invoice</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Customer</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Service</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">Amount</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoInvoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <td className="py-3 px-4 font-medium text-[#1a1a2e]">{invoice.id}</td>
                        <td className="py-3 px-4 text-gray-700">{invoice.customer}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{invoice.service}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{formatDate(invoice.date)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-[#1a1a2e]">
                          ${invoice.amount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              {[
                { icon: '💳', label: 'Accept Cards', desc: 'Visa, MC, Amex' },
                { icon: '🔄', label: 'Auto-Reminders', desc: 'Never chase payments' },
                { icon: '📧', label: 'Email Invoices', desc: 'One-click send' },
                { icon: '📱', label: 'Mobile Payments', desc: 'Pay via text' },
                { icon: '🧾', label: 'Professional PDFs', desc: 'Your branding' },
                { icon: '📊', label: 'Reports', desc: 'Track everything' },
              ].map((feature) => (
                <div
                  key={feature.label}
                  className="bg-white rounded-xl border border-gray-200 p-4 text-center"
                >
                  <span className="text-2xl block mb-2">{feature.icon}</span>
                  <div className="font-semibold text-[#1a1a2e] text-sm">{feature.label}</div>
                  <div className="text-xs text-gray-500">{feature.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar - Invoice Preview */}
          <div className="space-y-6">
            {selectedInvoice ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-[#1a1a2e]">Invoice Preview</h3>
                  <button
                    onClick={() => setSelectedInvoice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-2xl font-bold text-[#1a1a2e]">{selectedInvoice.id}</div>
                      <div className="text-sm text-gray-500">{formatDate(selectedInvoice.date)}</div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                        selectedInvoice.status
                      )}`}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Bill To</div>
                      <div className="font-semibold text-[#1a1a2e]">{selectedInvoice.customer}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase">Service</div>
                      <div className="text-[#1a1a2e]">{selectedInvoice.service}</div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Due</span>
                      <span className="text-2xl font-bold text-[#1a1a2e]">
                        ${selectedInvoice.amount}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    {selectedInvoice.status === 'pending' && (
                      <button className="w-full py-3 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-semibold hover:bg-[#e6991a] transition-colors">
                        Send Reminder
                      </button>
                    )}
                    {selectedInvoice.status === 'overdue' && (
                      <button className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors">
                        Send Final Notice
                      </button>
                    )}
                    <button className="w-full py-3 border border-gray-300 text-[#1a1a2e] rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <span className="text-4xl block mb-3">📄</span>
                <h3 className="font-semibold text-[#1a1a2e] mb-2">Invoice Preview</h3>
                <p className="text-sm text-gray-500">Click an invoice to see details</p>
              </div>
            )}

            {/* Payment Methods */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-4">Accepted Payment Methods</h3>
              <div className="flex gap-3 mb-4">
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm font-medium">💳 Credit Card</div>
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm font-medium">🏦 ACH</div>
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm font-medium">📱 Venmo</div>
              </div>
              <p className="text-white/70 text-sm">
                Customers can pay online with one click. Funds deposit in 1-2 business days.
              </p>
            </div>

            {/* CTA */}
            <div className="bg-[#fef3d6] rounded-xl p-6 text-center">
              <h3 className="font-bold text-[#1a1a2e] mb-2">Get Paid Faster</h3>
              <p className="text-sm text-[#5c5c70] mb-4">
                Businesses using ToolTime Pro get paid 3x faster with online invoicing.
              </p>
              <Link
                href="/auth/signup"
                className="inline-block px-6 py-3 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#2d2d4a] transition-colors no-underline"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Stop Chasing Payments</h2>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Create professional invoices in seconds, accept credit cards and ACH, and let automatic reminders
            do the follow-up for you. Get paid faster with less effort.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold hover:bg-[#e6991a] transition-colors no-underline"
            >
              Get Started Free
            </Link>
            <Link
              href="/demo/quoting"
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors no-underline"
            >
              See Quoting Demo →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-[#5c5c70]">
            Powered by{' '}
            <Link href="/" className="text-[#f5a623] font-medium no-underline hover:underline">
              ToolTime Pro
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
