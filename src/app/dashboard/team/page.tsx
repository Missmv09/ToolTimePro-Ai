'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Phone,
  Mail,
  DollarSign,
  Briefcase,
  Plus,
  X,
  AlertTriangle,
  Accessibility,
  Heart,
  Palmtree,
  ThermometerSun,
  FileText,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  User
} from 'lucide-react'

// Note types with colors matching the navy/gold design system
const NOTE_TYPES = [
  {
    value: 'injury',
    label: 'Injury',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200',
    badgeColor: 'bg-red-500'
  },
  {
    value: 'ada',
    label: 'ADA Accommodation',
    icon: Accessibility,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    badgeColor: 'bg-purple-500'
  },
  {
    value: 'fmla',
    label: 'FMLA',
    icon: Heart,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    badgeColor: 'bg-orange-500'
  },
  {
    value: 'vacation',
    label: 'Vacation',
    icon: Palmtree,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    badgeColor: 'bg-blue-500'
  },
  {
    value: 'sick',
    label: 'Sick Leave',
    icon: ThermometerSun,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    badgeColor: 'bg-yellow-500'
  },
] as const

type NoteType = typeof NOTE_TYPES[number]['value']

interface WorkerNote {
  id: string
  company_id: string
  worker_id: string
  created_by: string | null
  note_type: NoteType
  title: string
  content: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  is_confidential: boolean
  created_at: string
  updated_at: string
  creator?: { full_name: string } | null
}

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
  worker_notes?: WorkerNote[]
}

