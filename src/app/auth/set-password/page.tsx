'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HardHat, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

async function triggerWelcomeEmail() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch('/api/send-welcome-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch {
    // Non-critical — don't block the user flow
  }
}

export default function SetPasswordPage() {
  const router = useRouter();
  const { user, company, isLoading: authLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const codeHandled = useRef(false);

  // If Supabase redirected here with an auth code (signup magic link),
  // exchange it for a session before doing anything else.
  useEffect(() => {
    if (codeHandled.current) return;
    codeHandled.current = true;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');

    const exchangeAuth = async () => {
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (tokenHash && type) {
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'signup' | 'magiclink' | 'recovery' | 'email',
          });
        }
      } catch (err) {
        console.error('Auth exchange error:', err);
      }
      setSessionReady(true);
    };

    if (code || tokenHash) {
      exchangeAuth();
    } else {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !sessionReady) return;

    // If no user session, redirect to login
    if (!user) {
      const timeout = setTimeout(() => {
        router.replace('/auth/login');
      }, 5000);
      return () => clearTimeout(timeout);
    }

    // If the user already set their password, skip this page.
    // Check both user_metadata and app_metadata — the flag could be in either.
    const needsPw =
      user.app_metadata?.needs_password === true ||
      user.user_metadata?.needs_password === true;
    if (!needsPw) {
      if (company?.onboarding_completed) {
        router.replace('/dashboard');
      } else {
        router.replace('/onboarding');
      }
    }
  }, [user, company, authLoading, sessionReady, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    // Set the user's real password and clear the needs_password flag
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
      data: { needs_password: false },
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    // Also clear needs_password from app_metadata via the admin API.
    // app_metadata can only be modified server-side.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/auth/password-setup-complete', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }
    } catch {
      // Non-critical — the user_metadata flag is already cleared
    }

    setSuccess(true);
    setIsLoading(false);

    // Fire the welcome email in the background (non-blocking)
    triggerWelcomeEmail();

    // Redirect to onboarding (or dashboard if already onboarded)
    setTimeout(() => {
      if (company?.onboarding_completed) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-500 mb-2">You&apos;re All Set!</h1>
          <p className="text-gray-600 mb-6">
            Your password has been saved. Taking you to set up your account...
          </p>
        </div>
      </div>
    );
  }

  if (!user && !authLoading && sessionReady) {
    return (
      <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-navy-500 mb-2">Invalid or Expired Link</h1>
          <p className="text-gray-600 mb-6">
            This confirmation link is invalid or has expired.
            Please sign up again.
          </p>
          <Link href="/auth/signup" className="btn-secondary w-full inline-block text-center">
            Sign Up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center pt-12 pb-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gold-500 rounded-xl flex items-center justify-center">
            <HardHat className="w-7 h-7 text-navy-500" />
          </div>
          <span className="text-2xl font-bold text-white">ToolTime Pro</span>
        </Link>
      </div>

      {/* Form Card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-navy-500 mb-2">Set Your Password</h1>
          <p className="text-gray-600 mb-6">
            Email verified! Create a password to secure your account.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="input pl-10 pr-10"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="input-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="input pl-10"
                  minLength={8}
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-secondary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-navy-500 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Set Password & Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
