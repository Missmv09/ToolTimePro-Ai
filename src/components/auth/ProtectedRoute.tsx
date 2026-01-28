'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'owner' | 'admin' | 'worker';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, dbUser, isLoading, isConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If Supabase isn't configured, allow access (demo mode)
    if (!isConfigured) {
      return;
    }

    // Only redirect if auth has finished loading and there's no user
    if (!isLoading && !user) {
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
  }, [user, dbUser, isLoading, isConfigured, router, requiredRole]);

  // Show loading spinner while auth is initializing (but only if Supabase is configured)
  if (isLoading && isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If Supabase isn't configured, show content (demo mode)
  if (!isConfigured) {
    return <>{children}</>;
  }

  // If no user after loading, return null (redirect will happen in useEffect)
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
