'use client';

import { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Users,
  CheckCircle,
  Truck,
  Calendar,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface StatusUpdate {
  note_text: string;
  created_at: string;
}

interface TrackedJob {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  crew: string[];
  statusUpdates: StatusUpdate[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; description: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Calendar, description: 'Your appointment is confirmed' },
  in_progress: { label: 'In Progress', color: 'bg-green-100 text-green-700', icon: Truck, description: 'Your crew is on the job' },
  completed: { label: 'Completed', color: 'bg-gray-100 text-gray-600', icon: CheckCircle, description: 'Work is finished' },
};

export default function PortalTracker() {
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch('/api/portal?action=tracker', { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => { setJobs(data.jobs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading tracker...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Job Tracker</h1>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="font-medium text-gray-700">No active jobs</h3>
          <p className="text-sm text-gray-500 mt-1">When you have scheduled work, you&apos;ll see live updates here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => {
            const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.scheduled;
            const StatusIcon = config.icon;
            const isActive = job.status === 'in_progress';

            return (
              <div key={job.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${isActive ? 'ring-2 ring-green-300' : ''}`}>
                {/* Status bar */}
                <div className={`px-5 py-3 ${isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${isActive ? 'text-green-600' : 'text-blue-500'}`} />
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    {isActive && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                </div>

                {/* Job details */}
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
                  {job.description && (
                    <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {job.scheduled_time_start && ` at ${job.scheduled_time_start}`}
                      {job.scheduled_time_end && ` — ${job.scheduled_time_end}`}
                    </div>

                    {job.address && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {job.address}{job.city ? `, ${job.city}` : ''}{job.state ? `, ${job.state}` : ''}
                      </div>
                    )}

                    {job.crew.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>Crew: {job.crew.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Status updates / notes */}
                  {job.statusUpdates.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> Updates
                      </h4>
                      <div className="space-y-2">
                        {job.statusUpdates.map((update, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-700">{update.note_text}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(update.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
