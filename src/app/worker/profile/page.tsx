'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  Shield,
  Bell,
  LogOut,
  ChevronRight,
  Clock,
  DollarSign,
  Calendar,
} from 'lucide-react';

export default function WorkerProfilePage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    router.push('/worker/login');
  };

  // Mock worker data
  const worker = {
    name: 'Mike Sanders',
    phone: '(555) 123-4567',
    email: 'mike.s@example.com',
    role: 'Field Technician',
    startDate: 'March 15, 2023',
    hourlyRate: 22.0,
    ytdHours: 1847.5,
    ytdEarnings: 40645.0,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-20 h-20 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-navy-500">
            {worker.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
        </div>
        <h1 className="text-xl font-bold text-navy-500">{worker.name}</h1>
        <p className="text-gray-500">{worker.role}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">Active Employee</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-gold-500" />
            <span className="text-sm text-gray-500">YTD Hours</span>
          </div>
          <p className="text-2xl font-bold text-navy-500">{worker.ytdHours.toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">YTD Earnings</span>
          </div>
          <p className="text-2xl font-bold text-navy-500">
            ${worker.ytdEarnings.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="card">
        <h2 className="font-semibold text-navy-500 mb-4">Contact Information</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-navy-500">{worker.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-navy-500">{worker.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium text-navy-500">{worker.startDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Hourly Rate</p>
              <p className="font-medium text-navy-500">${worker.hourlyRate.toFixed(2)}/hr</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="card">
        <h2 className="font-semibold text-navy-500 mb-4">Settings</h2>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-navy-500">Push Notifications</span>
            </div>
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors ${
                notifications ? 'bg-gold-500' : 'bg-gray-300'
              }`}
              onClick={() => setNotifications(!notifications)}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full transition-transform ${
                  notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-navy-500">Edit Profile</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-navy-500">Change PIN</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </button>

      {/* App Version */}
      <p className="text-center text-xs text-gray-400">ToolTime Pro Worker App v1.0.0</p>
    </div>
  );
}
