'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import {
  Home as HomeIcon,
  Calendar,
  FileText,
  Truck,
  MessageSquare,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Send,
} from 'lucide-react';

type TabKey = 'home' | 'tracker' | 'invoices' | 'messages';

const demoCustomer = { name: 'Maria Santos', firstName: 'Maria' };
const demoCompany = { name: 'Green Scene Landscaping', phone: '(555) 123-4567' };

const demoUpcoming = [
  {
    id: 'j1',
    title: 'Weekly Lawn Care',
    date: 'Thu, May 28',
    time: '9:00 AM',
    status: 'in_progress' as const,
  },
  {
    id: 'j2',
    title: 'Hedge Trimming + Cleanup',
    date: 'Mon, Jun 1',
    time: '11:00 AM',
    status: 'scheduled' as const,
  },
];

const demoInvoices = [
  { id: 'i1', number: '1042', total: 185.0, paid: 0, due: '2026-05-30', overdue: false },
  { id: 'i2', number: '1038', total: 320.0, paid: 0, due: '2026-05-20', overdue: true },
  { id: 'i3', number: '1035', total: 95.0, paid: 95.0, due: '2026-05-10', overdue: false },
];

const demoTrackerStages = [
  { key: 'scheduled', label: 'Scheduled', time: '8:00 AM', done: true },
  { key: 'enroute', label: 'On the way', time: '8:47 AM', done: true },
  { key: 'arrived', label: 'Arrived on site', time: '9:02 AM', done: true },
  { key: 'inprogress', label: 'Job in progress', time: 'Now', done: true, current: true },
  { key: 'complete', label: 'Job complete', time: '—', done: false },
];

const demoPhotos = [
  { id: 'p1', label: 'Before — front lawn', color: 'from-amber-200 to-amber-400', emoji: '🌾' },
  { id: 'p2', label: 'After — front lawn', color: 'from-green-300 to-green-500', emoji: '🌿' },
  { id: 'p3', label: 'Edged walkway', color: 'from-emerald-200 to-emerald-400', emoji: '🚶' },
  { id: 'p4', label: 'Cleanup complete', color: 'from-teal-200 to-teal-400', emoji: '✨' },
];

const demoMessages = [
  { id: 'm1', from: 'company' as const, text: 'Hi Maria! Miguel is on the way and will arrive in about 15 minutes.', time: '8:47 AM' },
  { id: 'm2', from: 'customer' as const, text: 'Great, thanks! The side gate is unlocked.', time: '8:49 AM' },
  { id: 'm3', from: 'company' as const, text: 'Perfect, just arrived. We\'ll have you all set in about 90 minutes.', time: '9:02 AM' },
  { id: 'm4', from: 'company' as const, text: 'First round of photos uploaded — check the Photos tab whenever you like.', time: '9:35 AM' },
];

