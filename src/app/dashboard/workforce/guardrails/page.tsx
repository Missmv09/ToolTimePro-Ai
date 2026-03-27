'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWorkforce } from '@/hooks/useWorkforce';
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  RefreshCw,
  Filter,
} from 'lucide-react';

export default function GuardrailsPage() {
  const { guardrails, profiles, resolveGuardrail, runGuardrailChecks, refetch, isLoading } = useWorkforce();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'violation' | 'warning' | 'info'>('all');

  const filteredGuardrails = guardrails.filter(g => {
    if (filterSeverity === 'all') return true;
    return g.severity === filterSeverity;
  });

  const violationCount = guardrails.filter(g => g.severity === 'violation').length;
  const warningCount = guardrails.filter(g => g.severity === 'warning').length;
  const infoCount = guardrails.filter(g => g.severity === 'info').length;

  const handleResolve = async () => {
    if (!resolveId) return;
    setResolving(true);
    await resolveGuardrail(resolveId, resolveNotes);
    setResolveId(null);
    setResolveNotes('');
    setResolving(false);
  };

  const handleScanAll = async () => {
    setScanning(true);
    const contractors = profiles.filter(p => p.classification === '1099_contractor');
    for (const profile of contractors) {
      await runGuardrailChecks(profile);
    }
    await refetch();
    setScanning(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'violation': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'violation': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/workforce" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-500">Compliance Guardrails</h1>
          <p className="text-gray-500 text-sm">
            Auto-detect when 1099 contractors are being treated like employees
          </p>
        </div>
        <button
          onClick={handleScanAll}
          disabled={scanning}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Run Full Scan'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center border-2 border-red-100">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-red-600">{violationCount}</p>
          <p className="text-sm text-gray-500">Violations</p>
        </div>
        <div className="card text-center border-2 border-yellow-100">
          <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
          <p className="text-sm text-gray-500">Warnings</p>
        </div>
        <div className="card text-center border-2 border-blue-100">
          <Info className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
          <p className="text-sm text-gray-500">Info</p>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-navy-gradient rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <Shield className="w-8 h-8 text-gold-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg">How Guardrails Work</h3>
            <p className="text-white/80 text-sm mt-1">
              ToolTime Shield continuously monitors how you interact with 1099 contractors. If any behavior
              pattern suggests the worker is being treated like an employee (fixed schedules, overtime tracking,
              40+ weekly hours), it flags a guardrail alert. Resolving these proactively protects you from
              misclassification claims.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-medium text-red-300">Violations</p>
                <p className="text-white/70 mt-1">Missing required documents (W-9, contract) or expired insurance. Fix immediately.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-medium text-yellow-300">Warnings</p>
                <p className="text-white/70 mt-1">Behavioral patterns that suggest employee treatment. Review and adjust.</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="font-medium text-blue-300">Info</p>
                <p className="text-white/70 mt-1">Maintenance items like classification reviews. Address when convenient.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <button
          onClick={() => setFilterSeverity('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterSeverity === 'all' ? 'bg-navy-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({guardrails.length})
        </button>
        <button
          onClick={() => setFilterSeverity('violation')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterSeverity === 'violation' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Violations ({violationCount})
        </button>
        <button
          onClick={() => setFilterSeverity('warning')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterSeverity === 'warning' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Warnings ({warningCount})
        </button>
        <button
          onClick={() => setFilterSeverity('info')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterSeverity === 'info' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Info ({infoCount})
        </button>
      </div>

      {/* Guardrail List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading guardrails...</div>
      ) : filteredGuardrails.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {guardrails.length === 0 ? 'All Clear' : 'No Matching Guardrails'}
          </h3>
          <p className="text-gray-500 text-sm">
            {guardrails.length === 0
              ? 'No compliance issues detected. Run a full scan to check all contractors.'
              : 'Try a different filter to see other guardrail alerts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGuardrails.map(guardrail => (
            <div
              key={guardrail.id}
              className={`rounded-xl border-2 p-5 ${getSeverityStyle(guardrail.severity)}`}
            >
              <div className="flex items-start gap-4">
                {getSeverityIcon(guardrail.severity)}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900">{guardrail.rule_name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                      guardrail.severity === 'violation' ? 'bg-red-100 text-red-700' :
                      guardrail.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {guardrail.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Worker:</span> {guardrail.worker_name}
                  </p>
                  <p className="text-sm text-gray-600">{guardrail.description}</p>
                  <div className="mt-3 bg-white/60 rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-700">Recommendation:</p>
                    <p className="text-sm text-gray-600">{guardrail.recommendation}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Detected {new Date(guardrail.detected_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setResolveId(guardrail.id)}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy-500">Resolve Guardrail</h3>
              <button onClick={() => { setResolveId(null); setResolveNotes(''); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Describe the action taken to resolve this compliance issue. This creates an audit trail.
            </p>
            <textarea
              value={resolveNotes}
              onChange={e => setResolveNotes(e.target.value)}
              placeholder="e.g. W-9 collected and filed on 3/15/2026. Copy stored in HR folder."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 h-24 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setResolveId(null); setResolveNotes(''); }}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveNotes.trim() || resolving}
                className="btn-primary disabled:opacity-50"
              >
                {resolving ? 'Resolving...' : 'Mark Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
