'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  ArrowRight,
  CalendarClock,
  X,
  Send,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Job {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
  address: string | null;
}

interface PastJob {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  total_amount: number | null;
}

export default function PortalAppointments() {
  const [upcoming, setUpcoming] = useState<Job[]>([]);
  const [past, setPast] = useState<PastJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleJob, setRescheduleJob] = useState<Job | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const t = useTranslations('portal.appointments');

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) return;

    fetch(`/api/portal?action=appointments`, { headers: { 'x-portal-token': token } })
      .then(res => res.json())
      .then(data => {
        setUpcoming(data.upcoming || []);
        setPast(data.past || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && rescheduleJob) {
        setRescheduleJob(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rescheduleJob]);

  const handleReschedule = async () => {
    if (!rescheduleJob || !newDate) return;
    setSubmitting(true);

    const token = localStorage.getItem('portal_token');
    await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-portal-token': token || '' },
      body: JSON.stringify({
        action: 'request_reschedule',
        jobId: rescheduleJob.id,
        requestedDate: newDate,
        requestedTimeStart: newTime || null,
        reason: reason || null,
      }),
    });

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setRescheduleJob(null);
      setSubmitted(false);
      setNewDate('');
      setNewTime('');
      setReason('');
    }, 2000);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>

      {/* Upcoming */}
      <div>
        <h2 className="font-semibold text-gray-700 mb-3">{t('upcoming')}</h2>
        {upcoming.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{t('noUpcoming')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(job => (
              <div key={job.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    {job.description && (
                      <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    job.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {job.status === 'in_progress' ? t('inProgress') : t('scheduled')}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  {job.scheduled_time_start && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {job.scheduled_time_start}{job.scheduled_time_end ? ` — ${job.scheduled_time_end}` : ''}
                    </div>
                  )}
                  {job.address && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {job.address}
                    </div>
                  )}
                </div>

                {job.status === 'scheduled' && (
                  <button
                    onClick={() => setRescheduleJob(job)}
                    className="mt-4 text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700"
                  >
                    <CalendarClock className="w-4 h-4" />
                    {t('requestReschedule')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">{t('pastAppointments')}</h2>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {past.map(job => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{job.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(job.scheduled_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {job.total_amount && (
                    <span className="text-sm text-gray-500">${job.total_amount.toFixed(2)}</span>
                  )}
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRescheduleJob(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">{t('requestSent')}</h3>
                <p className="text-sm text-gray-500 mt-1">{t('confirmNewTime')}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{t('rescheduleTitle')}</h3>
                  <button onClick={() => setRescheduleJob(null)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <p className="text-sm text-gray-500 mb-4">
                  {t('rescheduleDescription')} <strong>{rescheduleJob.title}</strong> ({t('rescheduleCurrently', { date: new Date(rescheduleJob.scheduled_date).toLocaleDateString() })}).
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('preferredDate')}</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('preferredTime')}</label>
                    <select
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{t('noPreference')}</option>
                      <option value="morning">{t('morning')}</option>
                      <option value="afternoon">{t('afternoon')}</option>
                      <option value="evening">{t('evening')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('reasonLabel')}</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder={t('reasonPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-5">
                  <button onClick={() => setRescheduleJob(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700">
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={!newDate || submitting}
                    className="px-5 py-2 bg-navy-500 text-white rounded-xl text-sm font-medium hover:bg-navy-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? t('sending') : t('sendRequest')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
