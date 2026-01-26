'use client';

import { useState } from 'react';
import Link from 'next/link';

// Demo data for calendar
const demoJobs = [
  { id: '1', title: 'Lawn Mowing', customer: 'John Martinez', time: '9:00 AM', duration: '1.5 hrs', status: 'confirmed', tech: 'Miguel R.' },
  { id: '2', title: 'Landscaping Service', customer: 'Sarah Chen', time: '11:00 AM', duration: '2 hrs', status: 'confirmed', tech: 'Carlos M.' },
  { id: '3', title: 'Sprinkler Repair', customer: 'Mike Thompson', time: '2:00 PM', duration: '1 hr', status: 'pending', tech: 'David L.' },
  { id: '4', title: 'Tree Trimming', customer: 'Emily Davis', time: '4:00 PM', duration: '2 hrs', status: 'confirmed', tech: 'Miguel R.' },
];

const demoWeekJobs = [
  { day: 'Mon', count: 4, revenue: 520 },
  { day: 'Tue', count: 6, revenue: 780 },
  { day: 'Wed', count: 5, revenue: 650 },
  { day: 'Thu', count: 3, revenue: 390 },
  { day: 'Fri', count: 7, revenue: 910 },
  { day: 'Sat', count: 4, revenue: 480 },
  { day: 'Sun', count: 0, revenue: 0 },
];

const demoTechs = [
  { id: '1', name: 'Miguel R.', avatar: '👷', color: '#4CAF50' },
  { id: '2', name: 'Carlos M.', avatar: '👷', color: '#2196F3' },
  { id: '3', name: 'David L.', avatar: '👷', color: '#9C27B0' },
];

export default function SchedulingDemoPage() {
  const [selectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Demo Banner */}
      <div className="bg-[#1a1a2e] text-white py-3 px-4 text-center">
        <p className="text-sm">
          <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded font-bold mr-2">
            DEMO
          </span>
          This is a preview of the smart scheduling system.{' '}
          <Link href="/auth/signup" className="text-[#f5a623] underline">
            Sign up
          </Link>{' '}
          to manage your own schedule.
        </p>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">📅</span>
            <h1 className="text-3xl font-bold">Smart Scheduling Demo</h1>
          </div>
          <p className="text-white/80">See how ToolTime Pro helps you manage jobs, crews, and customer appointments</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Calendar Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-xl">←</span>
              </button>
              <h2 className="text-xl font-bold text-[#1a1a2e]">{formatDate(selectedDate)}</h2>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="text-xl">→</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'day' ? 'bg-white shadow-sm text-[#1a1a2e]' : 'text-gray-600'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === 'week' ? 'bg-white shadow-sm text-[#1a1a2e]' : 'text-gray-600'
                  }`}
                >
                  Week
                </button>
              </div>
              <button className="px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-semibold hover:bg-[#e6991a] transition-colors">
                + New Job
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Calendar / Job List */}
          <div className="lg:col-span-2">
            {viewMode === 'day' ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-[#1a1a2e]">Today&apos;s Jobs ({demoJobs.length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {demoJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="text-center min-w-[60px]">
                            <div className="text-lg font-bold text-[#1a1a2e]">{job.time}</div>
                            <div className="text-xs text-gray-500">{job.duration}</div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-[#1a1a2e]">{job.title}</h4>
                            <p className="text-sm text-gray-600">{job.customer}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm">👷</span>
                              <span className="text-sm text-gray-600">{job.tech}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            job.status === 'confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {job.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-[#1a1a2e]">Week Overview</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-7 gap-2">
                    {demoWeekJobs.map((day, index) => (
                      <div
                        key={day.day}
                        className={`p-4 rounded-xl text-center transition-colors cursor-pointer ${
                          index === 0 ? 'bg-[#fef3d6] border-2 border-[#f5a623]' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-500 mb-1">{day.day}</div>
                        <div className="text-2xl font-bold text-[#1a1a2e]">{day.count}</div>
                        <div className="text-xs text-gray-500">jobs</div>
                        {day.revenue > 0 && (
                          <div className="text-sm font-semibold text-green-600 mt-2">${day.revenue}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { icon: '📋', label: 'Quick Quote', desc: 'Create a quote' },
                { icon: '📅', label: 'Block Time', desc: 'Mark unavailable' },
                { icon: '🔄', label: 'Recurring', desc: 'Set up repeating' },
                { icon: '👥', label: 'Assign Crew', desc: 'Manage workers' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-[#f5a623] hover:shadow-md transition-all"
                >
                  <span className="text-2xl mb-2 block">{action.icon}</span>
                  <div className="font-semibold text-[#1a1a2e] text-sm">{action.label}</div>
                  <div className="text-xs text-gray-500">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Availability */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-[#1a1a2e] mb-4">Team Availability</h3>
              <div className="space-y-3">
                {demoTechs.map((tech) => (
                  <div key={tech.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${tech.color}20`, borderColor: tech.color, borderWidth: 2 }}
                      >
                        {tech.avatar}
                      </div>
                      <span className="font-medium text-[#1a1a2e]">{tech.name}</span>
                    </div>
                    <span className="text-sm text-green-600 font-medium">Available</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today&apos;s Stats */}
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-4">Today&apos;s Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-bold text-[#f5a623]">4</div>
                  <div className="text-sm text-white/70">Jobs Scheduled</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#f5a623]">$520</div>
                  <div className="text-sm text-white/70">Est. Revenue</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#f5a623]">3</div>
                  <div className="text-sm text-white/70">Techs Working</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#f5a623]">6.5</div>
                  <div className="text-sm text-white/70">Hours Booked</div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-[#fef3d6] rounded-xl p-6 text-center">
              <h3 className="font-bold text-[#1a1a2e] mb-2">Sync with Your Calendar</h3>
              <p className="text-sm text-[#5c5c70] mb-4">
                Connect Google Calendar, Outlook, or Apple Calendar to avoid double-bookings.
              </p>
              <Link
                href="/auth/signup"
                className="inline-block px-6 py-3 bg-[#1a1a2e] text-white rounded-xl font-semibold hover:bg-[#2d2d4a] transition-colors no-underline"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Take Control of Your Schedule</h2>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Stop double-booking and missing appointments. ToolTime Pro&apos;s smart scheduler syncs with your calendar,
            sends automatic reminders, and lets customers book online 24/7.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold hover:bg-[#e6991a] transition-colors no-underline"
            >
              Get Started Free
            </Link>
            <Link
              href="/demo/booking"
              className="px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors no-underline"
            >
              See Customer Booking →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-[#5c5c70]">
            Powered by{' '}
            <Link href="/" className="text-[#f5a623] font-medium no-underline hover:underline">
              ToolTime Pro
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
