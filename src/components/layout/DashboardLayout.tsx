'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  FileText,
  Shield,
  Menu,
  X,
  ChevronRight,
  HardHat,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/jobs', label: 'Jobs', icon: ClipboardList },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/time-logs', label: 'Time Logs', icon: Clock },
  { href: '/dashboard/compliance', label: 'CA Compliance', icon: Shield },
  { href: '/dashboard/hr-toolkit', label: 'HR Toolkit', icon: FileText },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { dbUser, company, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  // Get user initials
  const getInitials = (name: string | undefined) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
              <HardHat className="w-5 h-5 text-navy-500" />
            </div>
            <span className="font-bold text-xl text-navy-500">ToolTime Pro</span>
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
                  {getInitials(dbUser?.full_name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy-500 truncate">
                  {dbUser?.full_name || 'Loading...'}
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
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
