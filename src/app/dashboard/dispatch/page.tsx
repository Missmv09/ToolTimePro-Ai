'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDispatch, Worker, DispatchJob } from '@/hooks/useDispatch';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  User,
  Truck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Scheduled', color: '#9E9E9E', bg: '#F5F5F5' },
  en_route: { label: 'En Route', color: '#2196F3', bg: '#E3F2FD' },
  in_progress: { label: 'On Site', color: '#4CAF50', bg: '#E8F5E9' },
  completed: { label: 'Complete', color: '#673AB7', bg: '#EDE7F6' },
  delayed: { label: 'Running Late', color: '#F44336', bg: '#FFEBEE' },
};

const WORKER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  on_site: { label: 'On Site', color: '#4CAF50' },
  en_route: { label: 'En Route', color: '#2196F3' },
  available: { label: 'Available', color: '#9E9E9E' },
  offline: { label: 'Offline', color: '#BDBDBD' },
};

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

export default function DispatchBoardPage() {
  const { company } = useAuth();
  const { workers, jobs, isLoading, error, refetch, assignJob, unassignJob, updateJobStatus, sendRunningLate } = useDispatch();

  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [selectedJob, setSelectedJob] = useState<DispatchJob | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notification, setNotification] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAssignJob = async (jobId: string, workerId: string) => {
    setIsAssigning(true);
    try {
      const { error: assignError } = await assignJob(jobId, workerId);
      if (assignError) {
        showToast(`Failed to assign job: ${assignError.message}`);
      } else {
        showToast(`Job assigned to ${workers.find((w) => w.id === workerId)?.full_name}`);
        setShowAssignModal(false);
        setSelectedJob(null);
      }
    } catch (err) {
      showToast('An unexpected error occurred while assigning the job');
      console.error('Assign job error:', err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignJob = async (jobId: string, workerId: string) => {
    try {
      const { error: unassignError } = await unassignJob(jobId, workerId);
      if (unassignError) {
        showToast(`Failed to unassign worker: ${unassignError.message}`);
      } else {
        showToast('Worker unassigned from job');
      }
    } catch (err) {
      showToast('An unexpected error occurred while unassigning the worker');
      console.error('Unassign job error:', err);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const { error: statusError } = await updateJobStatus(jobId, newStatus);
      if (statusError) {
        showToast(`Failed to update status: ${statusError.message}`);
      } else {
        showToast(`Job marked as ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      }
    } catch (err) {
      showToast('An unexpected error occurred while updating job status');
      console.error('Status change error:', err);
    }
  };

  const handleSendRunningLate = async (jobId: string) => {
    try {
      const result = await sendRunningLate(jobId);
      if (result.success) {
        showToast('Running late SMS sent');
      } else {
        showToast(result.error || 'Failed to send SMS');
      }
    } catch (err) {
      showToast('An unexpected error occurred while sending the SMS');
      console.error('Send running late error:', err);
    }
  };

  const unassignedJobs = jobs.filter((j) => j.assignedWorkers.length === 0 && j.status !== 'completed');
  const assignedJobs = jobs.filter((j) => j.assignedWorkers.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1a1a2e] text-white px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-[#f5a623] text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-xl font-bold">Dispatch Board</h1>
            <span className="bg-gradient-to-r from-[#f5a623] to-[#ffd380] text-[#1a1a2e] px-2 py-0.5 rounded-full text-xs font-bold">
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#f5a623] font-semibold">
              {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
            <div className="flex bg-white/10 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-[#f5a623] text-[#1a1a2e]' : 'text-white'}`}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 text-sm ${viewMode === 'map' ? 'bg-[#f5a623] text-[#1a1a2e]' : 'text-white'}`}
              >
                Map
              </button>
            </div>
            <button onClick={() => refetch()} className="text-gray-400 hover:text-white">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-0 min-h-[calc(100vh-120px)]">
        {/* Crew Panel */}
        <aside className="lg:col-span-3 bg-white border-r border-gray-200 overflow-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-[#1a1a2e]">Crew ({workers.length})</h2>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {workers.filter((w) => w.status === 'on_site').length} On Site
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {workers.filter((w) => w.status === 'en_route').length} En Route
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                {workers.filter((w) => w.status === 'available').length} Available
              </span>
            </div>
          </div>

          {workers.length === 0 ? (
            <div className="p-6 text-center">
              <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">No active workers found.</p>
              <Link href="/dashboard/team" className="text-sm text-[#f5a623] hover:underline font-medium">
                Add team members in Settings
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  onClick={() => setSelectedWorker(selectedWorker?.id === worker.id ? null : worker)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${selectedWorker?.id === worker.id ? 'bg-[#fef3d6] border-l-4 border-[#f5a623]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg border-2" style={{ borderColor: WORKER_STATUS_CONFIG[worker.status]?.color }}>
                      <User className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#1a1a2e] truncate">{worker.full_name}</h4>
                      <p className="text-xs text-gray-500">{worker.jobsToday} jobs today</p>
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: WORKER_STATUS_CONFIG[worker.status]?.color + '20', color: WORKER_STATUS_CONFIG[worker.status]?.color }}
                    >
                      {WORKER_STATUS_CONFIG[worker.status]?.label}
                    </span>
                  </div>
                  {selectedWorker?.id === worker.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                      {worker.phone && (
                        <a href={`tel:${worker.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                          <Phone className="w-4 h-4" /> {worker.phone}
                        </a>
                      )}
                      <div className="flex gap-2">
                        <button className="flex-1 py-1.5 bg-[#1a1a2e] text-white rounded text-sm font-medium">
                          <Phone className="w-3 h-3 inline mr-1" /> Call
                        </button>
                        <button className="flex-1 py-1.5 bg-gray-100 text-[#1a1a2e] rounded text-sm font-medium">
                          <MessageSquare className="w-3 h-3 inline mr-1" /> Message
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-6 bg-gray-100 overflow-auto p-4">
          {viewMode === 'map' ? (
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl h-full min-h-[400px] relative">
              <div className="absolute top-4 left-4 bg-white rounded-lg px-3 py-2 shadow text-sm">
                <p className="font-medium">📍 Service Area</p>
                <p className="text-xs text-gray-500">Live tracking</p>
              </div>
              {/* Simulated map markers */}
              {workers.filter((w) => w.location).map((worker, i) => (
                <div
                  key={worker.id}
                  className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${20 + i * 25}%`, top: `${30 + (i % 2) * 30}%` }}
                  onClick={() => setSelectedWorker(worker)}
                >
                  <div className="relative">
                    <Truck className="w-8 h-8 text-[#1a1a2e]" style={{ color: WORKER_STATUS_CONFIG[worker.status]?.color }} />
                    <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-1 rounded text-xs font-medium whitespace-nowrap shadow">
                      {worker.full_name.split(' ')[0]}
                    </span>
                    {worker.status === 'en_route' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                    )}
                  </div>
                </div>
              ))}
              {/* Job markers */}
              {jobs.filter((j) => j.status !== 'completed').map((job, i) => (
                <div
                  key={job.id}
                  className="absolute cursor-pointer"
                  style={{ left: `${15 + i * 18}%`, top: `${55 + (i % 3) * 12}%` }}
                  onClick={() => setSelectedJob(job)}
                >
                  <MapPin className="w-6 h-6 text-red-500" />
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <Clock className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-500 mb-1">No jobs scheduled for today.</h3>
              <p className="text-sm text-gray-400 mb-4">Create jobs to start dispatching your crew.</p>
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-medium text-sm hover:bg-[#e6951a] transition-colors"
              >
                Go to Jobs <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* In Progress */}
              {jobs.filter((j) => j.status === 'in_progress').length > 0 && (
                <div>
                  <h3 className="font-bold text-[#1a1a2e] mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    In Progress ({jobs.filter((j) => j.status === 'in_progress').length})
                  </h3>
                  <div className="grid gap-3">
                    {jobs.filter((j) => j.status === 'in_progress').map((job) => (
                      <JobCard key={job.id} job={job} onSelect={() => setSelectedJob(job)} workers={workers} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled */}
              {jobs.filter((j) => j.status === 'scheduled').length > 0 && (
                <div>
                  <h3 className="font-bold text-[#1a1a2e] mb-2">
                    Scheduled ({jobs.filter((j) => j.status === 'scheduled').length})
                  </h3>
                  <div className="grid gap-3">
                    {jobs.filter((j) => j.status === 'scheduled').map((job) => (
                      <JobCard key={job.id} job={job} onSelect={() => setSelectedJob(job)} workers={workers} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {jobs.filter((j) => j.status === 'completed').length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-400 mb-2">
                    Completed ({jobs.filter((j) => j.status === 'completed').length})
                  </h3>
                  <div className="grid gap-3 opacity-60">
                    {jobs.filter((j) => j.status === 'completed').map((job) => (
                      <JobCard key={job.id} job={job} onSelect={() => setSelectedJob(job)} workers={workers} onStatusChange={handleStatusChange} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Jobs Panel */}
        <aside className="lg:col-span-3 bg-white border-l border-gray-200 overflow-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-[#1a1a2e]">Today&apos;s Jobs ({jobs.length})</h2>
          </div>

          {jobs.length === 0 ? (
            <div className="p-6 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">No jobs scheduled for today.</p>
              <Link href="/dashboard/jobs" className="text-sm text-[#f5a623] hover:underline font-medium">
                Schedule a job
              </Link>
            </div>
          ) : (
            <>
              {/* Unassigned Jobs */}
              {unassignedJobs.length > 0 && (
                <div className="p-3 bg-yellow-50 border-b border-yellow-200">
                  <h3 className="font-medium text-yellow-700 text-sm mb-2">
                    Unassigned ({unassignedJobs.length})
                  </h3>
                  <div className="space-y-2">
                    {unassignedJobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => {
                          setSelectedJob(job);
                          setShowAssignModal(true);
                        }}
                        className="bg-white rounded-lg p-3 border-l-4 border-yellow-500 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-gray-500">{job.id}</span>
                          <span className="text-xs font-medium text-[#1a1a2e]">{formatTime(job.scheduled_time_start)}</span>
                        </div>
                        <h4 className="font-medium text-[#1a1a2e] text-sm">{job.customer?.name}</h4>
                        <p className="text-xs text-gray-500">{job.title}</p>
                        <button className="mt-2 w-full py-1 bg-[#f5a623] text-[#1a1a2e] rounded text-xs font-bold">
                          + Assign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Jobs */}
              <div className="p-3">
                <h3 className="font-medium text-gray-500 text-sm mb-2">
                  Assigned ({assignedJobs.length})
                </h3>
                <div className="space-y-2">
                  {assignedJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`rounded-lg p-3 border cursor-pointer hover:shadow-md transition-shadow ${
                        selectedJob?.id === job.id ? 'border-[#f5a623] bg-[#fef3d6]' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-gray-500">{job.id}</span>
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: STATUS_CONFIG[job.status]?.bg, color: STATUS_CONFIG[job.status]?.color }}
                        >
                          {STATUS_CONFIG[job.status]?.label}
                        </span>
                      </div>
                      <h4 className="font-medium text-[#1a1a2e] text-sm">{job.customer?.name}</h4>
                      <p className="text-xs text-gray-500 mb-1">{job.title}</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTime(job.scheduled_time_start)}
                        </span>
                        <span className="text-[#f5a623] font-medium">
                          {job.assignedWorkers.map((w) => w.full_name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Selected Job Detail Modal */}
      {selectedJob && !showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" onClick={() => setSelectedJob(null)}>
          <div className="bg-white w-full lg:max-w-md lg:rounded-xl rounded-t-xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm font-bold text-gray-500">{selectedJob.id}</span>
                  <h3 className="text-lg font-bold text-[#1a1a2e]">{selectedJob.title}</h3>
                  <p className="text-gray-600">{selectedJob.customer?.name}</p>
                </div>
                <button onClick={() => setSelectedJob(null)} className="text-gray-400 hover:text-gray-600 text-xl">
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <span
                className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: STATUS_CONFIG[selectedJob.status]?.bg, color: STATUS_CONFIG[selectedJob.status]?.color }}
              >
                {STATUS_CONFIG[selectedJob.status]?.label}
              </span>

              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {selectedJob.address}, {selectedJob.city}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {formatTime(selectedJob.scheduled_time_start)} - {formatTime(selectedJob.scheduled_time_end)}
                </p>
                {selectedJob.total_amount && (
                  <p className="flex items-center gap-2 font-bold text-green-600">
                    {formatCurrency(selectedJob.total_amount)}
                  </p>
                )}
                {selectedJob.notes && (
                  <p className="text-gray-600 italic">📝 {selectedJob.notes}</p>
                )}
              </div>

              {selectedJob.assignedWorkers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Assigned to:</p>
                  {selectedJob.assignedWorkers.map((w) => (
                    <span key={w.id} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm mr-2">
                      <User className="w-3 h-3" /> {w.full_name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedJob.status === 'scheduled' && (
                  <button onClick={() => handleStatusChange(selectedJob.id, 'in_progress')} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium">
                    Start Job
                  </button>
                )}
                {selectedJob.status === 'in_progress' && (
                  <>
                    <button onClick={() => handleStatusChange(selectedJob.id, 'completed')} className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium">
                      <CheckCircle className="w-4 h-4 inline mr-1" /> Complete
                    </button>
                    <button onClick={() => handleSendRunningLate(selectedJob.id)} className="py-2 px-4 bg-orange-500 text-white rounded-lg font-medium">
                      <AlertCircle className="w-4 h-4 inline mr-1" /> Running Late
                    </button>
                  </>
                )}
                {selectedJob.assignedWorkers.length === 0 && (
                  <button onClick={() => setShowAssignModal(true)} className="flex-1 py-2 bg-[#f5a623] text-[#1a1a2e] rounded-lg font-bold">
                    Assign Worker
                  </button>
                )}
                {selectedJob.customer?.phone && (
                  <a href={`tel:${selectedJob.customer.phone}`} className="py-2 px-4 bg-gray-100 text-[#1a1a2e] rounded-lg font-medium">
                    <Phone className="w-4 h-4 inline mr-1" /> Call Customer
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-[#1a1a2e]">Assign Job {selectedJob.id}</h3>
              <p className="text-sm text-gray-500">{selectedJob.title} • {selectedJob.customer?.name}</p>
            </div>
            <div className="p-4 space-y-2">
              {workers.map((worker) => (
                <button
                  key={worker.id}
                  onClick={() => handleAssignJob(selectedJob.id, worker.id)}
                  disabled={isAssigning}
                  className="w-full flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg hover:border-[#f5a623] transition-colors disabled:opacity-50"
                >
                  <div
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2"
                    style={{ borderColor: WORKER_STATUS_CONFIG[worker.status]?.color }}
                  >
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-[#1a1a2e]">{worker.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {WORKER_STATUS_CONFIG[worker.status]?.label} • {worker.jobsToday} jobs today
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200">
              <button onClick={() => setShowAssignModal(false)} className="w-full py-2 bg-gray-100 text-[#1a1a2e] rounded-lg font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a2e] text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {notification}
        </div>
      )}
    </div>
  );
}

// Job Card Component
function JobCard({
  job,
  onSelect,
  workers,
  onStatusChange,
}: {
  job: DispatchJob;
  onSelect: () => void;
  workers: Worker[];
  onStatusChange: (jobId: string, status: string) => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-xl p-4 border-l-4 cursor-pointer hover:shadow-md transition-shadow ${
        job.status === 'in_progress' ? 'border-green-500' : job.status === 'completed' ? 'border-purple-500' : 'border-gray-300'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-bold text-[#1a1a2e]">{job.customer?.name}</h4>
          <p className="text-sm text-gray-500">{job.title}</p>
        </div>
        <span
          className="text-xs font-medium px-2 py-1 rounded-full"
          style={{ backgroundColor: STATUS_CONFIG[job.status]?.bg, color: STATUS_CONFIG[job.status]?.color }}
        >
          {STATUS_CONFIG[job.status]?.label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {formatTime(job.scheduled_time_start)}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          {job.city || job.address}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <div className="flex -space-x-2">
          {job.assignedWorkers.slice(0, 3).map((w) => (
            <div key={w.id} className="w-7 h-7 rounded-full bg-[#f5a623] flex items-center justify-center text-xs font-bold text-[#1a1a2e] border-2 border-white">
              {w.full_name.charAt(0)}
            </div>
          ))}
          {job.assignedWorkers.length === 0 && (
            <span className="text-xs text-yellow-600 font-medium">Unassigned</span>
          )}
        </div>
        <span className="font-bold text-green-600">{formatCurrency(job.total_amount)}</span>
      </div>
    </div>
  );
}
