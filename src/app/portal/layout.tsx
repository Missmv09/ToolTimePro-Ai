'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, FileText, Home, LogOut, User } from 'lucide-react';

interface PortalSession {
  token: string;
  customerName: string;
  companyName: string;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for token in URL (magic link) or localStorage
    const urlToken = searchParams.get('token');
    const storedToken = localStorage.getItem('portal_token');
    const token = urlToken || storedToken;

    if (!token) {
      if (pathname !== '/portal/login') {
        router.push('/portal/login');
      }
      setLoading(false);
      return;
    }

    // Validate token
    fetch(`/api/portal?action=profile&token=${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Invalid session');
        return res.json();
      })
      .then(data => {
        localStorage.setItem('portal_token', token);
        // Clean token from URL
        if (urlToken) {
          window.history.replaceState({}, '', pathname);
        }
        setSession({
          token,
          customerName: data.customer?.name || 'Customer',
          companyName: data.company?.name || 'ToolTime Pro',
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

  // Don't show layout on login page
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

  const navItems = [
    { href: '/portal', label: 'Home', icon: Home },
    { href: '/portal/appointments', label: 'Appointments', icon: Calendar },
    { href: '/portal/invoices', label: 'Invoices', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">{session.companyName}</p>
            <p className="font-semibold text-gray-900 text-sm">{session.customerName}</p>
          </div>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-3xl mx-auto flex justify-around">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-3 px-4 ${isActive ? 'text-navy-500' : 'text-gray-400'}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
