'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Demo sync data
const demoInvoices = [
  { id: 'INV-1042', customer: 'Martinez Residence', amount: 285, status: 'synced', date: 'Jan 25, 2026', service: 'Lawn Care' },
  { id: 'INV-1041', customer: 'Chen Property', amount: 450, status: 'synced', date: 'Jan 24, 2026', service: 'Hedge Trimming' },
  { id: 'INV-1040', customer: 'Walsh Home', amount: 175, status: 'syncing', date: 'Jan 24, 2026', service: 'Sprinkler Repair' },
  { id: 'INV-1039', customer: 'Thompson Estate', amount: 875, status: 'pending', date: 'Jan 23, 2026', service: 'Full Cleanup' },
  { id: 'INV-1038', customer: 'Miller Property', amount: 320, status: 'pending', date: 'Jan 23, 2026', service: 'Tree Service' },
];

const demoPayments = [
  { id: 'PAY-892', invoice: 'INV-1042', customer: 'Martinez Residence', amount: 285, method: 'Card', status: 'synced' },
  { id: 'PAY-891', invoice: 'INV-1041', customer: 'Chen Property', amount: 450, method: 'ACH', status: 'synced' },
  { id: 'PAY-890', invoice: 'INV-1038', customer: 'Miller Property', amount: 320, method: 'Card', status: 'syncing' },
];

const syncStats = {
  invoices: { total: 1247, synced: 1243, pending: 4 },
  payments: { total: 892, synced: 889, pending: 3 },
  customers: { total: 156, synced: 156, pending: 0 },
};

const featureIcons = ['🔄', '📊', '💰', '👥', '📈', '🔒'];

