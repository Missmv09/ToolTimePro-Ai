'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HardHat, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations('auth.resetPassword');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    // If the URL contains token_hash + type (direct link from our branded
    // reset email), verify the OTP to establish a recovery session.  This
    // avoids the PKCE code_verifier mismatch that would occur if the link
    // went through Supabase's /auth/v1/verify redirect.
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    const code = url.searchParams.get('code');

    const exchangeToken = async () => {
      try {
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'recovery',
          });
          if (error) {
            console.error('Error verifying recovery OTP:', error);
            setIsCheckingSession(false);
            return;
          }
          setIsValidSession(true);
          setIsCheckingSession(false);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('Error exchanging code for session:', error);
            setIsCheckingSession(false);
            return;
          }
          setIsValidSession(true);
          setIsCheckingSession(false);
          return;
        }
      } catch (err) {
        console.error('Token exchange error:', err);
      }

      // No token params — fall through to session/listener check below.
      checkExistingSession();
    };

    const checkExistingSession = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidSession(true);
        }
        setIsCheckingSession(false);
      });
    };

    if (tokenHash || code) {
      exchangeToken();
    } else {
      // Listen for auth state changes so we detect the recovery session
      // once Supabase finishes processing the URL hash tokens.
      checkExistingSession();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          setIsValidSession(true);
          setIsCheckingSession(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError(t('minLength'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('mismatch'));
      return;
    }

    setIsLoading(true);

    // Get the current session token before updating the password
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // Invalidate ALL sessions globally so any other device/browser
    // using the old password is forced to re-authenticate.
    if (currentSession?.access_token) {
      await fetch('/api/auth/signout-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      }).catch(() => {
        // Non-critical — the password was still changed
      });
    }

    // Sign out locally so this browser also requires a fresh login
    await supabase.auth.signOut();

    setSuccess(true);
    setIsLoading(false);

    // Redirect to login after brief confirmation
    setTimeout(() => {
      router.push('/auth/login');
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-500 mb-2">{t('successTitle')}</h1>
          <p className="text-gray-600 mb-6">
            {t('successMessage')}
          </p>
        </div>
      </div>
    );
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 border-4 border-[#f5a623]/30 border-t-[#f5a623] rounded-full animate-spin mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-navy-500 mb-2">{t('verifyingTitle')}</h1>
          <p className="text-gray-600">{t('verifyingMessage')}</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          <h1 className="text-2xl font-bold text-navy-500 mb-2">{t('invalidTitle')}</h1>
          <p className="text-gray-600 mb-6">
            {t('invalidMessage')}
          </p>
          <Link href="/auth/forgot-password" className="btn-secondary w-full inline-block text-center">
            {t('requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-gradient flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pt-12 pb-8 px-4 max-w-md mx-auto w-full">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gold-500 rounded-xl flex items-center justify-center">
            <HardHat className="w-7 h-7 text-navy-500" />
          </div>
          <span className="text-2xl font-bold text-white">ToolTime Pro</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Form Card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-navy-500 mb-2">{t('title')}</h1>
          <p className="text-gray-600 mb-6">
            {t('subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="input-label">{t('newPasswordLabel')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('placeholder')}
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
              <label className="input-label">{t('confirmPasswordLabel')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmPlaceholder')}
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
                  {t('updating')}
                </span>
              ) : (
                t('updateButton')
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
