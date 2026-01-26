'use client';

import { useState } from 'react';
import Link from 'next/link';

// Demo data for worker app
const demoUser = {
  name: 'Miguel Rodriguez',
  role: 'Field Technician',
  company: 'Green Scene Landscaping',
};

const demoJobs = [
  {
    id: '1',
    customer: 'Maria Santos',
    address: '1234 Oak Street, Los Angeles, CA',
    service: 'Weekly Lawn Care',
    time: '9:00 AM - 10:30 AM',
    status: 'current',
    notes: 'Gate code: 1234. Dog in backyard - friendly.',
    price: '$85',
  },
  {
    id: '2',
    customer: 'Robert Chen',
    address: '567 Pine Ave, Pasadena, CA',
    service: 'Hedge Trimming + Cleanup',
    time: '11:00 AM - 1:00 PM',
    status: 'upcoming',
    notes: 'Use side gate. Customer will be home.',
    price: '$150',
  },
  {
    id: '3',
    customer: 'Jennifer Walsh',
    address: '890 Maple Dr, Glendale, CA',
    service: 'Sprinkler Repair',
    time: '2:00 PM - 3:00 PM',
    status: 'upcoming',
    notes: 'Zone 3 not working. Parts in truck.',
    price: '$120',
  },
];

const demoTimeLog = {
  clockedIn: true,
  clockInTime: '8:47 AM',
  hoursToday: 3.5,
  breaksTaken: 1,
};

