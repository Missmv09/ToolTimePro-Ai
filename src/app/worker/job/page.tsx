'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
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

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Job {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  status: string;
  customer: Customer | Customer[] | null;
}

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
}

interface WorkerData {
  id: string;
  company_id: string;
}

// Default checklist template
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

function JobDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('id');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { worker: authWorker, isLoading: authLoading, isAuthenticated } = useWorkerAuth();

  // Derive worker data from auth context
  const worker: WorkerData | null = authWorker ? { id: authWorker.id, company_id: authWorker.company_id || '' } : null;

  const [job, setJob] = useState<Job | null>(null);
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to get customer data from potentially array result
  const getCustomer = (customer: Job['customer']): Customer | null => {
    if (!customer) return null;
    if (Array.isArray(customer)) return customer[0] || null;
    return customer;
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/worker/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch job details
  const fetchJob = useCallback(async () => {
    if (!jobId || !worker?.company_id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch job with customer details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(id, name, phone)
        `)
        .eq('id', jobId)
        .eq('company_id', worker.company_id)
        .single();

      if (jobError) throw jobError;

      setJob(jobData as Job);
      setChecklist(getDefaultChecklist(jobData.title));

      // Check for active time entry
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
    } catch (err) {
      console.error('Error fetching job:', err);
      setError('Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, worker?.company_id, worker?.id]);

  useEffect(() => {
    if (worker) {
      fetchJob();
    }
  }, [worker, fetchJob]);

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
    if (!worker?.id || !worker?.company_id || !jobId) return;

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
          company_id: worker.company_id,
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
      const { error: statusError } = await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId);
      if (statusError) {
        console.error('Failed to update job status:', statusError.message);
      }

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

      // Save job photos to database
      if (photos.length > 0 && worker) {
        const photoRecords = photos.map((photo) => ({
          job_id: jobId,
          user_id: worker.id,
          photo_url: photo.url,
          photo_type: 'after' as const,
          caption: null,
        }));
        const { error: photoError } = await supabase
          .from('job_photos')
          .insert(photoRecords);
        if (photoError) {
          console.error('Failed to save photos:', photoError.message);
        }
      }

      // Update job status to completed
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: 'completed' })
        .eq('id', jobId);
      if (jobError) {
        console.error('Failed to update job status:', jobError.message);
      }

      setShowCompleteModal(false);
      router.push('/worker/job');
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

  if (isLoading || authLoading || !worker) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-4 flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Job not found'}
        </h2>
        <Link href="/worker/job" className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const customer = getCustomer(job.customer);
  const completedCount = checklist.filter((item) => item.completed).length;
  const requiredComplete = checklist.filter((item) => item.required).every((item) => item.completed);
  const isClockedIn = !!activeTimeEntry;
  const fullAddress = [job.address, job.city, job.state, job.zip].filter(Boolean).join(', ');

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/worker/job" className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold">{customer?.name || 'Customer'}</h1>
            <p className="text-sm text-white/70">{job.title}</p>
          </div>
        </div>

        {/* Clock Timer */}
        <div className="bg-white/10 rounded-xl p-4">
          {isClockedIn ? (
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Time on Job</p>
              <p className="text-3xl font-mono font-bold text-yellow-400">{formatTime(elapsedTime)}</p>
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium text-gray-900">{fullAddress || 'No address provided'}</p>
            </div>
            {fullAddress && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-600 text-white rounded-lg"
              >
                <Navigation size={18} />
              </a>
            )}
          </div>

          {customer?.phone && (
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <Phone className="w-5 h-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-500">Customer Phone</p>
                <p className="font-medium text-gray-900">{customer.phone}</p>
              </div>
              <a href={`tel:${customer.phone}`} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Job Checklist</h2>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
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
                    item.completed ? 'text-green-700 line-through' : 'text-gray-900'
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Job Photos</h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{photos.length} photos</span>
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
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-yellow-500 hover:text-yellow-600 transition-colors"
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
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cannot Complete Job Yet</h3>

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
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium"
              >
                Go Back
              </button>
              <button
                onClick={completeJob}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-xl font-medium disabled:opacity-50"
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

export default function JobDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <JobDetailContent />
    </Suspense>
  );
}
