'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Phone,
  Clock,
  ThumbsUp,
  AlertCircle,
  MapPin,
} from 'lucide-react';

interface SafetyCheckIn {
  id: string;
  time: string;
  status: 'ok' | 'pending' | 'alert';
}

const EMERGENCY_CONTACTS = [
  { id: '1', name: 'Dispatch', phone: '(555) 123-4567', icon: Phone },
  { id: '2', name: 'Manager (John)', phone: '(555) 987-6543', icon: Phone },
  { id: '3', name: '911 Emergency', phone: '911', icon: AlertTriangle },
];

export default function SafetyPage() {
  const [lastCheckIn, setLastCheckIn] = useState<Date | null>(null);
  const [checkInTimer, setCheckInTimer] = useState<number>(0);
  const [todaysCheckIns, setTodaysCheckIns] = useState<SafetyCheckIn[]>([
    { id: '1', time: '9:15 AM', status: 'ok' },
    { id: '2', time: '11:30 AM', status: 'ok' },
    { id: '3', time: '1:30 PM', status: 'pending' },
  ]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Calculate time since last check-in
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastCheckIn) {
        const diff = Math.floor((Date.now() - lastCheckIn.getTime()) / 1000);
        setCheckInTimer(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCheckIn]);

  // Format timer display
  const formatTimer = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Handle safety check-in confirmation
  const confirmSafetyOK = () => {
    const now = new Date();
    setLastCheckIn(now);
    setCheckInTimer(0);

    // Update today's check-ins
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    setTodaysCheckIns((prev) => {
      // Update pending to OK if exists
      const updated = prev.map((checkIn) =>
        checkIn.status === 'pending' ? { ...checkIn, status: 'ok' as const, time: timeStr } : checkIn
      );
      // Add new if no pending was found
      if (!prev.some((c) => c.status === 'pending')) {
        updated.push({
          id: String(Date.now()),
          time: timeStr,
          status: 'ok',
        });
      }
      return updated;
    });

    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 3000);
  };

  // Call emergency contact
  const callContact = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^\d]/g, '')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-500">Safety Center</h1>
        <p className="text-gray-500 text-sm">Stay safe on every job</p>
      </div>

      {/* Safety Check-in Card */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-blue-500" />
          </div>

          <h2 className="text-xl font-bold text-navy-500 mb-2">Safety Check-in</h2>
          <p className="text-gray-500 text-sm mb-6">
            You&apos;ve been on-site for 2 hours. Please confirm you&apos;re OK to continue
            working safely.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={confirmSafetyOK}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <ThumbsUp className="w-5 h-5" />
              I&apos;m OK
            </button>

            <a
              href="tel:911"
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors block"
            >
              <AlertTriangle className="w-5 h-5" />
              Need Help
            </a>
          </div>

          {/* Timer Warning */}
          <div className="mt-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              No response in 15 min = Manager automatically alerted
            </p>
          </div>
        </div>
      </div>

      {/* Today's Safety Log */}
      <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Today&apos;s Safety Log
        </h3>

        <div className="space-y-3">
          {todaysCheckIns.map((checkIn) => (
            <div key={checkIn.id} className="flex items-center gap-3 py-2">
              {checkIn.status === 'ok' ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : checkIn.status === 'pending' ? (
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
              <span className="text-gray-700">
                {checkIn.time} -{' '}
                {checkIn.status === 'ok'
                  ? 'Checked in OK'
                  : checkIn.status === 'pending'
                  ? 'Pending'
                  : 'Alert sent'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GPS Status */}
      <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Location Sharing
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-navy-500">GPS Active</p>
            <p className="text-sm text-gray-500">Location shared with dispatch</p>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Emergency Contacts
        </h3>

        <div className="space-y-3">
          {EMERGENCY_CONTACTS.map((contact) => (
            <button
              key={contact.id}
              onClick={() => callContact(contact.phone)}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  contact.phone === '911' ? 'bg-red-100' : 'bg-blue-100'
                }`}
              >
                <contact.icon
                  className={`w-5 h-5 ${
                    contact.phone === '911' ? 'text-red-600' : 'text-blue-600'
                  }`}
                />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-navy-500">{contact.name}</p>
                <p className="text-sm text-gray-500">{contact.phone}</p>
              </div>
              <Phone className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Safety Tips */}
      <div className="bg-gradient-to-r from-navy-500 to-navy-600 rounded-2xl p-5 mt-4 text-white">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-gold-400" />
          Safety Reminders
        </h3>
        <ul className="space-y-2 text-sm text-white/80">
          <li className="flex items-start gap-2">
            <span className="text-gold-400">-</span>
            Always wear proper PPE for the job
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold-400">-</span>
            Stay hydrated, especially in hot weather
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold-400">-</span>
            Report any hazards immediately
          </li>
          <li className="flex items-start gap-2">
            <span className="text-gold-400">-</span>
            Take your required breaks
          </li>
        </ul>
      </div>

      {/* Confirmation Toast */}
      {showConfirmation && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Safety check-in confirmed!</span>
        </div>
      )}
    </div>
  );
}
