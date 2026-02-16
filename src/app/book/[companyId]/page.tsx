'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Service, Company } from '@/types/database';

// Types for the booking flow
interface BookingData {
  service: Service | null;
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerZip: string;
  notes: string;
}

type BookingStep = 'service' | 'datetime' | 'info' | 'confirm' | 'success';

// Generate time slots based on business hours and slot duration
interface BusinessHours {
  [key: string]: { open: string; close: string; enabled: boolean }
}

function generateTimeSlots(
  selectedDate: string,
  businessHours: BusinessHours | null,
  slotDuration: number = 30
): string[] {
  const slots: string[] = [];

  // Get day of week for the selected date
  const date = new Date(selectedDate + 'T00:00:00');
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[date.getDay()];

  // Default hours if no settings
  let startHour = 9;
  let startMinute = 0;
  let endHour = 17;
  let endMinute = 0;

  if (businessHours && businessHours[dayOfWeek] && businessHours[dayOfWeek].enabled) {
    const dayHours = businessHours[dayOfWeek];
    const [openH, openM] = dayHours.open.split(':').map(Number);
    const [closeH, closeM] = dayHours.close.split(':').map(Number);
    startHour = openH;
    startMinute = openM || 0;
    endHour = closeH;
    endMinute = closeM || 0;
  }

  // Generate slots
  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const minute = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    currentMinutes += slotDuration;
  }

  return slots;
}

