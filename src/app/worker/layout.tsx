'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Clock, User, HardHat } from 'lucide-react';

interface WorkerLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/worker', label: 'Jobs', icon: ClipboardList },
  { href: '/worker/time', label: 'Time', icon: Clock },
  { href: '/worker/profile', label: 'Profile', icon: User },
];

export default function WorkerLayout({ children }: WorkerLayoutProps) {
  const pathname = usePathname();

  // Don't show nav on login page
  if (pathname === '/worker/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
            <HardHat className="w-5 h-5 text-navy-500" />
          </div>
          <span className="font-bold">ToolTime Pro</span>
        </div>
        <div className="text-sm text-white/70">Worker App</div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 z-10">
        <div className="flex justify-around max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                  isActive
                    ? 'text-gold-500'
                    : 'text-gray-400 hover:text-navy-500'
                }`}
              >
                <item.icon size={24} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