export default function WorkerDemoPage() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'clock' | 'hours' | 'profile'>('jobs');
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<typeof demoJobs[0] | null>(null);

  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      {/* Demo Banner */}
      <div className="bg-[#f5a623] text-[#1a1a2e] py-2 px-4 text-center">
        <p className="text-sm font-medium">
          <span className="bg-[#1a1a2e] text-white px-2 py-0.5 rounded font-bold mr-2">DEMO</span>
          Preview of the Worker App.{' '}
          <Link href="/auth/signup" className="underline font-bold">
            Sign up
          </Link>{' '}
          to get your team started.
        </p>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{demoUser.company}</p>
            <p className="font-semibold text-gray-900">{demoUser.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-blue-600 font-medium">
              ← Exit Demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4">
        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div>
            {/* Today&apos;s Overview */}
            <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-4 mb-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">Today&apos;s Jobs</h2>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {demoJobs.length} jobs
                </span>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-white/70">Est. Hours</div>
                  <div className="font-bold text-lg">5.5</div>
                </div>
                <div>
                  <div className="text-white/70">Revenue</div>
                  <div className="font-bold text-lg text-[#f5a623]">$355</div>
                </div>
              </div>
            </div>

            {/* Job List */}
            <div className="space-y-3">
              {demoJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${
                    job.status === 'current'
                      ? 'border-green-500 shadow-lg'
                      : 'border-gray-200 hover:border-[#f5a623]'
                  }`}
                >
                  {job.status === 'current' && (
                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold mb-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      CURRENT JOB
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#1a1a2e]">{job.customer}</h3>
                    <span className="text-[#f5a623] font-bold">{job.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{job.service}</p>
                  <p className="text-sm text-gray-500 mb-2">📍 {job.address}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1a1a2e]">⏰ {job.time}</span>
                    <button className="text-sm text-blue-600 font-medium">View Details →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clock Tab */}
        {activeTab === 'clock' && (
          <div>
            <div className="bg-white rounded-xl p-6 text-center mb-4">
              <div className="mb-6">
                {demoTimeLog.clockedIn ? (
                  <>
                    <div className="text-sm text-gray-500 mb-1">Clocked in at</div>
                    <div className="text-4xl font-bold text-green-600">{demoTimeLog.clockInTime}</div>
                    <div className="text-gray-600 mt-2">
                      Working for <span className="font-bold">{demoTimeLog.hoursToday} hours</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm text-gray-500 mb-1">Status</div>
                    <div className="text-2xl font-bold text-gray-400">Not Clocked In</div>
                  </>
                )}
              </div>

              <button
                onClick={() => setShowClockInModal(true)}
                className={`w-full py-4 rounded-xl font-bold text-lg ${
                  demoTimeLog.clockedIn
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {demoTimeLog.clockedIn ? '⏹ Clock Out' : '▶️ Clock In'}
              </button>
            </div>

            {/* Break Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button className="bg-white rounded-xl p-4 text-center border-2 border-gray-200 hover:border-[#f5a623]">
                <span className="text-2xl block mb-1">☕</span>
                <span className="font-medium text-[#1a1a2e]">Start Break</span>
              </button>
              <button className="bg-white rounded-xl p-4 text-center border-2 border-gray-200 hover:border-[#f5a623]">
                <span className="text-2xl block mb-1">🍽️</span>
                <span className="font-medium text-[#1a1a2e]">Lunch Break</span>
              </button>
            </div>

            {/* GPS Info */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <div className="font-semibold text-[#1a1a2e]">GPS Tracking Active</div>
                  <div className="text-sm text-gray-600">
                    Location verified for clock in/out
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hours Tab */}
        {activeTab === 'hours' && (
          <div>
            <div className="bg-white rounded-xl p-6 mb-4">
              <h3 className="font-bold text-[#1a1a2e] mb-4">This Week</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-[#1a1a2e]">32.5</div>
                  <div className="text-sm text-gray-500">Hours Worked</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-3xl font-bold text-green-600">5</div>
                  <div className="text-sm text-gray-500">Breaks Taken</div>
                </div>
              </div>

              {/* Daily Breakdown */}
              <h4 className="font-semibold text-gray-600 mb-3 text-sm">DAILY BREAKDOWN</h4>
              <div className="space-y-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                  <div
                    key={day}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium text-[#1a1a2e]">{day}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">8:00 AM - 4:30 PM</span>
                      <span className="font-bold text-[#1a1a2e] w-12 text-right">
                        {[8.5, 7.5, 8, 5, 3.5][i]}h
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <div className="bg-white rounded-xl p-6 text-center mb-4">
              <div className="w-20 h-20 bg-[#1a1a2e] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👷</span>
              </div>
              <h2 className="text-xl font-bold text-[#1a1a2e]">{demoUser.name}</h2>
              <p className="text-gray-500">{demoUser.role}</p>
              <p className="text-sm text-[#f5a623] font-medium">{demoUser.company}</p>
            </div>

            <div className="bg-white rounded-xl overflow-hidden">
              {[
                { icon: '📋', label: 'My Documents', desc: 'W-4, I-9, certifications' },
                { icon: '💰', label: 'Pay Stubs', desc: 'View payment history' },
                { icon: '📅', label: 'Time Off', desc: 'Request PTO' },
                { icon: '⚙️', label: 'Settings', desc: 'Notifications, language' },
              ].map((item, i) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 ${
                    i < 3 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-medium text-[#1a1a2e]">{item.label}</div>
                    <div className="text-sm text-gray-500">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around">
          {[
            { key: 'jobs', icon: '📋', label: 'Jobs' },
            { key: 'clock', icon: '⏱️', label: 'Clock' },
            { key: 'hours', icon: '📊', label: 'Hours' },
            { key: 'profile', icon: '👤', label: 'Profile' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex flex-col items-center py-3 px-4 ${
                activeTab === tab.key ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Clock In Modal */}
      {showClockInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-[#1a1a2e] mb-4 text-center">
              {demoTimeLog.clockedIn ? 'Clock Out' : 'Clock In'}
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center">
              <div className="text-3xl mb-2">📍</div>
              <div className="font-medium text-[#1a1a2e]">Location Verified</div>
              <div className="text-sm text-gray-500">1234 Oak Street, Los Angeles</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClockInModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowClockInModal(false)}
                className={`flex-1 py-3 rounded-xl font-semibold text-white ${
                  demoTimeLog.clockedIn ? 'bg-red-500' : 'bg-green-500'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1a1a2e]">Job Details</h3>
              <button onClick={() => setSelectedJob(null)} className="p-2">
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className="mb-4">
                <h4 className="text-xl font-bold text-[#1a1a2e]">{selectedJob.customer}</h4>
                <p className="text-[#f5a623] font-bold">{selectedJob.price}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="font-medium text-[#1a1a2e]">{selectedJob.address}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🔧</span>
                  <div>
                    <div className="text-sm text-gray-500">Service</div>
                    <div className="font-medium text-[#1a1a2e]">{selectedJob.service}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">⏰</span>
                  <div>
                    <div className="text-sm text-gray-500">Time</div>
                    <div className="font-medium text-[#1a1a2e]">{selectedJob.time}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xl">📝</span>
                  <div>
                    <div className="text-sm text-gray-500">Notes</div>
                    <div className="font-medium text-[#1a1a2e]">{selectedJob.notes}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 bg-blue-500 text-white rounded-xl font-semibold">
                  📞 Call Customer
                </button>
                <button className="py-3 bg-gray-100 text-[#1a1a2e] rounded-xl font-semibold">
                  🗺️ Navigate
                </button>
              </div>

              {selectedJob.status === 'current' && (
                <button className="w-full mt-3 py-4 bg-green-500 text-white rounded-xl font-bold">
                  ✓ Mark Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA Overlay */}
      <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold">Get this for your team</div>
            <div className="text-sm text-white/70">GPS clock-in, job tracking & more</div>
          </div>
          <Link
            href="/auth/signup"
            className="px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold text-sm no-underline"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
