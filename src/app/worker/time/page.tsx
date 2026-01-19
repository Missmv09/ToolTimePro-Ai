'use client';

import { useState } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';

interface TimeEntry {
  id: string;
  date: Date;
  job: string;
  client: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  status: 'approved' | 'pending' | 'rejected';
}

// Mock time entries
const generateTimeEntries = (): TimeEntry[] => {
  const entries: TimeEntry[] = [];
  const jobs = [
    { job: 'Lawn Maintenance', client: 'Johnson Residence' },
    { job: 'Pool Cleaning', client: 'Smith Pool Service' },
    { job: 'Window Cleaning', client: 'Tech Office Park' },
    { job: 'Pressure Washing', client: 'Maple Street Apts' },
    { job: 'Landscaping', client: 'Wilson Family' },
  ];

  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // Random 2-4 entries per day
    const entriesPerDay = Math.floor(Math.random() * 3) + 2;
    let currentHour = 8;

    for (let j = 0; j < entriesPerDay; j++) {
      const hours = Math.floor(Math.random() * 2) + 1 + Math.random();
      const jobInfo = jobs[Math.floor(Math.random() * jobs.length)];

      entries.push({
        id: `${date.toISOString()}-${j}`,
        date: new Date(date),
        job: jobInfo.job,
        client: jobInfo.client,
        clockIn: `${currentHour}:${Math.random() > 0.5 ? '00' : '30'} AM`,
        clockOut: `${currentHour + Math.floor(hours)}:${Math.random() > 0.5 ? '00' : '30'} ${currentHour + hours >= 12 ? 'PM' : 'AM'}`,
        hours: Math.round(hours * 10) / 10,
        status: i < 7 ? (Math.random() > 0.1 ? 'approved' : 'pending') : 'approved',
      });

      currentHour += Math.floor(hours) + 1;
      if (currentHour >= 17) break;
    }
  }

  return entries;
};

const timeEntries = generateTimeEntries();

export default function WorkerTimePage() {
  const [selectedWeek, setSelectedWeek] = useState(0);

  const getWeekDates = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek - offset * 7);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return { start: startOfWeek, end: endOfWeek };
  };

  const { start, end } = getWeekDates(selectedWeek);

  const weekEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= start && entryDate <= end;
  });

  const totalHours = weekEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const regularHours = Math.min(totalHours, 40);
  const overtimeHours = Math.max(totalHours - 40, 0);

  // Group by date
  const entriesByDate = weekEntries.reduce(
    (acc, entry) => {
      const dateKey = entry.date.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(entry);
      return acc;
    },
    {} as Record<string, TimeEntry[]>
  );

  const formatDateRange = (start: Date, end: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  return (
    <div className="p-4 space-y-4">
      {/* Week Selector */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedWeek(selectedWeek + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm text-gray-500">Week of</p>
            <p className="font-semibold text-navy-500">{formatDateRange(start, end)}</p>
          </div>
          <button
            onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
            disabled={selectedWeek === 0}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Hours Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <Clock className="w-6 h-6 text-navy-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-navy-500">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Total Hours</p>
        </div>
        <div className="card text-center">
          <Calendar className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-600">{regularHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Regular</p>
        </div>
        <div className="card text-center">
          <DollarSign className="w-6 h-6 text-gold-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-gold-600">{overtimeHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Overtime</p>
        </div>
      </div>

      {/* Time Entries by Date */}
      {Object.entries(entriesByDate)
        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
        .map(([dateStr, entries]) => {
          const date = new Date(dateStr);
          const dayTotal = entries.reduce((sum, e) => sum + e.hours, 0);

          return (
            <div key={dateStr} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-navy-500">
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-navy-500">{dayTotal.toFixed(1)} hrs</p>
                  <p className="text-xs text-gray-500">{entries.length} jobs</p>
                </div>
              </div>

              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-navy-500 text-sm">{entry.client}</p>
                      <p className="text-xs text-gray-500">{entry.job}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-navy-500">
                        {entry.clockIn} - {entry.clockOut}
                      </p>
                      <p className="text-xs text-gray-500">{entry.hours} hrs</p>
                    </div>
                    <div className="ml-3">
                      {entry.status === 'approved' && (
                        <span className="badge-success text-xs">Approved</span>
                      )}
                      {entry.status === 'pending' && (
                        <span className="badge-warning text-xs">Pending</span>
                      )}
                      {entry.status === 'rejected' && (
                        <span className="badge-danger text-xs">Rejected</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {Object.keys(entriesByDate).length === 0 && (
        <div className="card text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No time entries for this week</p>
        </div>
      )}
    </div>
  );
}
