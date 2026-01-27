'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Send,
  MessageSquare,
  ExternalLink,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Settings,
  ArrowRight,
} from 'lucide-react';

// Demo data
const demoStats = {
  total: 47,
  sent: 42,
  clicked: 28,
  reviewed: 19,
};

const demoJobsNeedingReview = [
  {
    id: '1',
    title: 'Lawn Mowing',
    customer: { name: 'John Martinez', phone: '(555) 123-4567', email: 'john@example.com' },
    scheduled_date: '2026-01-24',
  },
  {
    id: '2',
    title: 'Landscaping Service',
    customer: { name: 'Sarah Chen', phone: '(555) 234-5678', email: 'sarah@example.com' },
    scheduled_date: '2026-01-23',
  },
  {
    id: '3',
    title: 'Sprinkler Repair',
    customer: { name: 'Mike Johnson', phone: '(555) 345-6789', email: null },
    scheduled_date: '2026-01-22',
  },
];

const demoSentRequests = [
  {
    id: '1',
    customer_name: 'Emily Davis',
    job_title: 'Tree Trimming',
    channel: 'sms',
    sent_at: '2026-01-21T14:30:00',
    status: 'reviewed',
  },
  {
    id: '2',
    customer_name: 'Robert Wilson',
    job_title: 'Full Landscaping',
    channel: 'sms',
    sent_at: '2026-01-20T10:15:00',
    status: 'clicked',
  },
  {
    id: '3',
    customer_name: 'Lisa Thompson',
    job_title: 'Lawn Mowing',
    channel: 'email',
    sent_at: '2026-01-19T16:45:00',
    status: 'sent',
  },
  {
    id: '4',
    customer_name: 'David Brown',
    job_title: 'Hedge Trimming',
    channel: 'sms',
    sent_at: '2026-01-18T09:00:00',
    status: 'reviewed',
  },
];

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  clicked: { label: 'Clicked', color: 'bg-yellow-100 text-yellow-700', icon: ExternalLink },
  reviewed: { label: 'Reviewed', color: 'bg-green-100 text-green-700', icon: Star },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DemoReviewsPage() {
  const [sentJobs, setSentJobs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);

  const handleSendRequest = async (jobId: string) => {
    setIsSending(jobId);
    // Simulate sending
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSentJobs((prev) => [...prev, jobId]);
    setIsSending(null);
  };

  const jobsToShow = demoJobsNeedingReview.filter((j) => !sentJobs.includes(j.id));

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Demo Banner */}
      <div className="bg-[#1a1a2e] text-white py-3 px-4 text-center">
        <p className="text-sm">
          <span className="bg-[#f5a623] text-[#1a1a2e] px-2 py-0.5 rounded font-bold mr-2">
            DEMO
          </span>
          This is a preview of the Review Machine.{' '}
          <Link href="/auth/signup" className="text-[#f5a623] underline">
            Sign up
          </Link>{' '}
          to automate your review requests.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">Review Machine</h1>
            <p className="text-[#5c5c70]">Automate 5-star review requests after every job</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-[#1a1a2e] hover:bg-gray-50"
          >
            <Settings size={18} />
            Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-xl border-2 border-[#f5a623] p-6 mb-8">
            <h3 className="font-semibold text-[#1a1a2e] mb-4">Review Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Review Link
                </label>
                <input
                  type="url"
                  placeholder="https://g.page/r/your-business/review"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your link from Google Business Profile → Share → Ask for reviews
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoSend"
                  defaultChecked
                  className="w-4 h-4 rounded border-gray-300 text-[#f5a623]"
                />
                <label htmlFor="autoSend" className="text-sm text-gray-700">
                  Automatically send review requests when jobs are marked complete
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-[#1a1a2e]">{demoStats.total}</p>
            <p className="text-sm text-gray-500">Total Requests</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <Send className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600">{demoStats.sent}</p>
            <p className="text-sm text-gray-500">Sent</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <ExternalLink className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-yellow-600">{demoStats.clicked}</p>
            <p className="text-sm text-gray-500">Clicked</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <Star className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600">{demoStats.reviewed}</p>
            <p className="text-sm text-gray-500">Reviewed</p>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-gradient-to-r from-[#1a1a2e] to-[#2d2d44] rounded-xl p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold mb-1">Review Conversion Rate</h3>
              <p className="text-white/70 text-sm">
                {Math.round((demoStats.reviewed / demoStats.sent) * 100)}% of customers who received
                a request left a review
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-4xl font-bold text-[#f5a623]">
                {Math.round((demoStats.reviewed / demoStats.sent) * 100)}%
              </div>
              <Star className="w-8 h-8 text-[#f5a623]" />
            </div>
          </div>
        </div>

        {/* Jobs Ready for Review Request */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">
            Ready for Review Request ({jobsToShow.length})
          </h2>

          {jobsToShow.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">All caught up!</h3>
              <p className="text-gray-400">All completed jobs have been sent review requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Service</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Completed</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Contact</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsToShow.map((job) => (
                    <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#1a1a2e]">{job.customer.name}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{job.title}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(job.scheduled_date)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {job.customer.phone && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone size={14} />
                            </span>
                          )}
                          {job.customer.email && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSendRequest(job.id)}
                          disabled={isSending === job.id}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-medium text-sm hover:bg-[#e6991a] disabled:opacity-50"
                        >
                          {isSending === job.id ? (
                            'Sending...'
                          ) : (
                            <>
                              <Send size={14} />
                              Send Request
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sent Review Requests */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">
            Recent Requests
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Service</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Channel</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Sent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {demoSentRequests.map((request) => {
                  const status = statusConfig[request.status as keyof typeof statusConfig];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={request.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[#1a1a2e]">{request.customer_name}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{request.job_title}</td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          {request.channel === 'sms' ? <Phone size={14} /> : <Mail size={14} />}
                          {request.channel.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(request.sent_at)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#fef3d6] rounded-xl p-8 text-center">
          <Star className="w-12 h-12 text-[#f5a623] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#1a1a2e] mb-2">
            Automate Your Reviews
          </h3>
          <p className="text-[#5c5c70] mb-6 max-w-lg mx-auto">
            Stop chasing customers for reviews. The Review Machine automatically sends SMS requests
            after every completed job, helping you build your online reputation on autopilot.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#1a1a2e] text-white rounded-xl font-bold hover:bg-[#2d2d44] transition-colors no-underline"
          >
            Get Started Free
            <ArrowRight size={18} />
          </Link>
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
