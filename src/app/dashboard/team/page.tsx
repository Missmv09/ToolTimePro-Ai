'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Phone, Mail, DollarSign, Briefcase, AlertCircle, FileText } from 'lucide-react'

interface TeamMember {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: string
  hourly_rate: number | null
  is_active: boolean
  avatar_url: string | null
  notes: string | null
  created_at: string
  job_assignments?: { job_id: string }[]
}

// HR status tags that can appear in notes
const HR_TAGS = [
  { label: 'Injured', color: 'bg-red-100 text-red-700' },
  { label: 'ADA', color: 'bg-purple-100 text-purple-700' },
  { label: 'FMLA', color: 'bg-orange-100 text-orange-700' },
  { label: 'Vacation', color: 'bg-blue-100 text-blue-700' },
  { label: 'Sick', color: 'bg-yellow-100 text-yellow-700' },
]

type UserRole = 'owner' | 'admin' | 'worker'

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  { value: 'worker', label: 'Field Worker', color: 'bg-green-100 text-green-700' },
]

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  const router = useRouter()
  const { user, dbUser, isLoading: authLoading } = useAuth()

  const companyId = dbUser?.company_id || null

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    if (companyId) {
      fetchTeamMembers(companyId)
    } else {
      setLoading(false)
    }
  }, [authLoading, user, companyId, router])

  const fetchTeamMembers = async (companyId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        job_assignments:job_assignments(job_id)
      `)
      .eq('company_id', companyId)
      .order('full_name')

    if (error) {
      console.error('Error fetching team members:', error)
    } else {
      setTeamMembers(data || [])
    }
    setLoading(false)
  }

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.includes(searchTerm)

    const matchesRole = filterRole === 'all' || member.role === filterRole

    return matchesSearch && matchesRole
  })

  const activeMembers = teamMembers.filter(m => m.is_active)
  const totalHourlyRate = teamMembers.reduce((sum, m) => sum + (m.hourly_rate || 0), 0)
  const avgHourlyRate = teamMembers.length > 0 ? totalHourlyRate / teamMembers.length : 0

  const toggleMemberStatus = async (member: TeamMember) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !member.is_active })
      .eq('id', member.id)

    if (error) {
      console.error('Error updating status:', error)
      alert(`Error updating status: ${error.message}`)
    } else if (companyId) {
      fetchTeamMembers(companyId)
    }
  }

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-700' }
  }

  // Detect HR tags in notes
  const getHRTags = (notes: string | null) => {
    if (!notes) return []
    const foundTags: typeof HR_TAGS = []
    const notesLower = notes.toLowerCase()
    HR_TAGS.forEach(tag => {
      if (notesLower.includes(tag.label.toLowerCase())) {
        foundTags.push(tag)
      }
    })
    return foundTags
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <button
          onClick={() => {
            setEditingMember(null)
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Team Member
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Total Team Members</p>
          <p className="text-2xl font-bold">{teamMembers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Active Members</p>
          <p className="text-2xl font-bold text-green-600">{activeMembers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Field Workers</p>
          <p className="text-2xl font-bold">
            {teamMembers.filter(m => m.role === 'worker').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">Avg Hourly Rate</p>
          <p className="text-2xl font-bold">${avgHourlyRate.toFixed(2)}</p>
        </div>
      </div>

      {/* Team Members List */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-gray-500">No team members found. Add your first team member to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Member
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hourly Rate
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jobs
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes / HR Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => {
                const roleInfo = getRoleInfo(member.role)
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.full_name}</p>
                          <p className="text-sm text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} />
                            <a href={`tel:${member.phone}`} className="hover:text-blue-600">
                              {member.phone}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} />
                          <a href={`mailto:${member.email}`} className="hover:text-blue-600">
                            {member.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {member.hourly_rate ? (
                        <div className="flex items-center gap-1 text-gray-900">
                          <DollarSign size={14} />
                          {member.hourly_rate.toFixed(2)}/hr
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Briefcase size={14} />
                        {member.job_assignments?.length || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {(() => {
                          const hrTags = getHRTags(member.notes)
                          return (
                            <>
                              {hrTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                  {hrTags.map(tag => (
                                    <span key={tag.label} className={`px-2 py-0.5 rounded-full text-xs font-medium ${tag.color}`}>
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {member.notes ? (
                                <p className="text-sm text-gray-600 truncate" title={member.notes}>
                                  {member.notes.length > 40 ? member.notes.slice(0, 40) + '...' : member.notes}
                                </p>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleMemberStatus(member)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingMember(member)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <TeamMemberModal
          member={editingMember}
          companyId={companyId!}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false)
            if (companyId) fetchTeamMembers(companyId)
          }}
        />
      )}
    </div>
  )
}

// Validation helpers
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

const isValidEmail = (email: string): boolean => {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const isValidPhone = (phone: string): boolean => {
  if (!phone) return true
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10
}

function TeamMemberModal({ member, companyId, onClose, onSave }: {
  member: TeamMember | null
  companyId: string
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    full_name: member?.full_name || '',
    email: member?.email || '',
    phone: member?.phone || '',
    role: member?.role || 'worker',
    hourly_rate: member?.hourly_rate?.toString() || '',
    is_active: member?.is_active ?? true,
    notes: member?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; phone?: string; full_name?: string }>({})

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    setFormData({ ...formData, phone: formatted })
    if (formatted && !isValidPhone(formatted)) {
      setErrors({ ...errors, phone: 'Please enter a valid 10-digit phone number' })
    } else {
      setErrors({ ...errors, phone: undefined })
    }
  }

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value })
    if (!isValidEmail(value)) {
      setErrors({ ...errors, email: 'Please enter a valid email address' })
    } else {
      setErrors({ ...errors, email: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { email?: string; phone?: string; full_name?: string } = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required'
    }
    if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    setErrors({})

    if (member) {
      // Update existing member - only update editable fields
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone || null,
        role: formData.role,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        is_active: formData.is_active,
        notes: formData.notes || null,
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', member.id)

      if (error) {
        console.error('Error updating team member:', error)
        alert(`Error updating team member: ${error.message}`)
        setSaving(false)
        return
      }
    } else {
      // For new team members, we need to create auth user first
      // This is a simplified version - in production you'd want to send an invite email
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: 'TempPassword123!', // Temporary password - user should reset
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name,
        },
      })

      if (authError) {
        // If admin API fails, try regular signup (will require email confirmation)
        console.error('Admin create failed, trying signup:', authError)

        // Fallback: Just create the user record if they already exist in auth
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            ...data,
            id: crypto.randomUUID(), // This won't work without auth user
          })

        if (insertError) {
          console.error('Error creating team member:', insertError)
          alert('Unable to create team member. They may need to sign up first at /worker/login')
          setSaving(false)
          return
        }
      } else if (authData.user) {
        // Create user profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            ...data,
            id: authData.user.id,
          })

        if (insertError) {
          console.error('Error creating user profile:', insertError)
          setSaving(false)
          return
        }
      }
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {member ? 'Edit Team Member' : 'Add New Team Member'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.full_name ? 'border-red-500' : ''}`}
              placeholder="John Smith"
            />
            {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="john@company.com"
                disabled={!!member} // Can't change email for existing users
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="(555) 123-4567"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="25.00"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (can be assigned to jobs)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes / HR Status
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add notes about injuries, ADA accommodations, FMLA, vacation, sick time, etc."
            />
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-xs text-gray-500">Quick tags:</span>
              {HR_TAGS.map(tag => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => {
                    const currentNotes = formData.notes
                    if (!currentNotes.toLowerCase().includes(tag.label.toLowerCase())) {
                      setFormData({
                        ...formData,
                        notes: currentNotes ? `${currentNotes}\n${tag.label}: ` : `${tag.label}: `
                      })
                    }
                  }}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${tag.color} hover:opacity-80`}
                >
                  + {tag.label}
                </button>
              ))}
            </div>
          </div>

          {!member && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> New team members will receive a temporary password and should reset it on first login at <code className="bg-yellow-100 px-1 rounded">/worker/login</code>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
