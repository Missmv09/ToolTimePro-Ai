'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  CalendarCheck,
  Clock,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  User,
  Phone,
  Mail,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Filter,
} from 'lucide-react';

interface Booking {
  id: string;
  title: string;
  address: string | null;
  city: string | null;
  scheduled_date: string;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  customer: { name: string; email: string; phone: string } | { name: string; email: string; phone: string }[] | null;
}

function getCustomer(customer: Booking['customer']): { name: string; email: string; phone: string } | null {
  if (!customer) return null;
  if (Array.isArray(customer)) return customer[0] || null;
  return customer;
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return 'TBD';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function BookingDashboardPage() {
  const { user, dbUser, company } = useAuth();
  const companyId = dbUser?.company_id || null;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);

  const fetchBookings = useCallback(async (compId: string) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('jobs')
      .select(`
        id, title, address, city, scheduled_date, scheduled_time_start, scheduled_time_end, status, notes, created_at,
        customer:customers(name, email, phone)
      `)
      .eq('company_id', compId)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time_start', { ascending: true });

    if (filter === 'upcoming') {
      query = query.gte('scheduled_date', today).in('status', ['scheduled', 'in_progress']);
    } else if (filter === 'past') {
      query = query.or(`scheduled_date.lt.${today},status.eq.completed,status.eq.cancelled`);
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (companyId) {
      fetchBookings(companyId);
      // Fetch the site slug for the booking URL
      supabase
        .from('website_deployments')
        .select('slug')
        .eq('company_id', companyId)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data?.slug) setSiteSlug(data.slug);
        });
    } else {
      setLoading(false);
    }
  }, [companyId, fetchBookings]);

  // Build the public booking URL
  const bookingUrl = siteSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/site/${siteSlug}/book`
    : null;

  const handleCopyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const upcomingCount = bookings.filter((b) => b.status === 'scheduled').length;
  const inProgressCount = bookings.filter((b) => b.status === 'in_progress').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <CalendarCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Online Booking</h1>
            <p className="text-sm text-gray-500">Manage appointments and share your booking page</p>
          </div>
        </div>
        <Link
          href="/dashboard/schedule"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <CalendarDays className="w-4 h-4" /> Full Schedule
        </Link>
      </div>

      {/* Booking Link Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">
        <h2 className="font-semibold mb-2">Your Online Booking Link</h2>
        <p className="text-blue-100 text-sm mb-4">
          Share this link with customers so they can book appointments online.
        </p>
        {bookingUrl ? (
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 bg-white/10 rounded-lg px-4 py-2.5 text-sm font-mono truncate min-w-0">
              {bookingUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" /> Preview
            </a>
          </div>
        ) : (
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-blue-100 text-sm mb-2">
              Set up your company website to enable online booking.
            </p>
            <Link
              href="/dashboard/website-builder"
              className="inline-flex items-center gap-2 text-white font-medium text-sm hover:underline"
            >
              Go to Website Builder <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">Upcoming</p>
          <p className="text-2xl font-bold text-blue-700">{upcomingCount}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-600">In Progress</p>
          <p className="text-2xl font-bold text-yellow-700">{inProgressCount}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600">Completed</p>
          <p className="text-2xl font-bold text-green-700">{completedCount}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex rounded-lg overflow-hidden border">
          {(['upcoming', 'past', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium capitalize ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">
            {filter === 'upcoming' ? 'No upcoming bookings' : filter === 'past' ? 'No past bookings' : 'No bookings yet'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Share your booking link with customers to start receiving appointments.
          </p>
          <Link
            href="/dashboard/jobs"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create a Job Manually <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {bookings.map((booking) => {
            const customer = getCustomer(booking.customer);
            const isSelected = selectedBooking?.id === booking.id;

            return (
              <div
                key={booking.id}
                className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedBooking(isSelected ? null : booking)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center flex-shrink-0 w-14">
                      <p className="text-xs text-gray-500">{formatDate(booking.scheduled_date).split(',')[0]}</p>
                      <p className="text-lg font-bold text-gray-900">
                        {new Date(booking.scheduled_date + 'T00:00:00').getDate()}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{booking.title}</h4>
                      <p className="text-sm text-gray-500">
                        {customer?.name || 'No customer'} &middot; {formatTime(booking.scheduled_time_start)}
                        {booking.scheduled_time_end ? ` - ${formatTime(booking.scheduled_time_end)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Expanded details */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid md:grid-cols-2 gap-4">
                      {customer && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-500">Customer</h5>
                          <p className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-gray-400" /> {customer.name}
                          </p>
                          {customer.email && (
                            <p className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-400" /> {customer.email}
                            </p>
                          )}
                          {customer.phone && (
                            <p className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                                {customer.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-500">Details</h5>
                        <p className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatDate(booking.scheduled_date)}, {formatTime(booking.scheduled_time_start)}
                        </p>
                        {booking.address && (
                          <p className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {booking.address}{booking.city ? `, ${booking.city}` : ''}
                          </p>
                        )}
                        {booking.notes && (
                          <p className="text-sm text-gray-600 italic">Notes: {booking.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link
                        href={`/dashboard/jobs?edit=${booking.id}`}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium text-center hover:bg-blue-700 transition-colors"
                      >
                        View/Edit Job
                      </Link>
                      <Link
                        href="/dashboard/dispatch"
                        className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium text-center hover:bg-gray-200 transition-colors"
                      >
                        Open Dispatch
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
