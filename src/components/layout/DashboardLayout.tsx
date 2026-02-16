'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  UserCircle,
  ClipboardList,
  Clock,
  FileText,
  Receipt,
  Shield,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Settings,
  Quote,
  Globe,
  BookOpen,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TrialBanner from '@/components/trial/TrialBanner';
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface DashboardLayoutProps {
  children: ReactNode;
}

const getNavItems = (isBetaTester: boolean) => [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: 'Jobs', icon: ClipboardList },
  { href: '/dashboard/team', label: 'Team', icon: UsersRound },
  { href: '/dashboard/customers', label: 'Customers', icon: UserCircle },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/quotes', label: 'Quotes', icon: Quote },
  { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
  { href: '/dashboard/time-logs', label: 'Time Logs', icon: Clock },
  { href: '/dashboard/jenny-lite', label: isBetaTester ? 'Jenny AI' : 'Jenny Lite', icon: MessageCircle },
  { href: '/dashboard/website-builder', label: 'Website Builder', icon: Globe },
  { href: '/dashboard/blog', label: 'Blog', icon: BookOpen },
  { href: '/dashboard/compliance', label: 'CA Compliance', icon: Shield },
  { href: '/dashboard/hr-toolkit', label: 'HR Toolkit', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, dbUser, company, signOut, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!isLoading && company && !company.onboarding_completed) {
      router.push('/onboarding');
    }
  }, [isLoading, company, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const { showWarning, secondsRemaining, resetTimeout } = useSessionTimeout({
    onTimeout: handleSignOut,
    enabled: !!user,
  });

  // Get user initials from name or email
  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  // Get display name (full name or email)
  const getDisplayName = () => {
    if (dbUser?.full_name) return dbUser.full_name;
    if (user?.email) return user.email;
    return 'User';
  };

  // Format role for display
  const formatRole = (role: string | undefined) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile menu button */}
        <div className="lg:hidden fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-white shadow-card text-navy-500"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200">
            <Link href="/dashboard">
              <Image
                src="/logo-01262026.png"
                alt="ToolTime Pro"
                width={160}
                height={36}
                className="h-9 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Company Name */}
          {company && (
            <div className="px-6 py-3 bg-navy-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">Company</p>
              <p className="text-sm font-medium text-navy-500 truncate">{company.name}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {getNavItems(!!company?.is_beta_tester).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200" ref={profileMenuRef}>
            {/* Dropdown menu */}
            {profileMenuOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  href="/dashboard/settings"
                  onClick={() => { setProfileMenuOpen(false); setSidebarOpen(false); }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings size={16} />
                  <span>Settings</span>
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-3 w-full text-left rounded-lg hover:bg-gray-50 transition-colors p-1 -m-1"
            >
              <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-navy-500">
                  {getInitials(dbUser?.full_name, user?.email)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-500 truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {formatRole(dbUser?.role)}
                </p>
              </div>
              <ChevronRight size={16} className={`text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </aside>

        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="lg:pl-64">
          <div className="p-6 lg:p-8">
            <TrialBanner />
            {children}
          </div>
        </main>

        {showWarning && (
          <SessionTimeoutWarning
            secondsRemaining={secondsRemaining}
            onStayLoggedIn={resetTimeout}
            onLogOut={handleSignOut}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
