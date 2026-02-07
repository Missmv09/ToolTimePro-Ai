'use client';

import { ReactNode, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import TrialBanner from '@/components/trial/TrialBanner';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: 'Jobs', icon: ClipboardList },
  { href: '/dashboard/team', label: 'Team', icon: UsersRound },
  { href: '/dashboard/customers', label: 'Customers', icon: UserCircle },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/quotes', label: 'Quotes', icon: Quote },
  { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
  { href: '/dashboard/time-logs', label: 'Time Logs', icon: Clock },
  { href: '/dashboard/compliance', label: 'CA Compliance', icon: Shield },
  { href: '/dashboard/hr-toolkit', label: 'HR Toolkit', icon: FileText },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, dbUser, company, signOut, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!isLoading && company && company.onboarding_completed === false) {
      router.push('/onboarding');
    }
  }, [isLoading, company, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

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
            {navItems.map((item) => {
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
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
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
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
      </div>
    </ProtectedRoute>
  );
}