// Format time for display
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Get available dates based on days ahead and business hours
function getAvailableDates(
  daysAhead: number = 14,
  businessHours: BusinessHours | null = null
): string[] {
  const dates: string[] = [];
  const today = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayOfWeek = days[date.getDay()];

    // Check if this day is enabled in business hours
    if (businessHours && businessHours[dayOfWeek]) {
      if (!businessHours[dayOfWeek].enabled) {
        continue; // Skip disabled days
      }
    } else {
      // Default: skip Sundays if no settings
      if (date.getDay() === 0) continue;
    }

    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export default function BookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = params.companyId as string;

  // Check if customer is coming from an approved quote
  const fromQuote = searchParams.get('from') === 'quote';
  const quoteId = searchParams.get('quoteId');

  const [company, setCompany] = useState<Company | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>('service');
  const [booking, setBooking] = useState<BookingData>({
    service: null,
    date: '',
    time: '',
    customerName: searchParams.get('name') || '',
    customerEmail: searchParams.get('email') || '',
    customerPhone: searchParams.get('phone') || '',
    customerAddress: searchParams.get('address') || '',
    customerCity: searchParams.get('city') || '',
    customerState: searchParams.get('state') || '',
    customerZip: searchParams.get('zip') || '',
    notes: quoteId ? `Approved Quote: ${quoteId}` : '',
  });

  // Get booking settings from company or use defaults
  const bookingSettings = company?.booking_settings as {
    days_ahead?: number;
    slot_duration?: number;
    business_hours?: BusinessHours;
  } | null;

  const daysAhead = bookingSettings?.days_ahead || 14;
  const slotDuration = bookingSettings?.slot_duration || 30;
  const businessHours = bookingSettings?.business_hours || null;

  const availableDates = getAvailableDates(daysAhead, businessHours);
  const timeSlots = booking.date
    ? generateTimeSlots(booking.date, businessHours, slotDuration)
    : [];

  // Fetch company and services
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError || !companyData) {
          setError('Company not found');
          setIsLoading(false);
          return;
        }

        setCompany(companyData as Company);

        // Fetch active services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('name');

        if (servicesError) {
          throw servicesError;
        }

        setServices((servicesData as Service[]) || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load booking page');
      } finally {
        setIsLoading(false);
      }
    }

    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  // Fetch booked slots when date changes
  useEffect(() => {
    async function fetchBookedSlots() {
      if (!booking.date || !companyId) return;

      try {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('scheduled_time_start, scheduled_time_end')
          .eq('company_id', companyId)
          .eq('scheduled_date', booking.date)
          .neq('status', 'cancelled');

        const booked = new Set<string>();
        jobs?.forEach((job) => {
          if (job.scheduled_time_start) {
            // Mark this slot as booked
            booked.add(job.scheduled_time_start.slice(0, 5));
          }
        });
        setBookedSlots(booked);
      } catch (err) {
        console.error('Error fetching booked slots:', err);
      }
    }

    fetchBookedSlots();
  }, [booking.date, companyId]);

  // Handle service selection
  const selectService = (service: Service) => {
    setBooking((prev) => ({ ...prev, service }));
    setStep('datetime');
  };

  // Handle date selection
  const selectDate = (date: string) => {
    setBooking((prev) => ({ ...prev, date, time: '' }));
  };

  // Handle time selection
  const selectTime = (time: string) => {
    setBooking((prev) => ({ ...prev, time }));
    setStep('info');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('confirm');
  };

  // Confirm and submit booking
  const confirmBooking = async () => {
    if (!booking.service || !company) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          serviceId: booking.service.id,
          serviceName: booking.service.name,
          scheduledDate: booking.date,
          scheduledTimeStart: booking.time,
          durationMinutes: booking.service.duration_minutes,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
          customerAddress: booking.customerAddress,
          customerCity: booking.customerCity,
          customerState: booking.customerState,
          customerZip: booking.customerZip,
          notes: booking.notes,
          ...(quoteId ? { quoteId } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      setStep('success');
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#f5a623] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#5c5c70]">Loading booking page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !company) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Page Not Found</h1>
          <p className="text-[#5c5c70] mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white rounded-xl font-medium hover:bg-[#2d2d44] transition-colors no-underline"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <Image
                src={company.logo_url}
                alt={company.name}
                className="w-10 h-10 rounded-lg object-cover"
                width={40}
                height={40}
              />
            ) : (
              <div className="w-10 h-10 bg-[#f5a623] rounded-lg flex items-center justify-center text-xl">
                🛠
              </div>
            )}
            <div>
              <h1 className="font-bold text-[#1a1a2e]">{company?.name}</h1>
              <p className="text-sm text-[#5c5c70]">Online Booking</p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      {step !== 'success' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {[
                { key: 'service', label: 'Service' },
                { key: 'datetime', label: 'Date & Time' },
                { key: 'info', label: 'Your Info' },
                { key: 'confirm', label: 'Confirm' },
              ].map((s, index) => {
                const steps: BookingStep[] = ['service', 'datetime', 'info', 'confirm'];
                const currentIndex = steps.indexOf(step);
                const stepIndex = steps.indexOf(s.key as BookingStep);
                const isActive = stepIndex === currentIndex;
                const isCompleted = stepIndex < currentIndex;

                return (
                  <div key={s.key} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isCompleted
                          ? 'bg-[#00c853] text-white'
                          : isActive
                            ? 'bg-[#f5a623] text-[#1a1a2e]'
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span
                      className={`ml-2 text-sm font-medium ${
                        isActive ? 'text-[#1a1a2e]' : 'text-gray-500'
                      }`}
                    >
                      {s.label}
                    </span>
                    {index < 3 && (
                      <div
                        className={`w-12 md:w-24 h-0.5 mx-2 ${
                          isCompleted ? 'bg-[#00c853]' : 'bg-gray-200'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {fromQuote && step !== 'success' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-semibold text-green-800">Quote Approved!</p>
              <p className="text-green-700 text-sm">Pick a date and time to schedule your service. Your info has been pre-filled.</p>
            </div>
          </div>
        )}

        {error && step !== 'success' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Step 1: Select Service */}
        {step === 'service' && (
          <div>
            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Select a Service</h2>
            <p className="text-[#5c5c70] mb-6">Choose the service you need.</p>

            {services.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-[#5c5c70]">No services available for booking at this time.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => selectService(service)}
                    className="w-full text-left bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-[#f5a623] hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-[#1a1a2e] text-lg mb-1 group-hover:text-[#f5a623]">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="text-[#5c5c70] text-sm mb-2">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-[#8e8e9f]">
                          <span>⏱ {service.duration_minutes} min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {service.default_price && (
                          <div className="text-xl font-bold text-[#1a1a2e]">
                            ${service.default_price}
                            {service.price_type === 'hourly' && (
                              <span className="text-sm font-normal text-[#5c5c70]">/hr</span>
                            )}
                            {service.price_type === 'per_sqft' && (
                              <span className="text-sm font-normal text-[#5c5c70]">/sqft</span>
                            )}
                          </div>
                        )}
                        <span className="text-[#f5a623] font-medium text-sm">Select →</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 'datetime' && (
          <div>
            <button
              onClick={() => setStep('service')}
              className="flex items-center gap-1 text-[#5c5c70] hover:text-[#1a1a2e] mb-4 text-sm"
            >
              ← Back to services
            </button>

            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Select Date & Time</h2>
            <p className="text-[#5c5c70] mb-6">
              Choose when you&apos;d like to schedule your {booking.service?.name}.
            </p>

            {/* Date Selection */}
            <div className="mb-8">
              <h3 className="font-bold text-[#1a1a2e] mb-3">Available Dates</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableDates.map((date) => {
                  const d = new Date(date + 'T00:00:00');
                  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = d.getDate();
                  const month = d.toLocaleDateString('en-US', { month: 'short' });
                  const isSelected = booking.date === date;

                  return (
                    <button
                      key={date}
                      onClick={() => selectDate(date)}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? 'border-[#f5a623] bg-[#fef3d6]'
                          : 'border-gray-200 bg-white hover:border-[#f5a623]'
                      }`}
                    >
                      <div className="text-sm text-[#5c5c70]">{dayName}</div>
                      <div className="text-2xl font-bold text-[#1a1a2e]">{dayNum}</div>
                      <div className="text-sm text-[#5c5c70]">{month}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Selection */}
            {booking.date && (
              <div>
                <h3 className="font-bold text-[#1a1a2e] mb-3">Available Times</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {timeSlots.map((time) => {
                    const isBooked = bookedSlots.has(time);
                    const isSelected = booking.time === time;

                    return (
                      <button
                        key={time}
                        onClick={() => !isBooked && selectTime(time)}
                        disabled={isBooked}
                        className={`p-3 rounded-xl border-2 text-center font-medium transition-all ${
                          isBooked
                            ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : isSelected
                              ? 'border-[#f5a623] bg-[#fef3d6] text-[#1a1a2e]'
                              : 'border-gray-200 bg-white hover:border-[#f5a623] text-[#1a1a2e]'
                        }`}
                      >
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customer Information */}
        {step === 'info' && (
          <div>
            <button
              onClick={() => setStep('datetime')}
              className="flex items-center gap-1 text-[#5c5c70] hover:text-[#1a1a2e] mb-4 text-sm"
            >
              ← Back to date & time
            </button>

            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Your Information</h2>
            <p className="text-[#5c5c70] mb-6">Tell us how to reach you.</p>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={booking.customerName}
                    onChange={(e) =>
                      setBooking((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                    placeholder="John Smith"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={booking.customerEmail}
                      onChange={(e) =>
                        setBooking((prev) => ({ ...prev, customerEmail: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={booking.customerPhone}
                      onChange={(e) =>
                        setBooking((prev) => ({ ...prev, customerPhone: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                    Service Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={booking.customerAddress}
                    onChange={(e) =>
                      setBooking((prev) => ({ ...prev, customerAddress: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={booking.customerCity}
                      onChange={(e) =>
                        setBooking((prev) => ({ ...prev, customerCity: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                      placeholder="Los Angeles"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={booking.customerState}
                      onChange={(e) =>
                        setBooking((prev) => ({ ...prev, customerState: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={booking.customerZip}
                      onChange={(e) =>
                        setBooking((prev) => ({ ...prev, customerZip: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all"
                      placeholder="90001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={booking.notes}
                    onChange={(e) => setBooking((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-[#f5a623] outline-none transition-all resize-none"
                    placeholder="Any special instructions or details about the job..."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-6 py-4 bg-[#f5a623] text-[#1a1a2e] rounded-xl font-bold text-lg hover:bg-[#e6991a] transition-colors"
              >
                Review Booking
              </button>
            </form>
          </div>
        )}

        {/* Step 4: Confirm Booking */}
        {step === 'confirm' && (
          <div>
            <button
              onClick={() => setStep('info')}
              className="flex items-center gap-1 text-[#5c5c70] hover:text-[#1a1a2e] mb-4 text-sm"
            >
              ← Back to your info
            </button>

            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Confirm Your Booking</h2>
            <p className="text-[#5c5c70] mb-6">Please review your booking details.</p>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Service Details */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-medium text-[#5c5c70] mb-2">SERVICE</h3>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[#1a1a2e] text-lg">{booking.service?.name}</p>
                    <p className="text-sm text-[#5c5c70]">
                      {booking.service?.duration_minutes} minutes
                    </p>
                  </div>
                  {booking.service?.default_price && (
                    <p className="text-xl font-bold text-[#1a1a2e]">
                      ${booking.service.default_price}
                    </p>
                  )}
                </div>
              </div>

              {/* Date & Time */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-medium text-[#5c5c70] mb-2">DATE & TIME</h3>
                <p className="font-bold text-[#1a1a2e]">{formatDate(booking.date)}</p>
                <p className="text-[#5c5c70]">{formatTime(booking.time)}</p>
              </div>

              {/* Customer Info */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-medium text-[#5c5c70] mb-2">CONTACT INFORMATION</h3>
                <p className="font-bold text-[#1a1a2e]">{booking.customerName}</p>
                <p className="text-[#5c5c70]">{booking.customerEmail}</p>
                <p className="text-[#5c5c70]">{booking.customerPhone}</p>
              </div>

              {/* Address */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-sm font-medium text-[#5c5c70] mb-2">SERVICE ADDRESS</h3>
                <p className="text-[#1a1a2e]">{booking.customerAddress}</p>
                <p className="text-[#5c5c70]">
                  {booking.customerCity}, {booking.customerState} {booking.customerZip}
                </p>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-[#5c5c70] mb-2">NOTES</h3>
                  <p className="text-[#1a1a2e]">{booking.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="p-6 bg-gray-50">
                <button
                  onClick={confirmBooking}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#00c853] text-white rounded-xl font-bold text-lg hover:bg-[#00a844] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>Confirm Booking</>
                  )}
                </button>
                <p className="text-center text-sm text-[#5c5c70] mt-3">
                  You&apos;ll receive a confirmation email at {booking.customerEmail}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-[#e8f5e9] rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-[#1a1a2e] mb-2">Booking Confirmed!</h2>
            <p className="text-[#5c5c70] mb-8 max-w-md mx-auto">
              Your appointment has been scheduled. We&apos;ve sent a confirmation email to{' '}
              <strong>{booking.customerEmail}</strong>.
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md mx-auto mb-8">
              <div className="text-left">
                <div className="mb-4">
                  <p className="text-sm text-[#5c5c70]">Service</p>
                  <p className="font-bold text-[#1a1a2e]">{booking.service?.name}</p>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-[#5c5c70]">Date & Time</p>
                  <p className="font-bold text-[#1a1a2e]">
                    {formatDate(booking.date)} at {formatTime(booking.time)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#5c5c70]">Location</p>
                  <p className="font-bold text-[#1a1a2e]">{booking.customerAddress}</p>
                  <p className="text-[#5c5c70]">
                    {booking.customerCity}, {booking.customerState} {booking.customerZip}
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white rounded-xl font-medium hover:bg-[#2d2d44] transition-colors no-underline"
            >
              Back to Home
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-3xl mx-auto px-4 text-center">
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
