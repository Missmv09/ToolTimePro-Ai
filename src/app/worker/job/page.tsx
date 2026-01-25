'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  Circle,
  Camera,
  X,
  Play,
  Square,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkerAuth } from '@/contexts/WorkerAuthContext';
import type { Job, Customer, TimeEntry } from '@/types/database';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  required: boolean;
}

interface Photo {
  id: string;
  url: string;
  timestamp: Date;
}

interface JobWithCustomer extends Job {
  customer: Customer | null;
}

// Default checklist template - in production this could be fetched from services table
const getDefaultChecklist = (jobTitle: string): ChecklistItem[] => {
  return [
    { id: '1', text: 'Arrive and check in with customer', completed: false, required: true },
    { id: '2', text: 'Review job requirements', completed: false, required: true },
    { id: '3', text: 'Complete primary service', completed: false, required: true },
    { id: '4', text: 'Quality check', completed: false, required: true },
    { id: '5', text: 'Clean up work area', completed: false, required: true },
    { id: '6', text: 'Take completion photos', completed: false, required: true },
    { id: '7', text: 'Get customer sign-off (if applicable)', completed: false, required: false },
  ];
};

export default function JobDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { worker, company } = useWorkerAuth();

  const [job, setJob] = useState<JobWithCustomer | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch job details
  const fetchJob = useCallback(async () => {
    if (!jobId || !company?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch job with customer details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', jobId)
        .eq('company_id', company.id)
        .single();

      if (jobError) throw jobError;

      setJob(jobData as unknown as JobWithCustomer);
      setChecklist(getDefaultChecklist(jobData.title));

      // Check for active time entry
      if (worker?.id) {
        const { data: timeEntry } = await supabase
          .from('time_entries')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', worker.id)
          .is('clock_out', null)
          .single();

        if (timeEntry) {
          setActiveTimeEntry(timeEntry as TimeEntry);
        }
      }
    } catch (err) {
      console.error('Error fetching job:', err);
      setError('Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, company?.id, worker?.id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTimeEntry) {
      const updateElapsed = () => {
        const clockIn = new Date(activeTimeEntry.clock_in).getTime();
        setElapsedTime(Math.floor((Date.now() - clockIn) / 1000));
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimeEntry]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClockIn = async () => {
    if (!worker?.id || !company?.id || !jobId) return;

    setIsSubmitting(true);
    try {
      // Get current location
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
        } catch {
          console.log('Could not get location');
        }
      }

      // Create time entry
      const { data: timeEntry, error: insertError } = await supabase
        .from('time_entries')
        .insert({
          company_id: company.id,
          user_id: worker.id,
          job_id: jobId,
          clock_in: new Date().toISOString(),
          clock_in_location: location,
          status: 'active',
          break_minutes: 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActiveTimeEntry(timeEntry as TimeEntry);

      // Update job status to in_progress
      await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId);

    } catch (err) {
      console.error('Error clocking in:', err);
      alert('Failed to clock in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = () => {
    const requiredComplete = checklist.filter((item) => item.required).every((item) => item.completed);
    const hasPhotos = photos.length > 0;

    if (!requiredComplete || !hasPhotos) {
      setShowCompleteModal(true);
      return;
    }

    completeJob();
  };

  const completeJob = async () => {
    if (!activeTimeEntry || !jobId) return;

    setIsSubmitting(true);
    try {
      // Get current location
      let location = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          };
        } catch {
          console.log('Could not get location');
        }
      }

      // Update time entry with clock out
      const { error: updateError } = await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          clock_out_location: location,
          status: 'completed',
        })
        .eq('id', activeTimeEntry.id);

      if (updateError) throw updateError;

      // Update job status to completed
      await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);

      setShowCompleteModal(false);
      router.push('/worker');
    } catch (err) {
      console.error('Error completing job:', err);
      alert('Failed to complete job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto: Photo = {
          id: Date.now().toString() + Math.random(),
          url: event.target?.result as string,
          timestamp: new Date(),
        };
        setPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-navy-500 mb-2">
          {error || 'Job not found'}
        </h2>
        <Link href="/worker" className="btn-secondary mt-4">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const completedCount = checklist.filter((item) => item.completed).length;
  const requiredComplete = checklist.filter((item) => item.required).every((item) => item.completed);
  const isClockedIn = !!activeTimeEntry;
  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ');

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-navy-500 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/worker" className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold">{job.customer?.name || 'Customer'}</h1>
            <p className="text-sm text-white/70">{job.title}</p>
          </div>
        </div>

        {/* Clock Timer */}
        <div className="bg-white/10 rounded-xl p-4">
          {isClockedIn ? (
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Time on Job</p>
              <p className="text-3xl font-mono font-bold text-gold-500">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-white/50 mt-1">
                Started at {new Date(activeTimeEntry!.clock_in).toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Ready to Start?</p>
              <p className="text-lg font-medium">Tap below to clock in</p>
            </div>
          )}
        </div>
      </div>

      {/* Clock In/Out Button */}
      <div className="p-4 -mt-4">
        {!isClockedIn ? (
          <button
            onClick={handleClockIn}
            disabled={isSubmitting}
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Play size={24} />
                CLOCK IN
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            disabled={isSubmitting}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Square size={24} />
                CLOCK OUT & COMPLETE
              </>
            )}
          </button>
        )}
      </div>

      <div className="px-4 space-y-4">
        {/* Location & Contact */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-gold-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium text-navy-500">{fullAddress || 'No address provided'}</p>
            </div>
            {fullAddress && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-navy-500 text-white rounded-lg"
              >
                <Navigation size={18} />
              </a>
            )}
          </div>

          {job.customer?.phone && (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <Phone className="w-5 h-5 text-gold-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Customer Phone</p>
                <p className="font-medium text-navy-500">{job.customer.phone}</p>
              </div>
              <a href={`tel:${job.customer.phone}`} className="btn-outline text-sm py-1.5">
                Call
              </a>
            </div>
          )}
        </div>

        {/* Notes */}
        {job.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Job Notes</p>
                <p className="text-sm text-yellow-700 mt-1">{job.notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-500">Job Checklist</h2>
            <span className="badge-gold">
              {completedCount}/{checklist.length}
            </span>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className={`w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors ${
                  item.completed ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {item.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <span
                  className={`flex-1 ${
                    item.completed ? 'text-green-700 line-through' : 'text-navy-500'
                  }`}
                >
                  {item.text}
                  {item.required && !item.completed && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3">* Required before completing job</p>
        </div>

        {/* Photo Upload */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-500">Job Photos</h2>
            <span className="badge-info">{photos.length} photos</span>
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Job photo"
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-gold-500 hover:text-gold-600 transition-colors"
          >
            <Camera size={24} />
            <span className="text-sm font-medium">Take Photo or Upload</span>
          </button>
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6">
            <h3 className="text-lg font-bold text-navy-500 mb-4">Cannot Complete Job Yet</h3>

            {!requiredComplete && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg mb-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">Incomplete Checklist</p>
                  <p className="text-sm text-red-600">
                    Please complete all required checklist items.
                  </p>
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg mb-3">
                <Camera className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">No Photos</p>
                  <p className="text-sm text-red-600">Please upload at least one job photo.</p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="btn-outline flex-1"
              >
                Go Back
              </button>
              <button
                onClick={completeJob}
                disabled={isSubmitting}
                className="btn-secondary flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Complete Anyway'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
