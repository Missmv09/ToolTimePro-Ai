'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Shield,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/blog', label: 'Blog', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading, isConfigured } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Verify platform admin access
  useEffect(() => {
    const verify = async () => {
      if (!isConfigured) {
        // Demo mode - allow access
        setIsVerified(true);
        setVerifying(false);
        return;
      }

      if (isLoading) return;

      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          router.push('/auth/login');
          return;
        }

        const res = await fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          setIsVerified(true);
        } else {
          // Not a platform admin - redirect to regular dashboard
          router.push('/dashboard');
        }
      } catch {
        router.push('/dashboard');
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [user, isLoading, isConfigured, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  if (verifying || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isVerified && isConfigured) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-gray-800 shadow-lg text-gray-300"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo/Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-700">
          <Shield size={24} className="text-orange-500 mr-3" />
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">ToolTime Pro</h1>
            <p className="text-orange-400 text-xs font-medium">Platform Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Back to Dashboard link */}
        <div className="px-4 mt-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            Back to Customer Dashboard
          </Link>
        </div>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Shield size={18} className="text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user?.email || 'Admin'}
              </p>
              <p className="text-xs text-orange-400">Platform Admin</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
