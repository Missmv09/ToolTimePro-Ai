'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  CreditCard,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Trash2,
} from 'lucide-react'

interface PaymentPlan {
  id: string
  invoice_id: string
  customer_id: string
  total_amount: number
  number_of_installments: number
  frequency: string
  status: string
  notes: string | null
  created_at: string
  invoice?: { invoice_number: string } | null
  customer?: { name: string } | null
  installments?: Installment[]
}

interface Installment {
  id: string
  installment_number: number
  amount: number
  due_date: string
  status: string
  paid_at: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  total: number
  status: string
  customer_id: string
  customer: { id: string; name: string } | null
}

export default function PaymentPlansPage() {
  const { dbUser } = useAuth()
  const companyId = dbUser?.company_id || null
  const [plans, setPlans] = useState<PaymentPlan[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null)

  // Form state
  const [formInvoiceId, setFormInvoiceId] = useState('')
  const [formInstallments, setFormInstallments] = useState(2)
  const [formFrequency, setFormFrequency] = useState('monthly')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPlans = useCallback(async (compId: string) => {
    const { data } = await supabase
      .from('payment_plans')
      .select(`
        *,
        invoice:invoices(invoice_number),
        customer:customers(name)
      `)
      .eq('company_id', compId)
      .order('created_at', { ascending: false })

    if (data) {
      // Fetch installments for each plan
      const planIds = data.map((p: PaymentPlan) => p.id)
      const { data: installments } = await supabase
        .from('payment_plan_installments')
        .select('*')
        .in('payment_plan_id', planIds.length > 0 ? planIds : ['__none__'])
        .order('installment_number')

      const installmentMap = new Map<string, Installment[]>()
      for (const inst of installments || []) {
        const list = installmentMap.get(inst.payment_plan_id) || []
        list.push(inst)
        installmentMap.set(inst.payment_plan_id, list)
      }

      setPlans(data.map((p: PaymentPlan) => ({ ...p, installments: installmentMap.get(p.id) || [] })))
    }

    // Fetch unpaid invoices for creating new plans
    const { data: invData } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, status, customer_id, customer:customers(id, name)')
      .eq('company_id', compId)
      .in('status', ['sent', 'overdue'])
      .order('created_at', { ascending: false })

    setInvoices((invData || []) as unknown as Invoice[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (companyId) fetchPlans(companyId)
  }, [companyId, fetchPlans])

  const handleCreate = async () => {
    if (!companyId || !formInvoiceId) return
    setSaving(true)

    const invoice = invoices.find(i => i.id === formInvoiceId)
    if (!invoice) { setSaving(false); return }

    const installmentAmount = Math.round((invoice.total / formInstallments) * 100) / 100
    const startDate = new Date()

    // Create the plan
    const { data: plan, error } = await supabase
      .from('payment_plans')
      .insert({
        company_id: companyId,
        invoice_id: formInvoiceId,
        customer_id: invoice.customer_id,
        total_amount: invoice.total,
        number_of_installments: formInstallments,
        frequency: formFrequency,
        status: 'active',
        notes: formNotes || null,
      })
      .select()
      .single()

    if (error || !plan) { setSaving(false); return }

    // Create installments
    const installments = []
    for (let i = 0; i < formInstallments; i++) {
      const dueDate = new Date(startDate)
      if (formFrequency === 'weekly') dueDate.setDate(dueDate.getDate() + (i * 7))
      else if (formFrequency === 'biweekly') dueDate.setDate(dueDate.getDate() + (i * 14))
      else dueDate.setMonth(dueDate.getMonth() + i)

      // Last installment gets the remainder to handle rounding
      const amount = i === formInstallments - 1
        ? Math.round((invoice.total - installmentAmount * (formInstallments - 1)) * 100) / 100
        : installmentAmount

      installments.push({
        payment_plan_id: plan.id,
        installment_number: i + 1,
        amount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pending',
      })
    }

    await supabase.from('payment_plan_installments').insert(installments)

    setShowModal(false)
    setFormInvoiceId('')
    setFormInstallments(2)
    setFormFrequency('monthly')
    setFormNotes('')
    setSaving(false)
    fetchPlans(companyId)
  }

  const handleMarkPaid = async (installmentId: string, planId: string) => {
    await supabase
      .from('payment_plan_installments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', installmentId)

    // Check if all installments are paid
    const plan = plans.find(p => p.id === planId)
    if (plan?.installments) {
      const allPaid = plan.installments.every(i => i.id === installmentId || i.status === 'paid')
      if (allPaid) {
        await supabase.from('payment_plans').update({ status: 'completed' }).eq('id', planId)
      }
    }

    if (companyId) fetchPlans(companyId)
  }

  const handleCancel = async (planId: string) => {
    if (!confirm('Cancel this payment plan? Remaining installments will be marked as cancelled.')) return
    await supabase.from('payment_plans').update({ status: 'cancelled' }).eq('id', planId)
    await supabase
      .from('payment_plan_installments')
      .update({ status: 'waived' })
      .eq('payment_plan_id', planId)
      .eq('status', 'pending')
    if (companyId) fetchPlans(companyId)
  }

  const activePlans = plans.filter(p => p.status === 'active')
  const completedPlans = plans.filter(p => p.status === 'completed')
  const overdueInstallments = plans
    .flatMap(p => (p.installments || []).filter(i =>
      i.status === 'pending' && new Date(i.due_date) < new Date()
    ))

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-gray-100 text-gray-500',
      defaulted: 'bg-red-100 text-red-700',
      pending: 'bg-amber-100 text-amber-700',
      paid: 'bg-green-100 text-green-700',
      overdue: 'bg-red-100 text-red-700',
      waived: 'bg-gray-100 text-gray-500',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
        {status}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy-500 flex items-center gap-2">
              <CreditCard className="w-7 h-7 text-gold-500" />
              Payment Plans
            </h1>
            <p className="text-gray-500 mt-1">Offer installment payments for large invoices</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 w-fit">
            <Plus size={18} />
            Create Payment Plan
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="stat-value text-blue-600">{activePlans.length}</p>
                <p className="stat-label">Active Plans</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="stat-value text-green-600">{completedPlans.length}</p>
                <p className="stat-label">Completed</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="stat-value text-red-600">{overdueInstallments.length}</p>
                <p className="stat-label">Overdue</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="stat-value text-amber-600">
                  ${activePlans.reduce((s, p) => s + p.total_amount, 0).toLocaleString()}
                </p>
                <p className="stat-label">Outstanding</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : plans.length === 0 ? (
            <div className="card text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">No payment plans yet</h3>
              <p className="text-gray-400 mt-1">Create a payment plan to let customers pay in installments</p>
            </div>
          ) : (
            plans.map(plan => (
              <div key={plan.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-navy-500">
                        Invoice #{Array.isArray(plan.invoice) ? plan.invoice[0]?.invoice_number : plan.invoice?.invoice_number || '—'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {Array.isArray(plan.customer) ? plan.customer[0]?.name : plan.customer?.name || 'Unknown'} — {plan.number_of_installments} {plan.frequency} installments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-navy-500">${plan.total_amount.toLocaleString()}</span>
                    {statusBadge(plan.status)}
                    {plan.status === 'active' && (
                      <button onClick={() => handleCancel(plan.id)} className="btn-ghost text-red-500 p-1">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Installments */}
                {selectedPlan?.id === plan.id ? (
                  <div className="space-y-2 mt-4 border-t pt-4">
                    {(plan.installments || []).map(inst => {
                      const isOverdue = inst.status === 'pending' && new Date(inst.due_date) < new Date()
                      return (
                        <div key={inst.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            {inst.status === 'paid' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : isOverdue ? (
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                            <div>
                              <p className="text-sm font-medium">Installment {inst.installment_number}</p>
                              <p className="text-xs text-gray-500">Due {new Date(inst.due_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">${inst.amount.toFixed(2)}</span>
                            {inst.status === 'paid' ? (
                              statusBadge('paid')
                            ) : isOverdue ? (
                              statusBadge('overdue')
                            ) : (
                              statusBadge('pending')
                            )}
                            {(inst.status === 'pending' || isOverdue) && plan.status === 'active' && (
                              <button
                                onClick={() => handleMarkPaid(inst.id, plan.id)}
                                className="btn-secondary text-xs px-2 py-1"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <button onClick={() => setSelectedPlan(null)} className="text-sm text-gray-500 hover:text-gray-700 mt-2">
                      Hide details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                  >
                    View installments <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Create Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-bold text-navy-500 mb-4">Create Payment Plan</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                  <select value={formInvoiceId} onChange={e => setFormInvoiceId(e.target.value)} className="input w-full">
                    <option value="">Select an unpaid invoice...</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        #{inv.invoice_number} — {Array.isArray(inv.customer) ? inv.customer[0]?.name : inv.customer?.name || 'Unknown'} — ${inv.total.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Installments</label>
                    <select value={formInstallments} onChange={e => setFormInstallments(Number(e.target.value))} className="input w-full">
                      {[2, 3, 4, 6, 12].map(n => <option key={n} value={n}>{n} payments</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select value={formFrequency} onChange={e => setFormFrequency(e.target.value)} className="input w-full">
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>

                {formInvoiceId && (
                  <div className="bg-blue-50 rounded-lg p-4 text-sm">
                    <p className="font-medium text-blue-800">Payment Preview</p>
                    <p className="text-blue-600 mt-1">
                      {formInstallments} payments of ${((invoices.find(i => i.id === formInvoiceId)?.total || 0) / formInstallments).toFixed(2)} ({formFrequency})
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className="input w-full"
                    rows={2}
                    placeholder="e.g., Customer requested 3-month plan"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button onClick={handleCreate} disabled={!formInvoiceId || saving} className="btn-primary disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
