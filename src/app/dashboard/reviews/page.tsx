'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Send,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Phone,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ReviewRequest {
  id: string;
  customer_id: string;
  job_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  status: 'pending' | 'sent' | 'clicked' | 'reviewed';
  channel: 'sms' | 'email';
  review_link: string | null;
  sent_at: string | null;
  created_at: string;
  customer?: { name: string; email: string; phone: string } | null;
  job?: { title: string; scheduled_date: string } | null;
}

interface Stats {
  total: number;
  sent: number;
  clicked: number;
  reviewed: number;
}

interface CompletedJob {
  id: string;
  title: string;
  scheduled_date: string;
  customer_id: string;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  clicked: { label: 'Clicked', color: 'bg-yellow-100 text-yellow-700', icon: ExternalLink },
  reviewed: { label: 'Reviewed', color: 'bg-green-100 text-green-700', icon: Star },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function ReviewsPage() {
  const { company } = useAuth();
  const [reviewRequests, setReviewRequests] = useState<ReviewRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, clicked: 0, reviewed: 0 });
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [reviewLink, setReviewLink] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [tableNotReady, setTableNotReady] = useState(false);

  // Fetch review requests
  const fetchReviewRequests = useCallback(async () => {
    if (!company?.id) return;

    try {
      const response = await fetch(`/api/reviews?companyId=${company.id}`);
      const data = await response.json();

      if (data.tableNotReady) {
        setTableNotReady(true);
      }

      setReviewRequests(data.reviewRequests || []);
      setStats(data.stats || { total: 0, sent: 0, clicked: 0, reviewed: 0 });
    } catch (error) {
      console.error('Error fetching review requests:', error);
    }
  }, [company?.id]);

  // Fetch completed jobs that haven't received review requests
  const fetchCompletedJobs = useCallback(async () => {
    if (!company?.id) return;

    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select(`
          id,
          title,
          scheduled_date,
          customer_id,
          customer:customers(id, name, phone, email)
        `)
        .eq('company_id', company.id)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .limit(50);

      setCompletedJobs((jobs as unknown as CompletedJob[]) || []);
    } catch (error) {
      console.error('Error fetching completed jobs:', error);
    }
  }, [company?.id]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchReviewRequests(), fetchCompletedJobs()]);
      setIsLoading(false);
    };

    if (company?.id) {
      loadData();
    }
  }, [company?.id, fetchReviewRequests, fetchCompletedJobs]);

  // Send review request
  const sendReviewRequest = async (job: CompletedJob) => {
    if (!company?.id || !job.customer) return;

    setIsSending(job.id);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          jobId: job.id,
          customerId: job.customer.id,
          customerName: job.customer.name,
          customerPhone: job.customer.phone,
          customerEmail: job.customer.email,
          reviewLink: reviewLink || undefined,
        }),
      });

      if (response.ok) {
        await fetchReviewRequests();
        // Remove from completed jobs list
        setCompletedJobs((prev) => prev.filter((j) => j.id !== job.id));
      }
    } catch (error) {
      console.error('Error sending review request:', error);
    } finally {
      setIsSending(null);
    }
  };

  // Filter jobs based on search
  const filteredJobs = completedJobs.filter((job) => {
    const customerName = job.customer?.name || '';
    return (
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // Jobs that haven't had review requests sent
  const jobsNeedingReview = filteredJobs.filter((job) => {
    return !reviewRequests.some((r) => r.job_id === job.id);
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
        <div className="card h-96 animate-pulse bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Review Machine</h1>
          <p className="text-gray-500">Automate 5-star review requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchReviewRequests();
              fetchCompletedJobs();
            }}
            className="btn-ghost"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary">
            <Settings size={18} className="mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="card border-2 border-gold-500">
          <h3 className="font-semibold text-navy-500 mb-4">Review Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Google Review Link
              </label>
              <input
                type="url"
                value={reviewLink}
                onChange={(e) => setReviewLink(e.target.value)}
                placeholder="https://g.page/r/your-business/review"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Get your link from Google Business Profile → Share → Ask for reviews
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoSend"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="autoSend" className="text-sm text-gray-700">
                Automatically send review requests when jobs are marked complete
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Table Not Ready Notice */}
      {tableNotReady && (
        <div className="card bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Database Setup Required</h4>
              <p className="text-sm text-yellow-700 mt-1">
                The review_requests table needs to be created in your database. Review requests
                will still be sent via SMS but won&apos;t be tracked until the table is created.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <MessageSquare className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-navy-500">{stats.total}</p>
          <p className="text-sm text-gray-500">Total Requests</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <Send className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.sent}</p>
          <p className="text-sm text-gray-500">Sent</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <ExternalLink className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats.clicked}</p>
          <p className="text-sm text-gray-500">Clicked</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center mb-2">
            <Star className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.reviewed}</p>
          <p className="text-sm text-gray-500">Reviewed</p>
        </div>
      </div>

      {/* Jobs Ready for Review Request */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-navy-500">
            Ready for Review Request ({jobsNeedingReview.length})
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full sm:w-64"
            />
          </div>
        </div>

        {jobsNeedingReview.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">All caught up!</h3>
            <p className="text-gray-400 mt-1">
              No completed jobs waiting for review requests
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Customer</th>
                  <th className="table-header">Service</th>
                  <th className="table-header">Completed</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobsNeedingReview.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <p className="font-medium text-navy-500">{job.customer?.name || 'Unknown'}</p>
                    </td>
                    <td className="table-cell">{job.title}</td>
                    <td className="table-cell">{formatDate(job.scheduled_date)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {job.customer?.phone && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone size={14} />
                            SMS
                          </span>
                        )}
                        {job.customer?.email && (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail size={14} />
                            Email
                          </span>
                        )}
                        {!job.customer?.phone && !job.customer?.email && (
                          <span className="text-sm text-gray-400">No contact</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => sendReviewRequest(job)}
                        disabled={isSending === job.id || (!job.customer?.phone && !job.customer?.email)}
                        className="btn-primary text-sm disabled:opacity-50"
                      >
                        {isSending === job.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={14} className="mr-1" />
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
      {reviewRequests.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-navy-500 mb-4">
            Sent Requests ({reviewRequests.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Customer</th>
                  <th className="table-header">Channel</th>
                  <th className="table-header">Sent</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {reviewRequests.map((request) => {
                  const status = statusConfig[request.status];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <p className="font-medium text-navy-500">
                          {request.customer?.name || request.customer_name}
                        </p>
                        {request.job && (
                          <p className="text-xs text-gray-500">{request.job.title}</p>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="flex items-center gap-1 text-sm">
                          {request.channel === 'sms' ? <Phone size={14} /> : <Mail size={14} />}
                          {request.channel.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell">
                        <p>{formatDate(request.sent_at || request.created_at)}</p>
                        <p className="text-xs text-gray-500">{formatTime(request.sent_at || request.created_at)}</p>
                      </td>
                      <td className="table-cell">
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
      )}
    </div>
  );
}