type UserRole = 'owner' | 'admin' | 'worker'

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'owner', label: 'Owner', color: 'bg-navy-100 text-navy-700' },
  { value: 'admin', label: 'Admin', color: 'bg-gold-100 text-gold-700' },
  { value: 'worker', label: 'Field Worker', color: 'bg-green-100 text-green-700' },
]

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [workerNotes, setWorkerNotes] = useState<WorkerNote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [selectedWorkerForNote, setSelectedWorkerForNote] = useState<TeamMember | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())

  const router = useRouter()
  const { user, dbUser, isLoading: authLoading } = useAuth()

  const companyId = dbUser?.company_id || null
  const userRole = dbUser?.role || 'worker'
  const canManageNotes = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/auth/login')
      return
    }

    if (companyId) {
      fetchTeamMembers(companyId)
      fetchWorkerNotes(companyId)
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

  const fetchWorkerNotes = async (companyId: string) => {
    const { data, error } = await supabase
      .from('worker_notes')
      .select(`
        *,
        creator:users!worker_notes_created_by_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching worker notes:', error)
    } else {
      setWorkerNotes(data || [])
    }
  }

  const getNotesForWorker = (workerId: string) => {
    return workerNotes.filter(note => note.worker_id === workerId)
  }

  const getActiveNotesForWorker = (workerId: string) => {
    return workerNotes.filter(note => note.worker_id === workerId && note.is_active)
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

  const toggleExpanded = (memberId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memberId)) {
        newSet.delete(memberId)
      } else {
        newSet.add(memberId)
      }
      return newSet
    })
  }

  const getRoleInfo = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-700' }
  }

  const getNoteTypeInfo = (type: NoteType) => {
    return NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0]
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-500">Team Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your team members and HR notes</p>
        </div>
        <button
          onClick={() => {
            setEditingMember(null)
            setShowMemberModal(true)
          }}
          className="bg-navy-500 text-white px-4 py-2 rounded-lg hover:bg-navy-600 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Add Team Member
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-card">
          <p className="text-sm text-gray-500">Total Team Members</p>
          <p className="text-2xl font-bold text-navy-500">{teamMembers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-card">
          <p className="text-sm text-gray-500">Active Members</p>
          <p className="text-2xl font-bold text-green-600">{activeMembers.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-card">
          <p className="text-sm text-gray-500">Field Workers</p>
          <p className="text-2xl font-bold text-navy-500">
            {teamMembers.filter(m => m.role === 'worker').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-card">
          <p className="text-sm text-gray-500">Avg Hourly Rate</p>
          <p className="text-2xl font-bold text-gold-500">${avgHourlyRate.toFixed(2)}</p>
        </div>
      </div>

      {/* Team Members Cards */}
      {filteredMembers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-card">
          <User size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No team members found. Add your first team member to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const roleInfo = getRoleInfo(member.role)
            const activeNotes = getActiveNotesForWorker(member.id)
            const allNotes = getNotesForWorker(member.id)
            const isExpanded = expandedMembers.has(member.id)

            return (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-200 shadow-card hover:shadow-card-hover transition-shadow"
              >
                {/* Main Card Content */}
                <div className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Avatar and Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-navy-500">
                          {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-navy-500">{member.full_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                          {!member.is_active && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                          <a href={`mailto:${member.email}`} className="flex items-center gap-1 hover:text-navy-500">
                            <Mail size={14} />
                            {member.email}
                          </a>
                          {member.phone && (
                            <a href={`tel:${member.phone}`} className="flex items-center gap-1 hover:text-navy-500">
                              <Phone size={14} />
                              {member.phone}
                            </a>
                          )}
                          {member.hourly_rate && (
                            <span className="flex items-center gap-1">
                              <DollarSign size={14} />
                              {member.hourly_rate.toFixed(2)}/hr
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Briefcase size={14} />
                            {member.job_assignments?.length || 0} jobs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Active Notes Badges & Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Active Note Type Badges */}
                      {activeNotes.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {[...new Set(activeNotes.map(n => n.note_type))].map(type => {
                            const typeInfo = getNoteTypeInfo(type)
                            const Icon = typeInfo.icon
                            return (
                              <span
                                key={type}
                                className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${typeInfo.color}`}
                                title={typeInfo.label}
                              >
                                <Icon size={12} />
                                {typeInfo.label}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {canManageNotes && (
                          <button
                            onClick={() => {
                              setSelectedWorkerForNote(member)
                              setShowNoteModal(true)
                            }}
                            className="px-3 py-1.5 text-sm border border-gold-500 text-gold-600 rounded-lg hover:bg-gold-50 flex items-center gap-1 transition-colors"
                          >
                            <FileText size={14} />
                            Add Note
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingMember(member)
                            setShowMemberModal(true)
                          }}
                          className="px-3 py-1.5 text-sm border border-navy-500 text-navy-500 rounded-lg hover:bg-navy-50 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => toggleMemberStatus(member)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            member.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notes Preview / Expand Button */}
                  {allNotes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => toggleExpanded(member.id)}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-navy-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isExpanded ? 'Hide' : 'Show'} {allNotes.length} HR Note{allNotes.length !== 1 ? 's' : ''}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Notes Section */}
                {isExpanded && allNotes.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">HR Notes & Records</h4>
                    <div className="space-y-3">
                      {allNotes.map(note => {
                        const typeInfo = getNoteTypeInfo(note.note_type)
                        const Icon = typeInfo.icon
                        return (
                          <div
                            key={note.id}
                            className={`bg-white p-4 rounded-lg border ${note.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                                  <Icon size={16} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h5 className="font-medium text-navy-500">{note.title}</h5>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                                      {typeInfo.label}
                                    </span>
                                    {!note.is_active && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                        Inactive
                                      </span>
                                    )}
                                    {note.is_confidential && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                                        Confidential
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{note.content}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                    {(note.start_date || note.end_date) && (
                                      <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {note.start_date && formatDate(note.start_date)}
                                        {note.start_date && note.end_date && ' - '}
                                        {note.end_date && formatDate(note.end_date)}
                                      </span>
                                    )}
                                    <span>
                                      Created {formatDate(note.created_at)}
                                      {note.creator && ` by ${note.creator.full_name}`}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Team Member Modal */}
      {showMemberModal && (
        <TeamMemberModal
          member={editingMember}
          companyId={companyId!}
          onClose={() => setShowMemberModal(false)}
          onSave={() => {
            setShowMemberModal(false)
            if (companyId) fetchTeamMembers(companyId)
          }}
        />
      )}

      {/* Add Note Modal */}
      {showNoteModal && selectedWorkerForNote && (
        <AddNoteModal
          worker={selectedWorkerForNote}
          companyId={companyId!}
          createdBy={dbUser?.id || null}
          onClose={() => {
            setShowNoteModal(false)
            setSelectedWorkerForNote(null)
          }}
          onSave={() => {
            setShowNoteModal(false)
            setSelectedWorkerForNote(null)
            if (companyId) fetchWorkerNotes(companyId)
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

// Team Member Modal Component
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
      // Update existing member
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
      // Create new team member
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: 'TempPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: formData.full_name,
        },
      })

      const newUserData = {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        is_active: formData.is_active,
        notes: formData.notes || null,
        company_id: companyId,
      }

      if (authError) {
        console.error('Admin create failed, trying signup:', authError)
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            ...newUserData,
            id: crypto.randomUUID(),
          })

        if (insertError) {
          console.error('Error creating team member:', insertError)
          alert('Unable to create team member. They may need to sign up first at /worker/login')
          setSaving(false)
          return
        }
      } else if (authData.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            ...newUserData,
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
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-dropdown">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-navy-500">
            {member ? 'Edit Team Member' : 'Add New Team Member'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent ${errors.full_name ? 'border-red-500' : 'border-gray-200'}`}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent ${errors.email ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="john@company.com"
                disabled={!!member}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent ${errors.phone ? 'border-red-500' : 'border-gray-200'}`}
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
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
              className="w-4 h-4 text-navy-500 border-gray-300 rounded focus:ring-navy-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Active (can be assigned to jobs)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              General Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              rows={3}
              placeholder="General notes about this team member..."
            />
          </div>

          {!member && (
            <div className="bg-gold-50 border border-gold-200 rounded-lg p-3">
              <p className="text-sm text-gold-800">
                <strong>Note:</strong> New team members will receive a temporary password and should reset it on first login.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-navy-500 text-white rounded-lg hover:bg-navy-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : member ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Add Note Modal Component
function AddNoteModal({ worker, companyId, createdBy, onClose, onSave }: {
  worker: TeamMember
  companyId: string
  createdBy: string | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    note_type: 'injury' as NoteType,
    title: '',
    content: '',
    start_date: '',
    end_date: '',
    is_active: true,
    is_confidential: false,
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: { title?: string; content?: string } = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    setErrors({})

    const noteData = {
      company_id: companyId,
      worker_id: worker.id,
      created_by: createdBy,
      note_type: formData.note_type,
      title: formData.title.trim(),
      content: formData.content.trim(),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      is_active: formData.is_active,
      is_confidential: formData.is_confidential,
    }

    const { error } = await supabase
      .from('worker_notes')
      .insert(noteData)

    if (error) {
      console.error('Error creating note:', error)
      alert(`Error creating note: ${error.message}`)
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
  }

  const selectedTypeInfo = NOTE_TYPES.find(t => t.value === formData.note_type) || NOTE_TYPES[0]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto shadow-dropdown">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-navy-500">Add HR Note</h2>
            <p className="text-sm text-gray-500 mt-1">for {worker.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Note Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Note Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NOTE_TYPES.map(type => {
                const Icon = type.icon
                const isSelected = formData.note_type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, note_type: type.value })}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? `${type.color} border-current`
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent ${errors.title ? 'border-red-500' : 'border-gray-200'}`}
              placeholder={`e.g., ${selectedTypeInfo.label} - ${new Date().toLocaleDateString()}`}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Details *</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent ${errors.content ? 'border-red-500' : 'border-gray-200'}`}
              rows={4}
              placeholder="Describe the details of this note..."
            />
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-navy-500 border-gray-300 rounded focus:ring-navy-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Active (shown on worker card)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_confidential"
                checked={formData.is_confidential}
                onChange={(e) => setFormData({ ...formData, is_confidential: e.target.checked })}
                className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="is_confidential" className="text-sm text-gray-700">
                Confidential (restricted visibility)
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
