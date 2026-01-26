'use client';

import { useState } from 'react';
import Link from 'next/link';

// Demo data
const demoStats = {
  jobsToday: 8,
  revenue: 2450,
  activeCrew: 5,
  newLeads: 12,
};

const demoJobs = [
  { id: '1', customer: 'Martinez Residence', service: 'Lawn care', time: '9:00 AM', status: 'active', tech: 'Miguel R.' },
  { id: '2', customer: 'Oak Valley HOA', service: 'Landscaping', time: '11:30 AM', status: 'next', tech: 'Carlos M.' },
  { id: '3', customer: 'Thompson Pool', service: 'Pool service', time: '2:00 PM', status: 'scheduled', tech: 'David L.' },
  { id: '4', customer: 'Chen Property', service: 'Tree trimming', time: '4:00 PM', status: 'scheduled', tech: 'Miguel R.' },
];

const demoLeads = [
  { id: '1', name: 'Robert Wilson', phone: '(555) 234-5678', service: 'Lawn care estimate', time: '10 min ago', source: 'Website' },
  { id: '2', name: 'Amanda Foster', phone: '(555) 345-6789', service: 'Landscaping quote', time: '1 hour ago', source: 'Google' },
  { id: '3', name: 'James Lee', phone: '(555) 456-7890', service: 'Sprinkler repair', time: '3 hours ago', source: 'Referral' },
];

const demoCrew = [
  { id: '1', name: 'Miguel R.', status: 'working', job: 'Martinez Residence', clockIn: '7:45 AM' },
  { id: '2', name: 'Carlos M.', status: 'en_route', job: 'Oak Valley HOA', clockIn: '8:00 AM' },
  { id: '3', name: 'David L.', status: 'available', job: null, clockIn: '7:30 AM' },
  { id: '4', name: 'James K.', status: 'break', job: null, clockIn: '8:15 AM' },
  { id: '5', name: 'Tony V.', status: 'working', job: 'Chen Property', clockIn: '7:50 AM' },
];

export default function DashboardDemoPage() {
  const [activeNav, setActiveNav] = useState('dashboard');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'working':
        return 'bg-green-100 text-green-700';
      case 'next':
      case 'en_route':
        return 'bg-blue-100 text-blue-700';
      case 'scheduled':
      case 'available':
        return 'bg-gray-100 text-gray-700';
      case 'break':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const navItems = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'jobs', icon: '📋', label: 'Jobs' },
    { key: 'leads', icon: '👥', label: 'Leads' },
    { key: 'time', icon: '⏰', label: 'Time Logs' },
    { key: 'compliance', icon: '🛡️', label: 'Compliance' },
    { key: 'hr', icon: '📄', label: 'HR Toolkit' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-[#f5a623] text-[#1a1a2e] py-2 px-4 text-center">
        <p className="text-sm font-medium">
          <span className="bg-[#1a1a2e] text-white px-2 py-0.5 rounded font-bold mr-2">DEMO</span>
          Preview of the Admin Dashboard.{' '}
          <Link href="/auth/signup" className="underline font-bold">
            Start your free trial
          </Link>
        </p>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-40px)] hidden lg:block">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2 px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-[#f5a623] rounded-lg flex items-center justify-center">
              <span className="text-lg">🛠</span>
            </div>
            <span className="font-bold text-xl text-[#1a1a2e]">ToolTime Pro</span>
          </div>

          {/* Company */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs text-gray-500">Company</p>
            <p className="text-sm font-medium text-[#1a1a2e]">Green Scene Landscaping</p>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeNav === item.key
                    ? 'bg-[#fef3d6] text-[#1a1a2e] font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-[#1a1a2e]">JD</span>
              </div>
              <div>
                <p className="text-sm font-medium text-[#1a1a2e]">John Davis</p>
                <p className="text-xs text-gray-500">Owner</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {/* Mobile Nav */}
          <div className="lg:hidden mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#f5a623] rounded-lg flex items-center justify-center">
                <span className="text-lg">🛠</span>
              </div>
              <span className="font-bold text-lg text-[#1a1a2e]">ToolTime Pro</span>
            </div>
            <Link href="/" className="text-sm text-blue-600 font-medium">
              ← Exit Demo
            </Link>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">Dashboard</h1>
              <p className="text-gray-500">Monday, January 26, 2026</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg font-medium text-[#1a1a2e] hover:bg-gray-50">
                📅 View Calendar
              </button>
              <button className="px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold hover:bg-[#e6991a]">
                + New Job
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Jobs Today</div>
              <div className="text-3xl font-bold text-[#1a1a2e]">{demoStats.jobsToday}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Revenue</div>
              <div className="text-3xl font-bold text-green-600">${demoStats.revenue.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Active Crew</div>
              <div className="text-3xl font-bold text-[#1a1a2e]">{demoStats.activeCrew}</div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">New Leads</div>
              <div className="text-3xl font-bold text-[#f5a623]">{demoStats.newLeads}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today&apos;s Jobs */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">Today&apos;s Jobs</h2>
                <button className="text-sm text-blue-600 font-medium">View All →</button>
              </div>
              <div className="divide-y divide-gray-100">
                {demoJobs.map((job) => (
                  <div key={job.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#1a1a2e]">{job.customer}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{job.service}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">⏰ {job.time}</span>
                      <span className="text-gray-500">👷 {job.tech}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Leads */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">New Leads</h2>
                <button className="text-sm text-blue-600 font-medium">View All →</button>
              </div>
              <div className="divide-y divide-gray-100">
                {demoLeads.map((lead) => (
                  <div key={lead.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#1a1a2e]">{lead.name}</h3>
                      <span className="text-xs text-gray-400">{lead.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{lead.service}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">📞 {lead.phone}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{lead.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crew Status */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden lg:col-span-2">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-[#1a1a2e]">Crew Status</h2>
                <button className="text-sm text-blue-600 font-medium">View Time Logs →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Current Job</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Clock In</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoCrew.map((worker) => (
                      <tr key={worker.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                              👷
                            </div>
                            <span className="font-medium text-[#1a1a2e]">{worker.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(worker.status)}`}>
                            {worker.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{worker.job || '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{worker.clockIn}</td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-blue-600 text-sm font-medium">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 bg-gradient-to-r from-[#1a1a2e] to-[#2d2d4a] rounded-xl p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-1">Get the Full Dashboard</h3>
                <p className="text-white/70">
                  Manage jobs, track crews, handle invoicing, and stay compliant — all in one place.
                </p>
              </div>
              <Link
                href="/auth/signup"
                className="px-6 py-3 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold hover:bg-[#e6991a] transition-colors no-underline text-center"
              >
                Start Free Trial →
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
