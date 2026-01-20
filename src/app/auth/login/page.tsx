'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HardHat, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // Redirect to dashboard on success
    router.push('/dashboard');
  };

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
          <h1 className="text-2xl font-bold text-navy-500 mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-6">Sign in to your account</p>

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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="input-label mb-0">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-gold-500 hover:text-gold-600"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pl-10 pr-10"
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
                  Signing In...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight size={20} />
                </span>
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-semibold text-gold-500 hover:text-gold-600">
                Start Free Trial
              </Link>
            </p>
          </div>

          {/* Worker Login Link */}
          <div className="mt-4 text-center">
            <Link
              href="/worker/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Worker? Login here with your PIN
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
