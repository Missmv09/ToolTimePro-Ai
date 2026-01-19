'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Navigation,
  CheckCircle,
  Circle,
  Camera,
  X,
  Play,
  Square,
  AlertCircle,
  Upload,
} from 'lucide-react';

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

// Mock job data - in production this would come from API
const jobData = {
  id: '2',
  client: 'Smith Pool Service',
  address: '456 Palm Ave, Beverly Hills, CA 90210',
  service: 'Pool Cleaning & Chemical Balance',
  time: '11:30 AM - 12:30 PM',
  phone: '(555) 234-5678',
  notes: 'Check pump filter. Customer reported cloudy water last week.',
  checklist: [
    { id: '1', text: 'Skim surface debris', completed: false, required: true },
    { id: '2', text: 'Vacuum pool floor', completed: false, required: true },
    { id: '3', text: 'Brush walls and tile', completed: false, required: true },
    { id: '4', text: 'Check and clean pump basket', completed: false, required: true },
    { id: '5', text: 'Test water chemistry', completed: false, required: true },
    { id: '6', text: 'Add chemicals as needed', completed: false, required: true },
    { id: '7', text: 'Check equipment operation', completed: false, required: false },
    { id: '8', text: 'Take before/after photos', completed: false, required: true },
  ],
};

export default function JobDetailPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>(jobData.checklist);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Timer effect
  useState(() => {
    let interval: NodeJS.Timeout;
    if (isClockedIn && clockInTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - clockInTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  });

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClockIn = () => {
    setIsClockedIn(true);
    setClockInTime(new Date());
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

  const completeJob = () => {
    setIsClockedIn(false);
    setShowCompleteModal(false);
    router.push('/worker');
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

  const completedCount = checklist.filter((item) => item.completed).length;
  const requiredCount = checklist.filter((item) => item.required).length;
  const requiredComplete = checklist.filter((item) => item.required).every((item) => item.completed);

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-navy-500 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/worker" className="p-2 -ml-2 hover:bg-white/10 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold">{jobData.client}</h1>
            <p className="text-sm text-white/70">{jobData.service}</p>
          </div>
        </div>

        {/* Clock In/Out Timer */}
        <div className="bg-white/10 rounded-xl p-4">
          {isClockedIn ? (
            <div className="text-center">
              <p className="text-sm text-white/70 mb-1">Time on Job</p>
              <p className="text-3xl font-mono font-bold text-gold-500">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-white/50 mt-1">
                Started at {clockInTime?.toLocaleTimeString()}
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
            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <Play size={24} />
            CLOCK IN
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <Square size={24} />
            CLOCK OUT & COMPLETE
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
              <p className="font-medium text-navy-500">{jobData.address}</p>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(jobData.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-navy-500 text-white rounded-lg"
            >
              <Navigation size={18} />
            </a>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <Phone className="w-5 h-5 text-gold-500" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Customer Phone</p>
              <p className="font-medium text-navy-500">{jobData.phone}</p>
            </div>
            <a href={`tel:${jobData.phone}`} className="btn-outline text-sm py-1.5">
              Call
            </a>
          </div>
        </div>

        {/* Notes */}
        {jobData.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Job Notes</p>
                <p className="text-sm text-yellow-700 mt-1">{jobData.notes}</p>
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

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square">
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

          {/* Upload Button */}
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
              <button onClick={completeJob} className="btn-secondary flex-1">
                Complete Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