export default function CustomerPortalDemoPage() {
  const t = useTranslations('demo.customerPortal');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [draft, setDraft] = useState('');

  const openBalance = demoInvoices
    .filter((i) => i.total - i.paid > 0)
    .reduce((sum, i) => sum + (i.total - i.paid), 0);
  const hasOverdue = demoInvoices.some((i) => i.overdue && i.total - i.paid > 0);

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      {/* Demo Banner */}
      <div className="bg-[#f5a623] text-[#1a1a2e] py-2 px-4 text-center">
        <p className="text-sm font-medium">
          <span className="bg-[#1a1a2e] text-white px-2 py-0.5 rounded font-bold mr-2">DEMO</span>
          {t('bannerText')}{' '}
          <Link href="/auth/signup" className="underline font-bold">
            {t('signUp')}
          </Link>{' '}
          {t('bannerSuffix')}
        </p>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{demoCompany.name}</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{demoCustomer.name}</p>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">
                {t('proLabel')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/" className="text-sm text-blue-600 font-medium">
              {t('exitDemo')}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-2xl p-6 text-white">
              <h1 className="text-xl font-bold">{t('welcome', { name: demoCustomer.firstName })}</h1>
              <p className="text-white/70 text-sm mt-1">
                {t('accountDescription', { company: demoCompany.name })}
              </p>
              <a
                href={`tel:${demoCompany.phone}`}
                className="inline-flex items-center gap-2 mt-3 bg-white/10 rounded-lg px-4 py-2 text-sm hover:bg-white/20 transition-colors no-underline"
              >
                📞 {t('callUs', { phone: demoCompany.phone })}
              </a>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{demoUpcoming.length}</p>
                <p className="text-xs text-gray-500">{t('upcoming')}</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <FileText className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">
                  {demoInvoices.filter((i) => i.total - i.paid > 0).length}
                </p>
                <p className="text-xs text-gray-500">{t('openInvoices')}</p>
              </div>
              <div className={`bg-white rounded-xl p-4 text-center shadow-sm ${hasOverdue ? 'ring-2 ring-red-200' : ''}`}>
                <span className={`block text-xl mx-auto mb-1 ${hasOverdue ? 'text-red-500' : 'text-green-500'}`}>$</span>
                <p className={`text-2xl font-bold ${hasOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  ${openBalance.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500">{hasOverdue ? t('overdue') : t('balance')}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">{t('nextAppointment')}</h2>
                <button
                  onClick={() => setActiveTab('tracker')}
                  className="text-sm text-blue-600 font-medium flex items-center gap-1"
                >
                  {t('liveTracker')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {demoUpcoming.map((job) => (
                <div key={job.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{job.title}</p>
                    <p className="text-sm text-gray-500">
                      {job.date} {t('at')} {job.time}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      job.status === 'in_progress'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {job.status === 'in_progress' ? t('inProgress') : t('scheduled')}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">{t('openInvoices')}</h2>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className="text-sm text-blue-600 font-medium flex items-center gap-1"
                >
                  {t('viewAll')} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {demoInvoices
                .filter((i) => i.total - i.paid > 0)
                .map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {inv.overdue ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{t('invoiceNumber', { number: inv.number })}</p>
                        <p className="text-xs text-gray-500">{t('dueDate', { date: inv.due })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${inv.overdue ? 'text-red-600' : 'text-gray-900'}`}>
                        ${(inv.total - inv.paid).toFixed(2)}
                      </p>
                      <span className="text-xs text-blue-600 font-medium">{t('payNow')}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-gray-900">{t('liveJobTracker')}</h2>
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  {t('live')}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{t('trackerSubtitle')}</p>

              <div className="bg-gray-100 rounded-xl h-40 flex items-center justify-center mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-green-50 to-emerald-50" />
                <div className="relative flex flex-col items-center text-gray-600">
                  <MapPin className="w-8 h-8 text-red-500" />
                  <p className="text-xs mt-1 font-medium">{t('crewOnSite')}</p>
                </div>
              </div>

              <ol className="space-y-3">
                {demoTrackerStages.map((stage) => (
                  <li key={stage.key} className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        stage.current
                          ? 'bg-green-500 text-white ring-4 ring-green-100'
                          : stage.done
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {stage.done ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${stage.done ? 'text-gray-900' : 'text-gray-400'}`}>
                        {stage.label}
                      </p>
                    </div>
                    <span className={`text-xs ${stage.current ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>
                      {stage.time}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">{t('jobPhotos')}</h2>
                <span className="text-xs text-gray-400">{demoPhotos.length} {t('photos')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {demoPhotos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-xl overflow-hidden relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${photo.color}`} />
                    <div className="absolute inset-0 flex items-center justify-center text-5xl">{photo.emoji}</div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs p-2 font-medium">
                      {photo.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">{t('amountDue')}</p>
              <p className="text-3xl font-bold text-gray-900">${openBalance.toFixed(2)}</p>
              {hasOverdue && (
                <p className="text-xs text-red-600 mt-1 font-medium">{t('overdueNotice')}</p>
              )}
            </div>
            {demoInvoices.map((inv) => {
              const balance = inv.total - inv.paid;
              const isPaid = balance <= 0;
              return (
                <div key={inv.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{t('invoiceNumber', { number: inv.number })}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isPaid ? t('paidOn', { date: inv.due }) : t('dueDate', { date: inv.due })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${inv.total.toFixed(2)}</p>
                      <span
                        className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          isPaid
                            ? 'bg-green-100 text-green-700'
                            : inv.overdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {isPaid ? t('paid') : inv.overdue ? t('overdue') : t('open')}
                      </span>
                    </div>
                  </div>
                  {!isPaid && (
                    <button className="w-full mt-3 py-2.5 bg-[#1a1a2e] text-white rounded-lg font-semibold text-sm">
                      {t('payNow')} — ${balance.toFixed(2)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl shadow-sm flex flex-col h-[70vh]">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">{demoCompany.name}</h2>
              <p className="text-xs text-gray-500">{t('typicalReply')}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {demoMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from === 'customer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.from === 'customer'
                        ? 'bg-blue-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`text-[10px] mt-1 ${
                        msg.from === 'customer' ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('messagePlaceholder', { company: demoCompany.name })}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={() => setDraft('')}
                disabled={!draft.trim()}
                className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:bg-gray-300"
                aria-label={t('sendMessage')}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CTA Overlay */}
      <div className="fixed bottom-20 left-4 right-4 max-w-3xl mx-auto bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-4 text-white shadow-lg z-40">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold truncate">{t('ctaTitle')}</div>
            <div className="text-sm text-white/70 truncate">{t('ctaSubtitle')}</div>
          </div>
          <Link
            href="/pricing#addons"
            className="px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold text-sm no-underline whitespace-nowrap"
          >
            {t('ctaButton')}
          </Link>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-3xl mx-auto flex justify-around">
          {([
            { key: 'home', icon: HomeIcon, label: t('navHome') },
            { key: 'tracker', icon: Truck, label: t('navTracker') },
            { key: 'invoices', icon: FileText, label: t('navInvoices') },
            { key: 'messages', icon: MessageSquare, label: t('navMessages') },
          ] as { key: TabKey; icon: typeof HomeIcon; label: string }[]).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center py-3 px-4 ${
                  isActive ? 'text-[#1a1a2e]' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