export default function QuickBooksDemoPage() {
  const t = useTranslations('demo.quickbooks');
  const [connected, setConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [invoices, setInvoices] = useState(demoInvoices);
  const [lastSync, setLastSync] = useState('2 minutes ago');
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const handleSync = () => {
    setIsSyncing(true);

    // Simulate syncing animation
    setTimeout(() => {
      setInvoices(prev => prev.map(inv => ({
        ...inv,
        status: inv.status === 'pending' ? 'syncing' : inv.status
      })));
    }, 500);

    setTimeout(() => {
      setInvoices(prev => prev.map(inv => ({ ...inv, status: 'synced' })));
      setIsSyncing(false);
      setLastSync('Just now');
    }, 2500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">{t('synced')}</span>;
      case 'syncing':
        return (
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 border border-blue-700 border-t-transparent rounded-full animate-spin"></span>
            {t('syncing')}
          </span>
        );
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded-full">{t('pending')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-[#2ca01c] to-[#238c17] text-white py-3 px-4 text-center font-semibold">
        <span className="mr-2">📗</span>
        {t('demoBanner')} —
        <Link href="/auth/signup" className="underline ml-1 font-bold">
          {t('startFreeTrial')}
        </Link>
        {' '}{t('toConnectAccount')}
      </div>

      {/* Header */}
      <header className="bg-[#1a1a2e] text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="text-white/70 hover:text-white text-sm inline-flex items-center gap-1">
              {t('backToHome')}
            </Link>
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-10 h-10">
                <circle cx="20" cy="20" r="18" fill="#2ca01c"/>
                <path d="M12 20c0-4.4 3.6-8 8-8v4c-2.2 0-4 1.8-4 4s1.8 4 4 4v4c-4.4 0-8-3.6-8-8z" fill="white"/>
                <path d="M28 20c0 4.4-3.6 8-8 8v-4c2.2 0 4-1.8 4-4s-1.8-4-4-4v-4c4.4 0 8 3.6 8 8z" fill="white"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              <p className="text-white/70 mt-1">{t('subtitle')}</p>
            </div>
            <span className="ml-auto bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-medium border border-white/20">
              {t('allPlans')}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Connection Status Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${connected ? 'bg-green-100' : 'bg-red-100'}`}>
                {connected ? (
                  <span className="text-green-600 text-xl">✓</span>
                ) : (
                  <span className="text-red-600 text-xl">✕</span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-[#1a1a2e] text-lg">
                  {connected ? t('connectedToQB') : t('notConnected')}
                </h3>
                <p className="text-gray-500 text-sm">
                  {connected ? `${t('lastSynced')}: ${lastSync}` : t('connectToStart')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {connected && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                    isSyncing
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-[#2ca01c] text-white hover:bg-[#238c17]'
                  }`}
                >
                  {isSyncing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></span>
                      {t('syncingEllipsis')}
                    </span>
                  ) : (
                    `🔄 ${t('syncNow')}`
                  )}
                </button>
              )}
              <button
                onClick={() => setConnected(!connected)}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  connected
                    ? 'border-2 border-gray-300 text-gray-600 hover:bg-gray-50'
                    : 'bg-[#2ca01c] text-white hover:bg-[#238c17]'
                }`}
              >
                {connected ? t('disconnect') : t('connectQuickBooks')}
              </button>
            </div>
          </div>

          {/* Sync Stats */}
          {connected && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-[#1a1a2e]">{syncStats.invoices.synced}</div>
                <div className="text-sm text-gray-500 mt-1">{t('invoicesSynced')}</div>
                {syncStats.invoices.pending > 0 && (
                  <div className="text-xs text-yellow-600 mt-1">{syncStats.invoices.pending} {t('pending').toLowerCase()}</div>
                )}
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-[#1a1a2e]">{syncStats.payments.synced}</div>
                <div className="text-sm text-gray-500 mt-1">{t('paymentsSynced')}</div>
                {syncStats.payments.pending > 0 && (
                  <div className="text-xs text-yellow-600 mt-1">{syncStats.payments.pending} {t('pending').toLowerCase()}</div>
                )}
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl font-bold text-[#1a1a2e]">{syncStats.customers.synced}</div>
                <div className="text-sm text-gray-500 mt-1">{t('customersSynced')}</div>
                <div className="text-xs text-green-600 mt-1">{t('allSynced')}</div>
              </div>
            </div>
          )}
        </div>

        {/* Data Preview */}
        {connected && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-12">
            {/* Tabs */}
            <div className="border-b border-gray-100">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'invoices'
                      ? 'text-[#2ca01c] border-b-2 border-[#2ca01c]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('invoices')}
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-6 py-4 font-semibold transition-all ${
                    activeTab === 'payments'
                      ? 'text-[#2ca01c] border-b-2 border-[#2ca01c]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('payments')}
                </button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {activeTab === 'invoices' ? (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('invoice')}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('customer')}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('service')}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('date')}</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('amount')}</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('qbStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-[#1a1a2e]">{invoice.id}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{invoice.customer}</td>
                        <td className="px-6 py-4 text-gray-500">{invoice.service}</td>
                        <td className="px-6 py-4 text-gray-500">{invoice.date}</td>
                        <td className="px-6 py-4 text-right font-semibold text-[#1a1a2e]">${invoice.amount}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(invoice.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('payment')}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('invoice')}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('customer')}</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('method')}</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('amount')}</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('qbStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {demoPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-semibold text-[#1a1a2e]">{payment.id}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-600">{payment.invoice}</td>
                        <td className="px-6 py-4 text-gray-700">{payment.customer}</td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                            {payment.method === 'Card' ? '💳' : '🏦'} {payment.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-green-600">${payment.amount}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(payment.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#e6f7e6] px-4 py-2 rounded-full text-sm font-bold text-[#2ca01c] mb-4">
              {t('howItWorks')}
            </span>
            <h2 className="text-3xl font-bold text-[#1a1a2e]">{t('seamlessTwoWaySync')}</h2>
          </div>

          {/* Workflow Diagram */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="grid md:grid-cols-5 gap-4 items-center">
              {/* ToolTime Pro */}
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-[#1a1a2e] rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3">
                  🔧
                </div>
                <h4 className="font-bold text-[#1a1a2e]">ToolTime Pro</h4>
                <p className="text-xs text-gray-500 mt-1">{t('createInvoicesRecord')}</p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center">
                <div className="text-4xl text-[#2ca01c]">→</div>
              </div>

              {/* Sync Engine */}
              <div className="text-center p-4 bg-[#e6f7e6] rounded-xl">
                <div className="w-16 h-16 bg-[#2ca01c] rounded-full mx-auto flex items-center justify-center text-3xl mb-3 animate-pulse">
                  🔄
                </div>
                <h4 className="font-bold text-[#2ca01c]">{t('autoSync')}</h4>
                <p className="text-xs text-gray-600 mt-1">{t('realTimeSynchronization')}</p>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex justify-center">
                <div className="text-4xl text-[#2ca01c]">→</div>
              </div>

              {/* QuickBooks */}
              <div className="text-center p-4">
                <div className="w-16 h-16 bg-[#2ca01c] rounded-2xl mx-auto flex items-center justify-center mb-3">
                  <span className="text-white text-2xl font-bold">QB</span>
                </div>
                <h4 className="font-bold text-[#1a1a2e]">QuickBooks</h4>
                <p className="text-xs text-gray-500 mt-1">{t('reportsTaxesAccounting')}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-semibold text-center text-gray-700 mb-4">{t('whatGetsSynced')}</h4>
              <div className="flex flex-wrap justify-center gap-3">
                {[t('invoices'), t('payments'), t('customers'), t('productsServices'), t('taxRates')].map((item) => (
                  <span key={item} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-block bg-[#fef3d6] px-4 py-2 rounded-full text-sm font-bold text-[#1a1a2e] mb-4">
              {t('keyBenefits')}
            </span>
            <h2 className="text-3xl font-bold text-[#1a1a2e]">{t('whyConnectQB')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureIcons.map((icon, index) => (
              <div key={index} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-[#2ca01c] hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-[#e6f7e6] rounded-xl flex items-center justify-center text-2xl mb-4">
                  {icon}
                </div>
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{t(`features.${index}.title`)}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{t(`features.${index}.description`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-16">
          <h3 className="text-2xl font-bold text-[#1a1a2e] mb-6 text-center">{t('faqTitle')}</h3>
          <div className="space-y-4 max-w-3xl mx-auto">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="border border-gray-100 rounded-xl p-4">
                <h4 className="font-semibold text-[#1a1a2e] mb-2">{t(`faq.${index}.q`)}</h4>
                <p className="text-gray-600 text-sm">{t(`faq.${index}.a`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-[#2ca01c] to-[#238c17] rounded-2xl p-10 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t('ctaTitle')}</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            {t('ctaDescription')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-white text-[#2ca01c] px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors no-underline"
            >
              {t('startFreeTrial')} →
            </Link>
            <Link
              href="/dashboard/settings"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white/10 transition-colors no-underline"
            >
              {t('goToSettings')}
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-4">{t('ctaFootnote')}</p>
        </div>
      </div>
    </div>
  );
}
