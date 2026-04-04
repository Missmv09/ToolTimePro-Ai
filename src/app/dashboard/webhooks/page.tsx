'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Webhook,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Globe,
} from 'lucide-react'

const WEBHOOK_EVENTS = [
  { value: 'job.created', label: 'Job Created', category: 'Jobs' },
  { value: 'job.completed', label: 'Job Completed', category: 'Jobs' },
  { value: 'job.cancelled', label: 'Job Cancelled', category: 'Jobs' },
  { value: 'invoice.created', label: 'Invoice Created', category: 'Invoicing' },
  { value: 'invoice.sent', label: 'Invoice Sent', category: 'Invoicing' },
  { value: 'invoice.paid', label: 'Invoice Paid', category: 'Invoicing' },
  { value: 'invoice.overdue', label: 'Invoice Overdue', category: 'Invoicing' },
  { value: 'quote.created', label: 'Quote Created', category: 'Quotes' },
  { value: 'quote.accepted', label: 'Quote Accepted', category: 'Quotes' },
  { value: 'quote.rejected', label: 'Quote Rejected', category: 'Quotes' },
  { value: 'customer.created', label: 'Customer Created', category: 'Customers' },
  { value: 'lead.created', label: 'New Lead', category: 'Leads' },
  { value: 'lead.converted', label: 'Lead Converted', category: 'Leads' },
  { value: 'booking.received', label: 'Booking Received', category: 'Bookings' },
  { value: 'review.received', label: 'Review Received', category: 'Reviews' },
  { value: 'worker.clock_in', label: 'Worker Clocked In', category: 'Workforce' },
  { value: 'worker.clock_out', label: 'Worker Clocked Out', category: 'Workforce' },
]

interface WebhookRecord {
  id: string
  url: string
  secret: string | null
  events: string[]
  is_active: boolean
  description: string | null
  last_triggered_at: string | null
  failure_count: number
  created_at: string
}

interface WebhookLog {
  id: string
  event_type: string
  response_status: number | null
  success: boolean
  duration_ms: number | null
  created_at: string
}

export default function WebhooksPage() {
  const { dbUser } = useAuth()
  const companyId = dbUser?.company_id || null
  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([])
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLogs, setShowLogs] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<string | null>(null)

  // Form
  const [formUrl, setFormUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const fetchWebhooks = useCallback(async (compId: string) => {
    const { data } = await supabase
      .from('webhooks')
      .select('*')
      .eq('company_id', compId)
      .order('created_at', { ascending: false })
    setWebhooks((data || []) as WebhookRecord[])
    setLoading(false)
  }, [])

  const fetchLogs = async (webhookId: string) => {
    const { data } = await supabase
      .from('webhook_logs')
      .select('id, event_type, response_status, success, duration_ms, created_at')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(20)
    setLogs((data || []) as WebhookLog[])
    setShowLogs(webhookId)
  }

  useEffect(() => {
    if (companyId) fetchWebhooks(companyId)
  }, [companyId, fetchWebhooks])

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'whsec_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const handleCreate = async () => {
    if (!companyId || !formUrl || formEvents.length === 0) return
    setSaving(true)

    const secret = generateSecret()

    await supabase.from('webhooks').insert({
      company_id: companyId,
      url: formUrl,
      secret,
      events: formEvents,
      description: formDescription || null,
      is_active: true,
    })

    setShowModal(false)
    setFormUrl('')
    setFormDescription('')
    setFormEvents([])
    setSaving(false)
    fetchWebhooks(companyId)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook? This cannot be undone.')) return
    await supabase.from('webhooks').delete().eq('id', id)
    if (companyId) fetchWebhooks(companyId)
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    await supabase.from('webhooks').update({ is_active: !isActive, failure_count: 0 }).eq('id', id)
    if (companyId) fetchWebhooks(companyId)
  }

  const toggleEvent = (event: string) => {
    setFormEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  const groupedEvents = WEBHOOK_EVENTS.reduce((acc, ev) => {
    if (!acc[ev.category]) acc[ev.category] = []
    acc[ev.category].push(ev)
    return acc
  }, {} as Record<string, typeof WEBHOOK_EVENTS>)

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-500 flex items-center gap-2">
              <Globe className="w-7 h-7 text-gold-500" />
              Webhooks
            </h1>
            <p className="text-gray-500 mt-1">
              Send real-time events to Zapier, Make, or your own servers
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 w-fit">
            <Plus size={18} />
            Add Webhook
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <p className="font-medium text-blue-800 mb-1">Zapier / Make Integration</p>
          <p>
            Create a webhook in Zapier (Webhooks by Zapier → Catch Hook) or Make (Custom Webhook), then paste the URL here.
            ToolTime Pro will send JSON payloads with an HMAC-SHA256 signature in the <code className="bg-blue-100 px-1 rounded">X-Webhook-Signature</code> header.
          </p>
        </div>

        {/* Webhooks List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="card text-center py-12">
            <Webhook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No webhooks configured</h3>
            <p className="text-gray-400 mt-1">Add a webhook to start sending events to external services</p>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map(wh => (
              <div key={wh.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${wh.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <h3 className="font-semibold text-navy-500 truncate">
                        {wh.description || wh.url}
                      </h3>
                      {wh.failure_count >= 5 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center gap-1">
                          <AlertTriangle size={12} /> {wh.failure_count} failures
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {wh.events.map(ev => (
                        <span key={ev} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {ev}
                        </span>
                      ))}
                    </div>
                    {wh.secret && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Secret:</span>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {showSecret === wh.id ? wh.secret : '••••••••••••••••'}
                        </code>
                        <button onClick={() => setShowSecret(showSecret === wh.id ? null : wh.id)} className="text-gray-400 hover:text-gray-600">
                          {showSecret === wh.id ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button
                          onClick={() => { navigator.clipboard.writeText(wh.secret || ''); }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => fetchLogs(wh.id)} className="btn-ghost text-sm flex items-center gap-1">
                      <Clock size={14} /> Logs
                    </button>
                    <button onClick={() => handleToggle(wh.id, wh.is_active)} className="btn-ghost text-sm">
                      {wh.is_active ? 'Pause' : 'Resume'}
                    </button>
                    <button onClick={() => handleDelete(wh.id)} className="btn-ghost text-red-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Logs */}
                {showLogs === wh.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Deliveries</h4>
                    {logs.length === 0 ? (
                      <p className="text-sm text-gray-400">No deliveries yet</p>
                    ) : (
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {logs.map(log => (
                          <div key={log.id} className="flex items-center justify-between p-2 rounded bg-gray-50 text-sm">
                            <div className="flex items-center gap-2">
                              {log.success ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                              <span className="font-medium">{log.event_type}</span>
                            </div>
                            <div className="flex items-center gap-3 text-gray-500">
                              <span>{log.response_status || '—'}</span>
                              <span>{log.duration_ms ? `${log.duration_ms}ms` : '—'}</span>
                              <span>{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setShowLogs(null)} className="text-xs text-gray-500 mt-2 hover:text-gray-700">
                      Hide logs
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-navy-500 mb-4">Add Webhook</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    className="input w-full"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Zapier - New leads to CRM"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Events to Subscribe</label>
                  {Object.entries(groupedEvents).map(([category, events]) => (
                    <div key={category} className="mb-3">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {events.map(ev => (
                          <button
                            key={ev.value}
                            onClick={() => toggleEvent(ev.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              formEvents.includes(ev.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {ev.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={!formUrl || formEvents.length === 0 || saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Webhook'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
