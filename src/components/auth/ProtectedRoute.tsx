'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'worker';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, dbUser, isLoading } = useAuth();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Safety timeout - if loading takes more than 5 seconds, show content anyway
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout reached');
        setLoadingTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    // Only redirect if we're sure auth has finished and there's no user
    if (!isLoading && !user && !loadingTimeout) {
      router.push('/auth/login');
    }

    // Check role if required
    if (!isLoading && user && dbUser && requiredRole) {
      const roleHierarchy = { owner: 3, admin: 2, worker: 1 };
      const userRoleLevel = roleHierarchy[dbUser.role as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        router.push('/dashboard');
      }
    }
  }, [user, dbUser, isLoading, router, requiredRole, loadingTimeout]);

  // Show loading only if actually loading AND timeout hasn't been reached
  if (isLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If timeout reached but no user, redirect to login
  if (loadingTimeout && !user) {
    router.push('/auth/login');
    return null;
  }

  if (!user && !loadingTimeout) {
    return null;
  }

  return <>{children}</>;
}
