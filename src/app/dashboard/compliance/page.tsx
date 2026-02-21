'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  UtensilsCrossed,
  Coffee,
  TrendingUp,
  Users,
  Calendar,
  ChevronRight,
  RefreshCw,
  FileText,
  Download,
  Lock,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JennyExecChat from '@/components/jenny/JennyExecChat';
import { useComplianceAlerts } from '@/hooks/useComplianceAlerts';
import { useAuth } from '@/contexts/AuthContext';

const severityColors = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  violation: 'bg-red-100 text-red-700 border-red-200',
};

const alertTypeIcons = {
  meal_break_due: UtensilsCrossed,
  meal_break_missed: UtensilsCrossed,
  rest_break_due: Coffee,
  overtime_warning: TrendingUp,
  double_time_warning: Clock,
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(hours: number): string {
  return hours.toFixed(1);
}

export default function ComplianceDashboardPage() {
  const { dbUser, company } = useAuth();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isOwner = dbUser?.role === 'owner';
  const isBetaTester = !!company?.is_beta_tester;
  const hasJennyExec = (company?.addons || []).includes('jenny_exec_admin');
  const hasAccess = isOwner && (isBetaTester || hasJennyExec);

  const {
    alerts,
    stats,
    timeEntries,
    isLoading,
    error,
    acknowledgeAlert,
    refetch,
  } = useComplianceAlerts(dateRange);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAlerts = () => {
    const header = 'ID,Title,Description,Severity,Worker,Date,Acknowledged';
    const rows = alerts.map((alert) => {
      const escapeCsv = (val: string) => `"${(val ?? '').replace(/"/g, '""')}"`;
      return [
        escapeCsv(alert.id),
        escapeCsv(alert.title),
        escapeCsv(alert.description ?? ''),
        escapeCsv(alert.severity),
        escapeCsv(alert.user?.full_name || 'Unknown'),
        escapeCsv(new Date(alert.created_at).toLocaleString()),
        alert.acknowledged ? 'Yes' : 'No',
      ].join(',');
    });
    downloadCsv(`compliance-alerts-${dateRange}.csv`, [header, ...rows].join('\n'));
  };

  const handleGenerateReport = () => {
    const reportDate = new Date().toLocaleString();
    const header = 'Metric,Value';
    const rows = [
      `Report Generated,"${reportDate}"`,
      `Date Range,"${dateRange}"`,
      `Total Violations,${stats.totalViolations}`,
      `Meal Break Violations,${stats.mealBreakViolations}`,
      `Rest Break Violations,${stats.restBreakViolations}`,
      `Overtime Alerts,${stats.overtimeAlerts}`,
      `Double Time Alerts,${stats.doubleTimeAlerts}`,
      `Unacknowledged Alerts,${stats.unacknowledgedCount}`,
      `Total Alerts,${alerts.length}`,
      `Total Time Entries,${timeEntries.length}`,
      `Entries with Missed Meal Breaks,${timeEntries.filter((e) => e.missed_meal_break).length}`,
      `Entries with Missed Rest Breaks,${timeEntries.filter((e) => e.missed_rest_break).length}`,
      `Pending Attestations,${timeEntries.filter((e) => !e.attestation_completed).length}`,
    ];
    downloadCsv(`compliance-report-${dateRange}.csv`, [header, ...rows].join('\n'));
  };

  const handleExportAttestations = () => {
    const header = 'Worker,Date,Hours,Meal Break,Rest Break,Attestation';
    const rows = timeEntries.map((entry) => {
      const escapeCsv = (val: string) => `"${(val ?? '').replace(/"/g, '""')}"`;
      const mealStatus = entry.missed_meal_break
        ? 'Missed'
        : entry.hours_worked >= 5
        ? 'Taken'
        : 'N/A';
      const restStatus = entry.missed_rest_break ? 'Missed' : 'OK';
      const attestation = entry.attestation_completed ? 'Signed' : 'Pending';
      return [
        escapeCsv(entry.user?.full_name || 'Unknown'),
        escapeCsv(new Date(entry.clock_in).toLocaleDateString()),
        formatHours(entry.hours_worked),
        mealStatus,
        restStatus,
        attestation,
      ].join(',');
    });
    downloadCsv(`attestations-${dateRange}.csv`, [header, ...rows].join('\n'));
  };

  // Get workers with most violations
  const violationsByWorker = alerts
    .filter((a) => a.severity === 'violation')
    .reduce((acc, alert) => {
      const name = alert.user?.full_name || 'Unknown';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topViolators = Object.entries(violationsByWorker)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Jenny Exec Admin Feature</h1>
          <p className="text-gray-500 mb-6">
            The CA Compliance Dashboard is part of Jenny Exec Admin — available to business owners
            for $79/mo. Get compliance alerts, HR guidance, and business insights.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors no-underline"
          >
            View Plans & Add-ons
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-500 flex items-center gap-2">
              <Shield className="w-7 h-7 text-gold-500" />
              CA Compliance Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Monitor labor law compliance and break violations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month')}
              className="input py-2"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-ghost flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="stat-value text-red-600">{stats.totalViolations}</p>
                <p className="stat-label">Total Violations</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="stat-value text-amber-600">{stats.mealBreakViolations}</p>
                <p className="stat-label">Meal Break</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Coffee className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="stat-value text-blue-600">{stats.restBreakViolations}</p>
                <p className="stat-label">Rest Break</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="stat-value text-purple-600">{stats.overtimeAlerts}</p>
                <p className="stat-label">Overtime</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="stat-value text-orange-600">{stats.doubleTimeAlerts}</p>
                <p className="stat-label">Double Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts List */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-navy-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Recent Alerts
                {stats.unacknowledgedCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {stats.unacknowledgedCount} new
                  </span>
                )}
              </h2>
              <button
                onClick={handleExportAlerts}
                className="btn-ghost text-sm flex items-center gap-1"
              >
                <Download size={16} />
                Export
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No compliance alerts</p>
                <p className="text-sm text-gray-500">All workers are following break requirements</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {alerts.map((alert) => {
                  const Icon = alertTypeIcons[alert.alert_type] || AlertCircle;
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${severityColors[alert.severity]} ${
                        !alert.acknowledged ? 'ring-2 ring-offset-2' : 'opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 mt-0.5" />
                          <div>
                            <p className="font-semibold">{alert.title}</p>
                            <p className="text-sm opacity-80">{alert.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs opacity-70">
                              <span className="flex items-center gap-1">
                                <Users size={12} />
                                {alert.user?.full_name || 'Unknown Worker'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDateTime(alert.created_at)}
                              </span>
                              {alert.hours_worked && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatHours(alert.hours_worked)}h worked
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-xs font-medium hover:underline flex items-center gap-1"
                          >
                            Acknowledge
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Workers with Most Violations */}
            <div className="card">
              <h3 className="text-lg font-semibold text-navy-500 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                Needs Attention
              </h3>
              {topViolators.length === 0 ? (
                <p className="text-sm text-gray-500">No violations recorded</p>
              ) : (
                <div className="space-y-3">
                  {topViolators.map(([name, count], i) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-navy-500">{name}</span>
                      </div>
                      <span className="text-sm text-red-600 font-semibold">
                        {count} violation{count > 1 ? 's' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-navy-500 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard/time-logs"
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">View Time Logs</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
                <button
                  onClick={handleGenerateReport}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Generate Report</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
                <button
                  onClick={handleExportAttestations}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Export Attestations</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Jenny AI Compliance Advisor */}
            <JennyExecChat
              mode="compliance"
              complianceStats={{
                totalViolations: stats.totalViolations,
                mealBreakViolations: stats.mealBreakViolations,
                restBreakViolations: stats.restBreakViolations,
                overtimeAlerts: stats.overtimeAlerts,
              }}
              inline
            />
          </div>
        </div>

        {/* Recent Time Entries with Attestations */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-navy-500">
              Recent Time Entries & Attestations
            </h2>
            <Link href="/dashboard/time-logs" className="btn-ghost text-sm">
              View All
            </Link>
          </div>

          {timeEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No time entries for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header">Worker</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Hours</th>
                    <th className="table-header">Meal Break</th>
                    <th className="table-header">Rest Breaks</th>
                    <th className="table-header">Attestation</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.slice(0, 10).map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">
                        {entry.user?.full_name || 'Unknown'}
                      </td>
                      <td className="table-cell text-gray-500">
                        {new Date(entry.clock_in).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <span
                          className={
                            entry.hours_worked >= 12
                              ? 'text-red-600 font-semibold'
                              : entry.hours_worked >= 8
                              ? 'text-amber-600 font-semibold'
                              : ''
                          }
                        >
                          {formatHours(entry.hours_worked)}h
                        </span>
                      </td>
                      <td className="table-cell">
                        {entry.missed_meal_break ? (
                          <span className="badge-danger">Missed</span>
                        ) : entry.hours_worked >= 5 ? (
                          <span className="badge-success">Taken</span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {entry.missed_rest_break ? (
                          <span className="badge-danger">Missed</span>
                        ) : (
                          <span className="badge-success">OK</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {entry.attestation_completed ? (
                          <span className="badge-success flex items-center gap-1 w-fit">
                            <CheckCircle size={12} />
                            Signed
                          </span>
                        ) : (
                          <span className="badge-warning">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
