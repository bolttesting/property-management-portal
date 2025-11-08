'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DashboardNavigation from '@/components/DashboardNavigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI } from '@/lib/api'
import {
  ShieldCheck,
  ClipboardList,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  User as UserIcon,
  Mail,
  Phone,
  UploadCloud,
  Filter,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react'

type PermitStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'cancelled' | 'completed'
type OwnerStatusUpdate = 'under_review' | 'approved' | 'rejected' | 'completed'

const STATUS_CONFIG: Record<PermitStatus, { label: string; color: string; icon: ElementType }> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-200 text-gray-700',
    icon: Clock,
  },
  submitted: {
    label: 'Submitted',
    color: 'bg-blue-100 text-blue-700',
    icon: ClipboardList,
  },
  under_review: {
    label: 'Under Review',
    color: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-600',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-600',
    icon: XCircle,
  },
  completed: {
    label: 'Completed',
    color: 'bg-indigo-100 text-indigo-700',
    icon: ShieldCheck,
  },
}

const UPDATE_STATUS_OPTIONS: Array<{ value: OwnerStatusUpdate; label: string }> = [
  { value: 'under_review', label: 'Mark as Under Review' },
  { value: 'approved', label: 'Approve Permit' },
  { value: 'rejected', label: 'Reject Permit' },
  { value: 'completed', label: 'Mark as Completed' },
]

const TENANT_DOCUMENT_FIELDS = [
  { key: 'emirates_id_front_url', label: 'Emirates ID (Front)' },
  { key: 'emirates_id_back_url', label: 'Emirates ID (Back)' },
  { key: 'passport_copy_url', label: 'Passport Copy' },
  { key: 'visa_page_url', label: 'Residence Visa Page' },
  { key: 'tenancy_contract_url', label: 'Signed Tenancy Contract / Ejari' },
  { key: 'ejari_certificate_url', label: 'Ejari Certificate (if provided)' },
  { key: 'landlord_noc_url', label: 'Landlord / Property Manager NOC' },
]

const COMPANY_DOCUMENT_FIELDS = [
  { key: 'movers_trade_license_url', label: 'Moving Company Trade Licence' },
  { key: 'movers_noc_url', label: 'Moving Company NOC' },
]

const camelToSnake = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()

const snakeToCamel = (value: string) =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

const getPermitField = (permit: any, key: string) => {
  if (!permit) return undefined
  if (permit[key] !== undefined && permit[key] !== null) {
    return permit[key]
  }
  const snakeKey = camelToSnake(key)
  if (permit[snakeKey] !== undefined) {
    return permit[snakeKey]
  }
  const camelKey = snakeToCamel(key)
  return permit[camelKey]
}

function parseJsonField<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return value as T
}

const normalizePermit = (permit: any) => {
  const normalized = { ...permit }
  normalized.property_address = parseJsonField(permit.property_address, permit.property_address)
  normalized.vehicle_details = parseJsonField(permit.vehicle_details, [])
  normalized.additional_documents = parseJsonField(permit.additional_documents, [])
  normalized.review_notes = permit.review_notes ?? permit.status_reason ?? ''
  return normalized
}

type StatusFormState = {
  status: OwnerStatusUpdate
  reviewNotes: string
}

const INITIAL_STATUS_FORM: StatusFormState = {
  status: 'under_review',
  reviewNotes: '',
}

