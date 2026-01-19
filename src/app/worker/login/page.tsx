'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, Phone, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function WorkerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login - in production, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo: Accept any phone + PIN 1234
    if (pin === '1234') {
      router.push('/worker');
    } else {
      setError('Invalid PIN. Try 1234 for demo.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-navy-gradient flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-gold-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
          <HardHat className="w-12 h-12 text-navy-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">ToolTime Pro</h1>
        <p className="text-white/60 text-center">Worker App</p>
      </div>

      {/* Login Form */}
      <div className="bg-white rounded-t-3xl p-6 pt-8">
        <h2 className="text-xl font-bold text-navy-500 mb-6">Sign In</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Input */}
          <div>
            <label className="input-label">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="input pl-10"
                maxLength={14}
                required
              />
            </div>
          </div>

          {/* PIN Input */}
          <div>
            <label className="input-label">4-Digit PIN</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Enter PIN"
                className="input pl-10 pr-10"
                maxLength={4}
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
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
            disabled={isLoading || phone.length < 14 || pin.length < 4}
            className="btn-secondary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Demo Note */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 text-center">
            <strong>Demo Mode:</strong> Enter any phone number and PIN <strong>1234</strong> to login.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Need help? Contact your supervisor or admin.
        </p>
      </div>
    </div>
  );
}
