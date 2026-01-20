'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HardHat, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-gradient flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-500 mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            We sent a password reset link to <strong>{email}</strong>.
            Click the link to reset your password.
          </p>
          <Link href="/auth/login" className="btn-primary w-full inline-block text-center">
            Back to Login
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
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-navy-500 mb-6"
          >
            <ArrowLeft size={20} />
            Back to Login
          </Link>

          <h1 className="text-2xl font-bold text-navy-500 mb-2">Reset Password</h1>
          <p className="text-gray-600 mb-6">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="input-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input pl-10"
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
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