export default function OwnerMovePermitsPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [permits, setPermits] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | PermitStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'move_in' | 'move_out'>('all')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null)
  const [statusForm, setStatusForm] = useState<StatusFormState>(INITIAL_STATUS_FORM)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'owner') {
      router.push('/auth/login')
      return
    }

    void loadPermits()
  }, [hasHydrated, isAuthenticated, user, router])

  const loadPermits = async () => {
    try {
      setLoading(true)
      const response = await ownerAPI.getMovePermits()
      if (response.data?.data?.permits) {
        const normalized = response.data.data.permits.map(normalizePermit)
        setPermits(normalized)
      }
    } catch (error: any) {
      console.error('Failed to load move permits', error)
      toast.error('Unable to load move permit requests')
    } finally {
      setLoading(false)
    }
  }

  const filteredPermits = useMemo(() => {
    const matchesStatus = (permitStatus: PermitStatus) =>
      statusFilter === 'all' || permitStatus === statusFilter
    const matchesType = (permitType: string) =>
      typeFilter === 'all' || permitType === typeFilter

    return permits.filter(
      (permit) => matchesStatus(permit.status as PermitStatus) && matchesType(permit.permit_type)
    )
  }, [permits, statusFilter, typeFilter])

  const ownerNavItems = useMemo(
    () => [
      { href: '/owner/dashboard', label: 'Dashboard' },
      { href: '/owner/tenants', label: 'Tenants' },
      { href: '/owner/properties', label: 'Properties' },
      { href: '/owner/applications', label: 'Applications' },
      { href: '/owner/maintenance', label: 'Maintenance' },
      { href: '/owner/move-permits', label: 'Move Permits' },
      { href: '/owner/chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
    ],
    []
  )

  const statusOptions = Object.keys(STATUS_CONFIG) as PermitStatus[]

  const renderStatusBadge = (status: PermitStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const openStatusModal = (permit: any) => {
    setSelectedPermit(permit)
    setStatusForm(INITIAL_STATUS_FORM)
    setShowStatusModal(true)
  }

  const handleStatusSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedPermit) return

    try {
      setUpdatingStatus(true)
      await ownerAPI.updateMovePermitStatus(selectedPermit.id, {
        status: statusForm.status,
        reviewNotes: statusForm.reviewNotes || undefined,
      })
      toast.success('Permit status updated')
      setShowStatusModal(false)
      setSelectedPermit(null)
      setStatusForm(INITIAL_STATUS_FORM)
      await loadPermits()
    } catch (error: any) {
      console.error('Failed to update permit status', error)
      toast.error(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          'Unable to update status'
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation userType="owner" navItems={ownerNavItems} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-heading font-bold">Move Permit Requests</h1>
            </div>
            <p className="text-text-secondary">
              Review tenant move-in and move-out permits and coordinate approvals with building management.
            </p>
          </div>
          <Link href="/owner/dashboard" className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="card p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 text-text-secondary">
              <Filter className="h-5 w-5 text-primary" />
              <span className="font-semibold">Filter permits</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PermitStatus | 'all')}
                  className="input-field py-2"
                >
                  <option value="all">All</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">Type</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | 'move_in' | 'move_out')}
                  className="input-field py-2"
                >
                  <option value="all">All</option>
                  <option value="move_in">Move-In</option>
                  <option value="move_out">Move-Out</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filteredPermits.length === 0 ? (
          <div className="card py-16 text-center">
            <ClipboardList className="h-14 w-14 mx-auto mb-4 text-text-tertiary opacity-40" />
            <h3 className="text-xl font-semibold">No permit requests match the current filters</h3>
            <p className="text-text-secondary mt-2">
              Adjust the filters or check back later for new submissions.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredPermits.map((permit) => {
              const statusBadge = renderStatusBadge(permit.status as PermitStatus)
              const propertyAddress = permit.property_address
              const addressLine =
                typeof propertyAddress === 'string'
                  ? propertyAddress
                  : propertyAddress?.community || propertyAddress?.location || propertyAddress?.street || ''
              const additionalDocs = (permit.additional_documents || []) as Array<{ name?: string; url?: string }>
              const vehicleDetails = (permit.vehicle_details || []) as Array<any>

              return (
                <div key={permit.id} className="card p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-semibold">{permit.property_name}</h2>
                        {statusBadge}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Requested Date:{' '}
                            {permit.requested_move_date
                              ? new Date(permit.requested_move_date).toLocaleDateString()
                              : 'TBD'}
                          </span>
                        </div>
                        {permit.time_window_start && (
                          <div>
                            <span className="font-semibold">Time Window:</span>{' '}
                            {permit.time_window_start?.slice(0, 5)} – {permit.time_window_end?.slice(0, 5)}
                          </div>
                        )}
                        <div className="capitalize">
                          <span className="font-semibold">Type:</span> {permit.permit_type.replace('_', ' ')}
                        </div>
                        {addressLine && (
                          <div>
                            <span className="font-semibold">Community:</span> {addressLine}
                          </div>
                        )}
                      </div>

                      {permit.review_notes && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl p-4">
                          <strong className="block mb-1">Latest Notes</strong>
                          {permit.review_notes}
                        </div>
                      )}

                      <div className="border border-border rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <UserIcon className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Tenant</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-secondary">
                          <div>
                            <span className="block font-semibold text-text-primary">Name</span>
                            {permit.tenant_name || '—'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {permit.tenant_email || '—'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {permit.tenant_mobile || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="border border-border rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Moving Company</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-text-secondary">
                          <div>
                            <span className="block font-semibold text-text-primary">Company</span>
                            {permit.movers_company_name || '—'}
                          </div>
                          <div>
                            <span className="block font-semibold text-text-primary">Contact Person</span>
                            {permit.movers_contact_name || '—'}
                          </div>
                          <div>
                            <span className="block font-semibold text-text-primary">Mobile</span>
                            {permit.movers_contact_mobile || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="border border-border rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <UploadCloud className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold">Documents</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {TENANT_DOCUMENT_FIELDS.concat(COMPANY_DOCUMENT_FIELDS).map((field) => {
                            const value = getPermitField(permit, field.key)
                            if (!value) return null
                            return (
                              <a
                                key={field.key}
                                href={value as string}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 text-primary hover:bg-primary/10"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm font-medium truncate">{field.label}</span>
                              </a>
                            )
                          })}
                          {additionalDocs.map((doc, index) => {
                            if (!doc?.url) return null
                            return (
                              <a
                                key={`additional-${permit.id}-${index}`}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 text-primary hover:bg-primary/10"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="text-sm font-medium truncate">
                                  {doc.name || `Additional Document ${index + 1}`}
                                </span>
                              </a>
                            )
                          })}
                          {TENANT_DOCUMENT_FIELDS.concat(COMPANY_DOCUMENT_FIELDS).every(
                            (field) => !getPermitField(permit, field.key)
                          ) && additionalDocs.length === 0 && (
                            <p className="text-text-secondary">No documents uploaded</p>
                          )}
                        </div>
                      </div>

                      {vehicleDetails.length > 0 && (
                        <div className="border border-border rounded-2xl p-4">
                          <h3 className="text-lg font-semibold mb-3">Vehicles Entering Community</h3>
                          <ul className="space-y-2 text-sm text-text-secondary">
                            {vehicleDetails.map((vehicle, index) => (
                              <li key={index} className="bg-gray-50 px-3 py-2 rounded-lg flex flex-col">
                                <span className="font-semibold text-text-primary">
                                  {vehicle.plateNumber || vehicle.plate_number || 'Vehicle'}
                                </span>
                                <span className="text-xs text-text-secondary">
                                  {vehicle.description || vehicle.vehicle_description || 'No description provided'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {permit.special_instructions && (
                        <div className="border border-border rounded-2xl p-4 bg-gray-50">
                          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                            Special Instructions
                          </p>
                          <p className="text-sm text-text-secondary whitespace-pre-line">
                            {permit.special_instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-64 space-y-3">
                      <div className="text-sm text-text-secondary">
                        <p>
                          <span className="font-semibold">Submitted:</span>{' '}
                          {permit.created_at ? new Date(permit.created_at).toLocaleString() : '—'}
                        </p>
                        {permit.reviewed_at && (
                          <p className="mt-1">
                            <span className="font-semibold">Last Reviewed:</span>{' '}
                            {new Date(permit.reviewed_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => openStatusModal(permit)}
                        className="btn-primary w-full"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showStatusModal && selectedPermit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-heading font-semibold">Update Permit Status</h3>
                <p className="text-sm text-text-secondary">
                  {selectedPermit.property_name} • {selectedPermit.permit_type.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm((prev) => ({ ...prev, status: e.target.value as OwnerStatusUpdate }))
                  }
                  className="input-field"
                  required
                >
                  {UPDATE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Notes for Tenant</label>
                <textarea
                  value={statusForm.reviewNotes}
                  onChange={(e) => setStatusForm((prev) => ({ ...prev, reviewNotes: e.target.value }))}
                  className="input-field"
                  rows={4}
                  placeholder="Provide instructions, missing document details, or approval references"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={updatingStatus}
                >
                  {updatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

