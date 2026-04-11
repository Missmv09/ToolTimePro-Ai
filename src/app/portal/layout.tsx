'use client';

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, FileText, Home, LogOut, Truck, Camera, MessageSquare, FolderOpen, Clock, Lock, X, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

interface PortalSession {
  token: string;
  customerName: string;
  companyName: string;
  hasPortalPro: boolean;
}

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('portal.layout');

  // Pro-only routes
  const PRO_ROUTES = ['/portal/tracker', '/portal/photos', '/portal/messages', '/portal/documents', '/portal/history'];
  const isProRoute = PRO_ROUTES.some(r => pathname.startsWith(r));

  useEffect(() => {
    const urlToken = searchParams.get('token');
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('portal_token') : null;
    const token = urlToken || storedToken;

    if (!token) {
      if (pathname !== '/portal/login') {
        router.push('/portal/login');
      }
      setLoading(false);
      return;
    }

    // Fetch profile + pro status in parallel (token in header, not URL)
    Promise.all([
      fetch('/api/portal?action=profile', { headers: { 'x-portal-token': token } }).then(res => {
        if (!res.ok) throw new Error('Invalid session');
        return res.json();
      }),
      fetch('/api/portal?action=check_pro', { headers: { 'x-portal-token': token } }).then(res => res.json()).catch(() => ({ hasPortalPro: false })),
    ])
      .then(([profileData, proData]) => {
        localStorage.setItem('portal_token', token);
        if (urlToken) {
          window.history.replaceState({}, '', pathname);
        }
        setSession({
          token,
          customerName: profileData.customer?.name || 'Customer',
          companyName: profileData.company?.name || 'ToolTime Pro',
          hasPortalPro: proData.hasPortalPro || false,
        });
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('portal_token');
        if (pathname !== '/portal/login') {
          router.push('/portal/login');
        }
        setLoading(false);
      });
  }, [pathname, router, searchParams]);

  // Redirect from pro routes if not subscribed
  useEffect(() => {
    if (!loading && session && isProRoute && !session.hasPortalPro) {
      setShowUpgradePrompt(true);
    }
  }, [loading, session, isProRoute]);

  const handleLogout = async () => {
    const token = localStorage.getItem('portal_token');
    if (token) {
      await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-portal-token': token },
        body: JSON.stringify({ action: 'logout' }),
      });
    }
    localStorage.removeItem('portal_token');
    router.push('/portal/login');
  };

  if (pathname === '/portal/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-500"></div>
      </div>
    );
  }

  if (!session) return null;

  const hasPro = session.hasPortalPro;

  // Free nav items (always shown)
  const freeNavItems = [
    { href: '/portal', label: t('home'), icon: Home },
    { href: '/portal/appointments', label: t('appointments'), icon: Calendar },
    { href: '/portal/invoices', label: t('invoices'), icon: FileText },
  ];

  // Pro nav items (shown with lock if not subscribed)
  const proNavItems = [
    { href: '/portal/tracker', label: t('tracker'), icon: Truck },
    { href: '/portal/messages', label: t('messages'), icon: MessageSquare },
  ];

  // All nav items combined
  const allNavItems = [...freeNavItems, ...proNavItems];

  // Secondary pro pages (accessible via main pages, not bottom nav)
  // Photos, Documents, History — linked from within Tracker/Messages/History

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{session.companyName}</p>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{session.customerName}</p>
              {hasPro && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold-100 text-gold-700 uppercase">{t('proLabel')}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {hasPro && (
              <div className="flex gap-1">
                <Link href="/portal/photos" className={`p-2 rounded-lg hover:bg-gray-100 ${pathname === '/portal/photos' ? 'bg-gray-100' : ''}`}>
                  <Camera className="w-4 h-4 text-gray-500" />
                </Link>
                <Link href="/portal/documents" className={`p-2 rounded-lg hover:bg-gray-100 ${pathname === '/portal/documents' ? 'bg-gray-100' : ''}`}>
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                </Link>
                <Link href="/portal/history" className={`p-2 rounded-lg hover:bg-gray-100 ${pathname === '/portal/history' ? 'bg-gray-100' : ''}`}>
                  <Clock className="w-4 h-4 text-gray-500" />
                </Link>
              </div>
            )}
            <Link href="/portal/preferences" className={`p-2 rounded-lg hover:bg-gray-100 ${pathname === '/portal/preferences' ? 'bg-gray-100' : ''}`} title="Preferences">
              <Settings className="w-4 h-4 text-gray-500" />
            </Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {/* Upgrade prompt for pro routes */}
        {showUpgradePrompt && !hasPro && isProRoute ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
              <div className="w-16 h-16 bg-gold-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-gold-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{t('portalProFeature')}</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                {t('portalProDescription')}
              </p>
              <div className="mt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
                  {[
                    { icon: Truck, label: t('liveJobTracker') },
                    { icon: Camera, label: t('photoGallery') },
                    { icon: MessageSquare, label: t('directMessaging') },
                    { icon: FolderOpen, label: t('documentVault') },
                    { icon: Clock, label: t('serviceHistory') },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-gray-600">
                      <item.icon className="w-4 h-4 text-gold-500" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setShowUpgradePrompt(false); router.push('/portal'); }}
                className="mt-6 px-6 py-2.5 bg-navy-500 text-white rounded-xl font-medium hover:bg-navy-600 transition-colors"
              >
                {t('backToPortal')}
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-3xl mx-auto flex justify-around">
          {allNavItems.map(item => {
            const isActive = pathname === item.href;
            const isPro = proNavItems.some(p => p.href === item.href);
            const isLocked = isPro && !hasPro;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-3 relative ${
                  isActive ? 'text-navy-500' : isLocked ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {isLocked && (
                    <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-gold-500" />
                  )}
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navy-500"></div>
      </div>
    }>
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </Suspense>
  );
}
