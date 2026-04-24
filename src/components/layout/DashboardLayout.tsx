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
  Repeat,
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
  Radio,
  CalendarDays,
  Route,
  CalendarCheck,
  Phone,
  Brain,
  BarChart3,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { usePlanGating } from '@/hooks/usePlanGating';
import { PermissionKey } from '@/lib/permissions';
import { FeatureKey } from '@/lib/plan-features';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TrialBanner from '@/components/trial/TrialBanner';
import TrialExpiredGate from '@/components/trial/TrialExpiredGate';
import NotificationBell from '@/components/notifications/NotificationBell';
import HelpButton from '@/components/help/HelpButton';
import CrispChat from '@/components/help/CrispChat';
import SessionTimeoutWarning from '@/components/auth/SessionTimeoutWarning';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItemOptions {
  isBetaTester: boolean;
  hasJennyExec: boolean;
  isOwner: boolean;
  can: (perm: PermissionKey) => boolean;
  canAccessFeature: (feature: FeatureKey) => boolean;
}

const getNavItems = ({ isBetaTester, hasJennyExec, isOwner, can, canAccessFeature }: NavItemOptions) => {
  const showExecFeatures = isOwner && (isBetaTester || hasJennyExec);

  // Core items visible to all authenticated users
  const items = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  if (canAccessFeature('dispatch_board')) items.push({ href: '/dashboard/dispatch', label: 'Dispatch Board', icon: Radio });
  if (canAccessFeature('schedule')) items.push({ href: '/dashboard/schedule', label: 'Schedule', icon: CalendarDays });

  items.push({ href: '/dashboard/jobs', label: 'Jobs', icon: ClipboardList });
  items.push({ href: '/dashboard/recurring-jobs', label: 'Recurring Jobs', icon: Repeat });

  if (canAccessFeature('route_optimizer')) items.push({ href: '/dashboard/route-optimizer', label: 'Route Optimizer', icon: Route });
  if (canAccessFeature('booking')) items.push({ href: '/dashboard/booking', label: 'Online Booking', icon: CalendarCheck });

  // Permission-gated admin features
  if (can('team_management') && canAccessFeature('team_management')) items.push({ href: '/dashboard/team', label: 'Team', icon: UsersRound });
  if (can('customers') && canAccessFeature('customers')) items.push({ href: '/dashboard/customers', label: 'Customers', icon: UserCircle });
  if (can('leads') && canAccessFeature('leads')) items.push({ href: '/dashboard/leads', label: 'Leads', icon: Users });

  // Quotes and invoices — plan-gated
  if (canAccessFeature('quoting')) items.push({ href: '/dashboard/quotes', label: 'Quotes', icon: Quote });
  if (canAccessFeature('invoicing')) items.push({ href: '/dashboard/invoices', label: 'Invoices', icon: Receipt });
  if (canAccessFeature('time_tracking')) items.push({ href: '/dashboard/time-logs', label: 'Time Logs', icon: Clock });

  items.push(
    { href: '/dashboard/jenny-lite', label: isBetaTester ? 'Jenny AI' : 'Jenny Lite', icon: MessageCircle },
  );

  if (canAccessFeature('jenny_pro')) items.push({ href: '/dashboard/jenny-pro', label: 'Jenny Pro', icon: Phone });

  if (canAccessFeature('website_builder')) items.push({ href: '/dashboard/website-builder', label: 'Website Builder', icon: Globe });
  if (canAccessFeature('blog')) items.push({ href: '/dashboard/blog', label: 'Blog', icon: BookOpen });

  // Owner-facing Jenny Exec Admin features: only visible to owners with the addon or beta testers
  if (showExecFeatures) {
    items.push(
      { href: '/dashboard/jenny-exec', label: 'Jenny Exec', icon: Brain },
      { href: '/dashboard/compliance', label: 'CA Compliance', icon: Shield },
      { href: '/dashboard/hr-toolkit', label: 'HR Toolkit', icon: FileText },
    );
  }

  if (canAccessFeature('invoicing')) items.push({ href: '/dashboard/payment-plans', label: 'Payment Plans', icon: CreditCard });

  if (can('settings')) items.push({ href: '/dashboard/reports', label: 'Reports', icon: BarChart3 });
  if (can('settings')) items.push({ href: '/dashboard/settings', label: 'Settings', icon: Settings });

  return items;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, dbUser, company, signOut, isLoading } = useAuth();
  const { can } = usePermissions();
  const { canAccess: canAccessFeature } = usePlanGating();
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

  // Extend timeout to 60 min on data-heavy compliance/HR pages (default 30 min elsewhere)
  const isComplianceRoute = pathname.startsWith('/dashboard/compliance') || pathname.startsWith('/dashboard/hr-toolkit');
  const sessionTimeoutMs = isComplianceRoute ? 60 * 60 * 1000 : undefined;

  const { showWarning, secondsRemaining, resetTimeout } = useSessionTimeout({
    onTimeout: handleSignOut,
    enabled: !!user,
    timeoutMs: sessionTimeoutMs,
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
    if (role === 'worker_admin') return 'Team Member + Admin';
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
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
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
            <div className="px-6 py-3 bg-navy-50 border-b border-gray-200 flex-shrink-0">
              <p className="text-xs text-gray-500">Company</p>
              <p className="text-sm font-medium text-navy-500 truncate">{company.name}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {getNavItems({
              isBetaTester: !!company?.is_beta_tester,
              hasJennyExec: (company?.addons || []).includes('jenny_exec_admin'),
              isOwner: dbUser?.role === 'owner',
              can,
              canAccessFeature,
            }).map((item) => {
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
          <div className="relative flex-shrink-0 p-4 border-t border-gray-200" ref={profileMenuRef}>
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
          {/* Top bar with notifications and help */}
          <div className="flex items-center justify-end gap-1 px-6 pt-4 lg:pt-6">
            <HelpButton />
            <NotificationBell />
          </div>
          <div className="p-6 lg:p-8 pt-2">
            <TrialBanner />
            <TrialExpiredGate>{children}</TrialExpiredGate>
          </div>
        </main>

        {showWarning && (
          <SessionTimeoutWarning
            secondsRemaining={secondsRemaining}
            onStayLoggedIn={resetTimeout}
            onLogOut={handleSignOut}
          />
        )}

        {/* Crisp live chat widget */}
        <CrispChat />
      </div>
    </ProtectedRoute>
  );
}
