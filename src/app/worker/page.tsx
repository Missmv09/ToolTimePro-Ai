'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Clock,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
} from 'lucide-react';

interface Job {
  id: string;
  client: string;
  address: string;
  service: string;
  time: string;
  status: 'upcoming' | 'in_progress' | 'completed';
  phone: string;
  notes?: string;
}

const todaysJobs: Job[] = [
  {
    id: '1',
    client: 'Johnson Residence',
    address: '123 Oak Street, Los Angeles, CA',
    service: 'Weekly Lawn Maintenance',
    time: '9:00 AM - 11:00 AM',
    status: 'completed',
    phone: '(555) 123-4567',
    notes: 'Gate code: 1234. Dog in backyard - friendly.',
  },
  {
    id: '2',
    client: 'Smith Pool Service',
    address: '456 Palm Ave, Beverly Hills, CA',
    service: 'Pool Cleaning & Chemical Balance',
    time: '11:30 AM - 12:30 PM',
    status: 'in_progress',
    phone: '(555) 234-5678',
    notes: 'Check pump filter. Customer reported cloudy water.',
  },
  {
    id: '3',
    client: 'Tech Office Park',
    address: '789 Business Blvd, Suite 100',
    service: 'Window Cleaning - Exterior',
    time: '1:00 PM - 4:00 PM',
    status: 'upcoming',
    phone: '(555) 345-6789',
    notes: 'Check in at front desk. Parking in back lot.',
  },
  {
    id: '4',
    client: 'Maple Street Apartments',
    address: '321 Maple Street, Units 1-8',
    service: 'Pressure Washing - Common Areas',
    time: '4:30 PM - 6:00 PM',
    status: 'upcoming',
    phone: '(555) 456-7890',
  },
];

const statusColors = {
  upcoming: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
};

const statusLabels = {
  upcoming: 'Upcoming',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export default function WorkerJobsPage() {
  const [jobs] = useState<Job[]>(todaysJobs);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const inProgressJob = jobs.find((j) => j.status === 'in_progress');

  return (
    <div className="p-4 space-y-4">
      {/* Date Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-500">Today&apos;s Jobs</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Calendar size={14} />
            {today}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-navy-500">
            {completedCount}/{jobs.length}
          </p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>

      {/* Current Job Banner */}
      {inProgressJob && (
        <div className="bg-gold-50 border-2 border-gold-500 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gold-700">Currently Working</span>
          </div>
          <h3 className="font-bold text-navy-500">{inProgressJob.client}</h3>
          <p className="text-sm text-gray-600">{inProgressJob.service}</p>
          <Link
            href={`/worker/job/${inProgressJob.id}`}
            className="btn-secondary mt-3 w-full text-center"
          >
            View Job Details
          </Link>
        </div>
      )}

      {/* Job List */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/worker/job/${job.id}`}
            className="card block hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-navy-500">{job.client}</h3>
                  <span className={`badge text-xs ${statusColors[job.status]}`}>
                    {statusLabels[job.status]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{job.service}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {job.time}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {job.address.split(',')[0]}
              </span>
            </div>

            {job.status === 'completed' && (
              <div className="flex items-center gap-1 mt-3 text-green-600 text-sm">
                <CheckCircle size={16} />
                <span>Completed</span>
              </div>
            )}

            {job.notes && job.status !== 'completed' && (
              <div className="flex items-start gap-2 mt-3 p-2 bg-yellow-50 rounded-lg">
                <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-700">{job.notes}</p>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Help Button */}
      <div className="fixed bottom-24 right-4">
        <a
          href="tel:+15551234567"
          className="w-14 h-14 bg-navy-500 rounded-full flex items-center justify-center shadow-lg hover:bg-navy-600 transition-colors"
        >
          <Phone className="w-6 h-6 text-white" />
        </a>
      </div>
    </div>
  );
}
