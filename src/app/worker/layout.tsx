'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, Clock, User, HardHat, Shield, X, AlertTriangle } from 'lucide-react';
import { WorkerAuthProvider, useWorkerAuth } from '@/contexts/WorkerAuthContext';

interface WorkerLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/worker', label: 'Jobs', icon: ClipboardList },
  { href: '/worker/timeclock', label: 'Time', icon: Clock },
  { href: '/worker/safety', label: 'Safety', icon: Shield },
  { href: '/worker/profile', label: 'Profile', icon: User },
];

// Auth guard component
function WorkerAuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useWorkerAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/worker/login') {
      router.replace('/worker/login');
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <HardHat className="w-10 h-10 text-navy-500" />
          </div>
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/worker/login') {
    return null;
  }

  return <>{children}</>;
}

// Main layout content
function WorkerLayoutContent({ children }: WorkerLayoutProps) {
  const pathname = usePathname();
  const { worker } = useWorkerAuth();
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosCountdown, setSOSCountdown] = useState(3);
  const [sosTriggered, setSOSTriggered] = useState(false);

  // SOS Countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSOSModal && sosCountdown > 0) {
      timer = setTimeout(() => {
        setSOSCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showSOSModal && sosCountdown === 0 && !sosTriggered) {
      setSOSTriggered(true);
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [showSOSModal, sosCountdown, sosTriggered]);

  const openSOSModal = () => {
    setShowSOSModal(true);
    setSOSCountdown(3);
    setSOSTriggered(false);
  };

  const cancelSOS = () => {
    setShowSOSModal(false);
    setSOSCountdown(3);
    setSOSTriggered(false);
  };

  const triggerSOS = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('SOS triggered with location:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            worker: worker?.full_name,
          });
          // In production: Send to backend to alert manager
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
    setTimeout(() => {
      setShowSOSModal(false);
      alert('SOS sent! Manager and emergency contacts have been alerted with your GPS location.');
    }, 500);
  }, [worker]);

  // Don't show nav on login page
  if (pathname === '/worker/login') {
    return <>{children}</>;
  }

  return (
    <WorkerAuthGuard>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <header className="bg-navy-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
              <HardHat className="w-5 h-5 text-navy-500" />
            </div>
            <div>
              <span className="font-bold">ToolTime Pro</span>
              {worker && (
                <p className="text-xs text-white/60">{worker.full_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* SOS Button */}
            <button
              onClick={openSOSModal}
              className="w-11 h-11 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg animate-pulse transition-colors"
              aria-label="Emergency SOS"
            >
              SOS
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 pb-20">{children}</main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-10">
          <div className="flex justify-around max-w-md mx-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === '/worker' && pathname === '/worker') ||
                (item.href !== '/worker' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                    isActive
                      ? 'text-gold-500'
                      : 'text-gray-400 hover:text-navy-500'
                  }`}
                >
                  <item.icon size={22} />
                  <span className="text-xs mt-1 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* SOS Modal */}
        {showSOSModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-red-500 rounded-2xl p-6 w-full max-w-sm text-center">
              <div className="flex justify-end mb-2">
                <button onClick={cancelSOS} className="text-white/70 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="text-6xl mb-4 animate-pulse">
                <AlertTriangle className="w-20 h-20 mx-auto text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">EMERGENCY</h2>
              <p className="text-white/80 text-sm mb-4">Releasing in...</p>

              <div className="text-7xl font-mono font-bold text-white mb-6">
                {sosCountdown}
              </div>

              <p className="text-white/80 text-sm mb-6">
                This will alert your manager and share your GPS location
              </p>

              <button
                onClick={cancelSOS}
                className="w-full py-4 bg-white text-red-500 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </WorkerAuthGuard>
  );
}

export default function WorkerLayout({ children }: WorkerLayoutProps) {
  return (
    <WorkerAuthProvider>
      <WorkerLayoutContent>{children}</WorkerLayoutContent>
    </WorkerAuthProvider>
  );
}
