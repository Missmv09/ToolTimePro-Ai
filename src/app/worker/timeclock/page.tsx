'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Camera,
  Coffee,
  UtensilsCrossed,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  HardHat,
  ArrowLeft,
  Loader2,
  X,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { useTimeClock, AttestationData } from '@/hooks/useTimeClock';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Format hours to H:MM
function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

// Format time to 12-hour
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TimeClockPage() {
  const { dbUser, company } = useAuth();
  const {
    isLoading,
    error,
    currentEntry,
    todaysBreaks,
    hoursWorked,
    isOnBreak,
    currentBreak,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    waiveMealBreak,
    checkCompliance,
  } = useTimeClock();

  const [showCamera, setShowCamera] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAttestation, setShowAttestation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check location permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        setLocationStatus(result.state === 'granted' ? 'granted' : 'pending');
      });
    }
  }, []);

  // Get compliance alerts
  const complianceAlerts = checkCompliance();

  // Start camera for photo capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      // Continue without camera
      handleClockAction(null);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setPhotoData(data);
        stopCamera();
        handleClockAction(data);
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Handle clock in/out action
  const handleClockAction = async (photo: string | null) => {
    setIsProcessing(true);

    if (!currentEntry) {
      // Clock In
      const result = await clockIn(undefined, photo || undefined);
      if (!result.success) {
        alert(result.error);
      }
    }

    setIsProcessing(false);
    setPhotoData(null);
  };

  // Handle clock out with attestation
  const handleClockOut = () => {
    setShowAttestation(true);
  };

  // Handle break action
  const handleBreakAction = async (type: 'meal' | 'rest') => {
    setIsProcessing(true);
    if (isOnBreak) {
      await endBreak();
    } else {
      await startBreak(type);
    }
    setIsProcessing(false);
  };

  // Handle waive meal break
  const handleWaiveMealBreak = async () => {
    setIsProcessing(true);
    await waiveMealBreak();
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-navy-gradient flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading time clock...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-navy-gradient">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-white/80 hover:text-white flex items-center gap-2">
            <ArrowLeft size={20} />
            Back
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gold-500 rounded-lg flex items-center justify-center">
              <HardHat className="w-5 h-5 text-navy-500" />
            </div>
            <span className="font-bold text-white">Time Clock</span>
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Main Content */}
        <div className="px-4 pb-8">
          {/* User Info */}
          <div className="text-center mb-6">
            <p className="text-white/60 text-sm">{company?.name}</p>
            <p className="text-white text-xl font-semibold">{dbUser?.full_name}</p>
          </div>

          {/* Time Display */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
            <div className="text-center">
              <p className="text-white/60 text-sm mb-2">
                {currentEntry ? 'Hours Worked Today' : 'Current Time'}
              </p>
              <p className="text-5xl font-bold text-white font-mono">
                {currentEntry
                  ? formatHours(hoursWorked)
                  : new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
              </p>
              {currentEntry && (
                <p className="text-white/60 text-sm mt-2">
                  Clocked in at {formatTime(currentEntry.clock_in)}
                </p>
              )}
            </div>

            {/* Location Status */}
            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              <MapPin className="w-4 h-4 text-gold-500" />
              <span className="text-white/60">
                {locationStatus === 'granted'
                  ? 'Location enabled'
                  : 'Location will be requested'}
              </span>
            </div>
          </div>

          {/* Compliance Alerts */}
          {complianceAlerts.length > 0 && (
            <div className="space-y-3 mb-6">
              {complianceAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl flex items-start gap-3 ${
                    alert.severity === 'violation'
                      ? 'bg-red-500/20 border border-red-500/30'
                      : alert.severity === 'warning'
                      ? 'bg-amber-500/20 border border-amber-500/30'
                      : 'bg-blue-500/20 border border-blue-500/30'
                  }`}
                >
                  {alert.severity === 'violation' ? (
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  ) : alert.severity === 'warning' ? (
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Timer className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{alert.title}</p>
                    <p className="text-sm text-white/70">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Main Clock Button */}
          <div className="flex justify-center mb-6">
            {!currentEntry ? (
              <button
                onClick={() => startCamera()}
                disabled={isProcessing}
                className="w-40 h-40 rounded-full bg-green-500 hover:bg-green-400 active:bg-green-600 transition-all flex flex-col items-center justify-center shadow-xl disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                  <>
                    <Play className="w-12 h-12 text-white mb-1" />
                    <span className="text-white font-bold text-lg">CLOCK IN</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleClockOut}
                disabled={isProcessing || isOnBreak}
                className="w-40 h-40 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 transition-all flex flex-col items-center justify-center shadow-xl disabled:opacity-50 disabled:bg-gray-500"
              >
                {isProcessing ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                  <>
                    <Square className="w-12 h-12 text-white mb-1" />
                    <span className="text-white font-bold text-lg">CLOCK OUT</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Break Buttons (only show when clocked in) */}
          {currentEntry && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleBreakAction('meal')}
                disabled={isProcessing}
                className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                  isOnBreak && currentBreak?.break_type === 'meal'
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <UtensilsCrossed className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-semibold">
                    {isOnBreak && currentBreak?.break_type === 'meal'
                      ? 'End Meal Break'
                      : 'Meal Break'}
                  </p>
                  <p className="text-xs opacity-70">30 min unpaid</p>
                </div>
              </button>

              <button
                onClick={() => handleBreakAction('rest')}
                disabled={isProcessing}
                className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                  isOnBreak && currentBreak?.break_type === 'rest'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Coffee className="w-6 h-6" />
                <div className="text-left">
                  <p className="font-semibold">
                    {isOnBreak && currentBreak?.break_type === 'rest'
                      ? 'End Rest Break'
                      : 'Rest Break'}
                  </p>
                  <p className="text-xs opacity-70">10 min paid</p>
                </div>
              </button>
            </div>
          )}

          {/* Waive Meal Break Option (only show if under 6 hours and no meal break taken) */}
          {currentEntry &&
            hoursWorked < 6 &&
            hoursWorked >= 4 &&
            !todaysBreaks.some((b) => b.break_type === 'meal') && (
              <button
                onClick={handleWaiveMealBreak}
                disabled={isProcessing}
                className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all mb-6"
              >
                <p className="text-sm">Waive Meal Break (shifts &le; 6 hours)</p>
              </button>
            )}

          {/* Today's Breaks */}
          {todaysBreaks.length > 0 && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-6">
              <h3 className="text-white/60 text-sm mb-3">Today&apos;s Breaks</h3>
              <div className="space-y-2">
                {todaysBreaks.map((brk) => (
                  <div
                    key={brk.id}
                    className="flex items-center justify-between text-white/80 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {brk.break_type === 'meal' ? (
                        <UtensilsCrossed className="w-4 h-4" />
                      ) : (
                        <Coffee className="w-4 h-4" />
                      )}
                      <span className="capitalize">{brk.break_type}</span>
                      {brk.waived && (
                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Waived</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span>{formatTime(brk.break_start)}</span>
                      {brk.break_end && (
                        <>
                          <span className="mx-1">-</span>
                          <span>{formatTime(brk.break_end)}</span>
                        </>
                      )}
                      {!brk.break_end && !brk.waived && (
                        <span className="text-green-400 ml-2">In Progress</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Camera Modal */}
        {showCamera && (
          <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex items-center justify-between p-4">
              <button onClick={stopCamera} className="text-white">
                <X size={24} />
              </button>
              <span className="text-white font-semibold">Take a Selfie</span>
              <div className="w-6" />
            </div>
            <div className="flex-1 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="p-6 flex justify-center">
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center"
              >
                <Camera className="w-8 h-8 text-navy-500" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Attestation Modal */}
        {showAttestation && (
          <AttestationModal
            hoursWorked={hoursWorked}
            todaysBreaks={todaysBreaks}
            onComplete={async (attestation) => {
              setShowAttestation(false);
              setIsProcessing(true);
              const result = await clockOut(attestation);
              if (!result.success) {
                alert(result.error);
              }
              setIsProcessing(false);
            }}
            onCancel={() => setShowAttestation(false)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// Attestation Modal Component
interface AttestationModalProps {
  hoursWorked: number;
  todaysBreaks: import('@/types/database').Break[];
  onComplete: (attestation: AttestationData) => void;
  onCancel: () => void;
}

function AttestationModal({ hoursWorked, todaysBreaks, onComplete, onCancel }: AttestationModalProps) {
  const [step, setStep] = useState(1);
  const [missedMealBreak, setMissedMealBreak] = useState(false);
  const [missedMealReason, setMissedMealReason] = useState('');
  const [missedRestBreak, setMissedRestBreak] = useState(false);
  const [missedRestReason, setMissedRestReason] = useState('');
  const [signature, setSignature] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Check if breaks were taken
  const mealBreakTaken = todaysBreaks.some(
    (b) => b.break_type === 'meal' && (b.break_end || b.waived)
  );
  const restBreaksTaken = todaysBreaks.filter(
    (b) => b.break_type === 'rest' && b.break_end
  ).length;
  const restBreaksRequired = Math.floor(hoursWorked / 4);

  // Initialize signature canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && step === 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1a365d';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [step]);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setSignature('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL('image/png');
      setSignature(data);
    }
  };

  const handleSubmit = () => {
    if (!signature) {
      saveSignature();
    }
    onComplete({
      missedMealBreak,
      missedMealReason: missedMealBreak ? missedMealReason : undefined,
      missedRestBreak,
      missedRestReason: missedRestBreak ? missedRestReason : undefined,
      signature: signature || canvasRef.current?.toDataURL('image/png') || '',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-navy-500">Clock Out Attestation</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <p className="text-gray-600">
              Please confirm your breaks for today. This is required by California labor law.
            </p>

            {/* Meal Break Question */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <UtensilsCrossed className="w-5 h-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-navy-500">30-Minute Meal Break</p>
                  {mealBreakTaken ? (
                    <div className="flex items-center gap-2 mt-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Meal break taken</span>
                    </div>
                  ) : hoursWorked >= 5 ? (
                    <div className="mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={missedMealBreak}
                          onChange={(e) => setMissedMealBreak(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          I was unable to take my meal break
                        </span>
                      </label>
                      {missedMealBreak && (
                        <textarea
                          value={missedMealReason}
                          onChange={(e) => setMissedMealReason(e.target.value)}
                          placeholder="Please explain why..."
                          className="w-full mt-2 p-2 border rounded-lg text-sm"
                          rows={2}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      Not required for shifts under 5 hours
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Rest Break Question */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <Coffee className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-navy-500">10-Minute Rest Breaks</p>
                  {restBreaksTaken >= restBreaksRequired ? (
                    <div className="flex items-center gap-2 mt-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {restBreaksTaken} of {restBreaksRequired} rest breaks taken
                      </span>
                    </div>
                  ) : restBreaksRequired > 0 ? (
                    <div className="mt-3">
                      <p className="text-sm text-amber-600 mb-2">
                        {restBreaksTaken} of {restBreaksRequired} rest breaks taken
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={missedRestBreak}
                          onChange={(e) => setMissedRestBreak(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">
                          I was unable to take all rest breaks
                        </span>
                      </label>
                      {missedRestBreak && (
                        <textarea
                          value={missedRestReason}
                          onChange={(e) => setMissedRestReason(e.target.value)}
                          placeholder="Please explain why..."
                          className="w-full mt-2 p-2 border rounded-lg text-sm"
                          rows={2}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      Not required for shifts under 4 hours
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Continue to Signature
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              By signing below, I confirm that the break information above is accurate and that I
              have been provided the opportunity to take all required breaks.
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="w-full touch-none cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex justify-between">
              <button onClick={clearSignature} className="text-sm text-gray-500 hover:text-gray-700">
                Clear Signature
              </button>
              <button onClick={() => setStep(1)} className="text-sm text-navy-500 hover:underline">
                Back
              </button>
            </div>

            <button
              onClick={handleSubmit}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Confirm & Clock Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
