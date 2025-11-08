'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DashboardNavigation from '@/components/DashboardNavigation'
import { useAuthStore } from '@/store/authStore'
import { tenantAPI, movePermitAPI, uploadAPI } from '@/lib/api'
import {
  Calendar,
  Car,
  CheckCircle,
  ClipboardList,
  FileText,
  Loader2,
  Plus,
  Send,
  Upload,
  X,
  MessageCircle,
} from 'lucide-react'

type PermitStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'

interface VehicleDetail {
  plateNumber: string
  description: string
}

interface AdditionalDocument {
    name: string
  url: string
}

interface MovePermitFormState {
  propertyId: string
  permitType: 'move_in' | 'move_out'
  requestedMoveDate: string
  timeWindowStart: string
  timeWindowEnd: string
  emiratesIdFrontUrl: string
  emiratesIdBackUrl: string
  passportCopyUrl: string
  visaPageUrl: string
  tenancyContractUrl: string
  ejariCertificateUrl: string
  landlordNocUrl: string
  moversCompanyName: string
  moversTradeLicenseUrl: string
  moversNocUrl: string
  moversContactName: string
  moversContactMobile: string
  vehicleDetails: VehicleDetail[]
  additionalDocuments: AdditionalDocument[]
  specialInstructions: string
}

const REQUIRED_DOCUMENTS: Array<{ key: keyof MovePermitFormState; label: string }> = [
  { key: 'emiratesIdFrontUrl', label: 'Emirates ID (Front)' },
  { key: 'emiratesIdBackUrl', label: 'Emirates ID (Back)' },
  { key: 'passportCopyUrl', label: 'Passport Copy' },
  { key: 'visaPageUrl', label: 'Residence Visa Page' },
  { key: 'tenancyContractUrl', label: 'Signed Tenancy Contract / Ejari' },
  { key: 'landlordNocUrl', label: 'Landlord / Property Management NOC' },
]

const OPTIONAL_DOCUMENTS: Array<{ key: keyof MovePermitFormState; label: string }> = [
  { key: 'ejariCertificateUrl', label: 'Ejari Certificate (if separate)' },
  { key: 'moversTradeLicenseUrl', label: 'Moving Company Trade Licence' },
  { key: 'moversNocUrl', label: 'Moving Company NOC' },
]

const DOCUMENT_FIELD_MAPPINGS: Array<[keyof MovePermitFormState, string]> = [
  ['emiratesIdFrontUrl', 'emirates_id_front_url'],
  ['emiratesIdBackUrl', 'emirates_id_back_url'],
  ['passportCopyUrl', 'passport_copy_url'],
  ['visaPageUrl', 'visa_page_url'],
  ['tenancyContractUrl', 'tenancy_contract_url'],
  ['ejariCertificateUrl', 'ejari_certificate_url'],
  ['landlordNocUrl', 'landlord_noc_url'],
  ['moversTradeLicenseUrl', 'movers_trade_license_url'],
  ['moversNocUrl', 'movers_noc_url'],
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
  const direct = permit[key]
  if (direct !== undefined && direct !== null) {
    return direct
  }
  const snakeKey = camelToSnake(key)
  if (permit[snakeKey] !== undefined) {
    return permit[snakeKey]
  }
  const camelKey = snakeToCamel(key)
  return permit[camelKey]
}

const normalizePermitFromApi = (permit: any) => {
  if (!permit) return permit
  const normalized = { ...permit }

  // Ensure property address is parsed
  const rawAddress = permit.property_address ?? permit.propertyAddress
  if (typeof rawAddress === 'string') {
    try {
      normalized.property_address = JSON.parse(rawAddress)
      normalized.propertyAddress = normalized.property_address
    } catch {
      normalized.property_address = rawAddress
      normalized.propertyAddress = rawAddress
    }
  }

  // Map document fields to camelCase helpers for UI convenience
  DOCUMENT_FIELD_MAPPINGS.forEach(([camelKey, snakeKey]) => {
    const value = permit[camelKey] ?? permit[snakeKey] ?? ''
    normalized[camelKey] = value
    normalized[snakeKey] = value
  })

  // Parse vehicle details JSON
  const vehicleRaw = permit.vehicleDetails ?? permit.vehicle_details ?? []
  let vehicleDetails = vehicleRaw
  if (typeof vehicleRaw === 'string') {
    try {
      vehicleDetails = JSON.parse(vehicleRaw)
    } catch {
      vehicleDetails = []
    }
  }
  if (!Array.isArray(vehicleDetails)) {
    vehicleDetails = []
  }
  normalized.vehicleDetails = vehicleDetails
  normalized.vehicle_details = vehicleDetails

  // Parse additional documents JSON
  const additionalRaw = permit.additionalDocuments ?? permit.additional_documents ?? []
  let additionalDocuments = additionalRaw
  if (typeof additionalRaw === 'string') {
    try {
      additionalDocuments = JSON.parse(additionalRaw)
    } catch {
      additionalDocuments = []
    }
  }
  if (!Array.isArray(additionalDocuments)) {
    additionalDocuments = []
  }
  normalized.additionalDocuments = additionalDocuments
  normalized.additional_documents = additionalDocuments

  // Normalize review notes
  const reviewNotes =
    permit.reviewNotes ?? permit.review_notes ?? permit.status_reason ?? ''
  normalized.reviewNotes = reviewNotes
  normalized.review_notes = reviewNotes

  return normalized
}

const STATUS_BADGES: Record<PermitStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-600',
  completed: 'bg-indigo-100 text-indigo-700',
}

const defaultFormState: MovePermitFormState = {
  propertyId: '',
  permitType: 'move_in',
  requestedMoveDate: '',
  timeWindowStart: '',
  timeWindowEnd: '',
  emiratesIdFrontUrl: '',
  emiratesIdBackUrl: '',
  passportCopyUrl: '',
  visaPageUrl: '',
  tenancyContractUrl: '',
  ejariCertificateUrl: '',
  landlordNocUrl: '',
  moversCompanyName: '',
  moversTradeLicenseUrl: '',
  moversNocUrl: '',
  moversContactName: '',
  moversContactMobile: '',
  vehicleDetails: [{ plateNumber: '', description: '' }],
  additionalDocuments: [],
  specialInstructions: '',
}

export default function TenantMovePermitsPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [permits, setPermits] = useState<any[]>([])
  const [leases, setLeases] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formState, setFormState] = useState<MovePermitFormState>(defaultFormState)
  const [fileUploads, setFileUploads] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null

    if (!token || !storedUser) {
      router.push('/auth/login')
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser.userType !== 'tenant') {
        router.push('/auth/login')
        return
      }
    } catch {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated && user?.userType === 'tenant') {
    loadData()
    }
  }, [hasHydrated, isAuthenticated, user, router])

  const loadData = async () => {
    try {
      setLoading(true)
      const [permitsResponse, leasesResponse] = await Promise.all([
        movePermitAPI.getTenantPermits(),
        tenantAPI.getLeases(),
      ])

      const apiPermits = permitsResponse.data?.data?.permits || []
      const normalizedPermits = apiPermits.map(normalizePermitFromApi)
      setPermits(normalizedPermits)

      const apiLeases = leasesResponse.data?.data?.leases || []
      setLeases(apiLeases)
    } catch (error) {
      console.error('Failed to load move permits:', error)
      toast.error('Failed to load move permit data')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = () => {
    setFormState({ ...defaultFormState, permitType: 'move_in' })
    setFileUploads({})
    if (leases.length === 1) {
      setFormState((prev) => ({ ...prev, propertyId: leases[0].property_id }))
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    if (submitting) return
    setShowForm(false)
    setFormState(defaultFormState)
    setFileUploads({})
  }

  const handleVehicleChange = (index: number, field: keyof VehicleDetail, value: string) => {
    setFormState((prev) => {
      const updated = [...prev.vehicleDetails]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, vehicleDetails: updated }
    })
  }

  const addVehicle = () => {
    setFormState((prev) => ({
      ...prev,
      vehicleDetails: [...prev.vehicleDetails, { plateNumber: '', description: '' }],
    }))
  }

  const removeVehicle = (index: number) => {
    setFormState((prev) => {
      if (prev.vehicleDetails.length === 1) return prev
      const updated = prev.vehicleDetails.filter((_, i) => i !== index)
      return { ...prev, vehicleDetails: updated }
    })
  }

  const handleFileUpload = async (field: keyof MovePermitFormState, file?: File | null) => {
      if (!file) return

    setFileUploads((prev) => ({ ...prev, [field]: true }))
    try {
      const response = await uploadAPI.uploadDocument(file)
      const fileUrl = response.data?.data?.fileUrl
      if (!fileUrl) {
        throw new Error('Upload succeeded but no file URL returned')
      }

      setFormState((prev) => ({
        ...prev,
        [field]: fileUrl,
      }))

      toast.success(`${file.name} uploaded`)
    } catch (error: any) {
      console.error('File upload failed:', error)
      toast.error(error?.response?.data?.message || 'Failed to upload document')
    } finally {
      setFileUploads((prev) => ({ ...prev, [field]: false }))
    }
  }

  const handleAdditionalDocumentUpload = async (file?: File | null) => {
    if (!file) return
    setFileUploads((prev) => ({ ...prev, additionalDocument: true }))

    try {
      const response = await uploadAPI.uploadDocument(file)
      const fileUrl = response.data?.data?.fileUrl
      if (!fileUrl) {
        throw new Error('Upload succeeded but no file URL returned')
      }

      setFormState((prev) => ({
        ...prev,
        additionalDocuments: [
          ...prev.additionalDocuments,
          {
          name: file.name,
            url: fileUrl,
        },
        ],
      }))

      toast.success(`${file.name} added`)
    } catch (error: any) {
      console.error('Additional document upload failed:', error)
      toast.error(error?.response?.data?.message || 'Failed to upload document')
    } finally {
      setFileUploads((prev) => ({ ...prev, additionalDocument: false }))
    }
  }

  const removeAdditionalDocument = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      additionalDocuments: prev.additionalDocuments.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    try {
      if (!formState.propertyId) {
        toast.error('Please select the property this permit relates to')
        return
      }

      if (!formState.requestedMoveDate) {
        toast.error('Please choose a requested move date')
      return
    }

      for (const doc of REQUIRED_DOCUMENTS) {
        if (!formState[doc.key]) {
          toast.error(`Please upload ${doc.label}`)
      return
        }
      }

      if (!formState.moversCompanyName || !formState.moversTradeLicenseUrl || !formState.moversNocUrl) {
        toast.error('Please provide complete moving company details and approvals')
        return
      }

      if (!formState.moversContactName || !formState.moversContactMobile) {
        toast.error('Please provide the moving company supervisor contact details')
      return
    }

      if (formState.vehicleDetails.some((veh) => !veh.plateNumber || !veh.description)) {
        toast.error('Please complete the vehicle plate number and description for all vehicles')
        return
      }

      setSubmitting(true)

      await movePermitAPI.createTenantPermit({
        ...formState,
        vehicleDetails: formState.vehicleDetails,
        additionalDocuments: formState.additionalDocuments,
      })

      toast.success('Move permit submitted for review')
      handleCloseForm()
      loadData()
    } catch (error: any) {
      console.error('Failed to submit move permit:', error)
      const message = error?.response?.data?.message || 'Failed to submit move permit'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelPermit = async (permitId: string) => {
    try {
      await tenantAPI.cancelMovePermit(permitId)
      toast.success('Permit cancelled')
      loadData()
    } catch (error: any) {
      console.error('Failed to cancel permit', error)
      toast.error(error?.response?.data?.message || 'Unable to cancel permit')
    }
  }

  const openPermitDetails = (permit: any) => {
    setSelectedPermit(permit)
    setDetailModalOpen(true)
  }

  const closePermitDetails = () => {
    setSelectedPermit(null)
    setDetailModalOpen(false)
  }

  const tenantNavItems = useMemo(
    () => [
      { href: '/tenant/dashboard', label: 'Dashboard' },
      { href: '/tenant/applications', label: 'Applications' },
      { href: '/tenant/favorites', label: 'Favorites' },
      { href: '/tenant/maintenance', label: 'Maintenance' },
      { href: '/tenant/move-permits', label: 'Move Permits' },
      { href: '/tenant/chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
    ],
    []
  )

  const additionalDocsForModal = (
    selectedPermit?.additionalDocuments ||
    selectedPermit?.additional_documents ||
    []
  ) as Array<{ name?: string; url?: string }>

  const hasPrimaryDocsForModal = REQUIRED_DOCUMENTS.concat(OPTIONAL_DOCUMENTS).some((doc) =>
    Boolean(getPermitField(selectedPermit, doc.key as string))
  )

  if (!hasHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation userType="tenant" navItems={tenantNavItems} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text flex items-center gap-3">
              <ClipboardList className="h-10 w-10 text-primary" />
              Move Permits
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              Apply for move-in or move-out permits and upload all required UAE documentation so your property management team can approve the move.
            </p>
        </div>

          <button
            onClick={handleOpenForm}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <Plus className="h-5 w-5" />
            New Permit Request
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass rounded-2xl p-6 shadow-xl bg-white/80 border border-primary/10">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">Pending Review</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{permits.filter((p) => ['submitted', 'under_review'].includes(p.status)).length}</h3>
              </div>
              <Send className="h-10 w-10 text-primary/70" />
            </div>
          </div>
          <div className="glass rounded-2xl p-6 shadow-xl bg-white/80 border border-emerald/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">Approved</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{permits.filter((p) => p.status === 'approved').length}</h3>
              </div>
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            </div>
          </div>
          <div className="glass rounded-2xl p-6 shadow-xl bg-white/80 border border-indigo/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">Completed / Archived</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{permits.filter((p) => ['completed', 'cancelled', 'rejected'].includes(p.status)).length}</h3>
              </div>
              <Calendar className="h-10 w-10 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Permit List */}
        <div className="glass rounded-2xl shadow-xl bg-white overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Your Permit Requests</h2>
            <button onClick={loadData} className="btn-secondary flex items-center gap-2">
              <Loader2 className="h-4 w-4" /> Refresh
            </button>
          </div>

          {permits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              You have not submitted any move-in or move-out permits yet. Click "New Permit Request" to submit one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-3">Permit</th>
                    <th className="px-6 py-3">Property</th>
                    <th className="px-6 py-3">Move Date</th>
                    <th className="px-6 py-3">Vehicles</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {permits.map((permit) => (
                    <tr key={permit.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {permit.permit_type === 'move_in' ? 'Move-In' : 'Move-Out'} Permit
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <p className="font-medium text-gray-900">{permit.property_name || 'Property'}</p>
                        <p className="text-xs text-gray-500">
                          {typeof permit.property_address === 'string'
                            ? permit.property_address
                            : permit.property_address?.community || permit.property_address?.location || ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {permit.requested_move_date ? new Date(permit.requested_move_date).toLocaleDateString() : 'TBD'}
                        {permit.time_window_start && (
                          <span className="block text-xs text-gray-500 mt-1">
                            {permit.time_window_start?.slice(0, 5)} – {permit.time_window_end?.slice(0, 5)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {permit.vehicle_details?.length || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[permit.status as PermitStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {permit.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openPermitDetails(permit)}
                            className="text-primary hover:underline"
                          >
                            View
                          </button>
                          {['submitted', 'under_review'].includes(permit.status) && (
                            <button
                              onClick={() => handleCancelPermit(permit.id)}
                              className="text-red-500 hover:underline"
                            >
                              Cancel
                            </button>
                          )}
            </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>

      {/* Create Permit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-primary/10 via-white to-transparent">
              <div>
                <h3 className="text-2xl font-heading font-semibold text-gray-900">Move Permit Request</h3>
                <p className="text-sm text-gray-500">Upload all mandatory documents and provide your mover details.</p>
              </div>
              <button onClick={handleCloseForm} className="text-gray-500 hover:text-gray-900" disabled={submitting}>
                <X className="h-6 w-6" />
              </button>
              </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Permit Type</label>
                    <select
                    value={formState.permitType}
                    onChange={(e) => setFormState((prev) => ({ ...prev, permitType: e.target.value as 'move_in' | 'move_out' }))}
                      className="input-field"
                    >
                    <option value="move_in">Move-In</option>
                    <option value="move_out">Move-Out</option>
                    </select>
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Requested Move Date</label>
                  <input
                    type="date"
                    value={formState.requestedMoveDate}
                    onChange={(e) => setFormState((prev) => ({ ...prev, requestedMoveDate: e.target.value }))}
                      className="input-field"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Time Window Start</label>
                    <input
                    type="time"
                    value={formState.timeWindowStart}
                    onChange={(e) => setFormState((prev) => ({ ...prev, timeWindowStart: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Time Window End</label>
                  <input
                    type="time"
                    value={formState.timeWindowEnd}
                    onChange={(e) => setFormState((prev) => ({ ...prev, timeWindowEnd: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Property</label>
                    <select
                    value={formState.propertyId}
                    onChange={(e) => setFormState((prev) => ({ ...prev, propertyId: e.target.value }))}
                      className="input-field"
                    >
                    <option value="">Select property</option>
                    {leases.map((lease) => (
                      <option key={lease.id} value={lease.property_id}>
                        {lease.property_name} – Lease #{lease.lease_number || lease.id.substring(0, 6)}
                        </option>
                      ))}
                    </select>
                  <p className="text-xs text-gray-500 mt-2">
                    Only properties with an active lease can request move permits.
                  </p>
                  </div>
                </div>

                    <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Required Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {REQUIRED_DOCUMENTS.map((doc) => (
                    <div key={doc.key} className="border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">{doc.label}</p>
                      {formState[doc.key] ? (
                        <a
                          href={formState[doc.key] as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View uploaded document
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500 mb-2">Upload PDF / DOC / DOCX (max 10MB)</p>
                      )}
                      <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>{fileUploads[doc.key as string] ? 'Uploading…' : formState[doc.key] ? 'Replace Document' : 'Upload Document'}</span>
                      <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(event) => handleFileUpload(doc.key, event.target.files?.[0])}
                          disabled={fileUploads[doc.key as string]}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>

                    <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Moving Company Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Company Name</label>
                      <input
                        type="text"
                      value={formState.moversCompanyName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, moversCompanyName: e.target.value }))}
                        className="input-field"
                      placeholder="Registered moving company"
                      />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Supervisor Contact Name</label>
                      <input
                        type="text"
                      value={formState.moversContactName}
                      onChange={(e) => setFormState((prev) => ({ ...prev, moversContactName: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Supervisor Mobile</label>
                      <input
                        type="tel"
                      value={formState.moversContactMobile}
                      onChange={(e) => setFormState((prev) => ({ ...prev, moversContactMobile: e.target.value }))}
                        className="input-field"
                      placeholder="9715XXXXXXXX"
                      />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {OPTIONAL_DOCUMENTS.map((doc) => (
                    <div key={doc.key} className="border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">{doc.label}</p>
                      {formState[doc.key] ? (
                        <a
                          href={formState[doc.key] as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View uploaded document
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500 mb-2">Upload PDF / DOC / DOCX (max 10MB)</p>
                      )}
                      <label className="btn-ghost inline-flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        <span>{fileUploads[doc.key as string] ? 'Uploading…' : formState[doc.key] ? 'Replace Document' : 'Upload Document'}</span>
                      <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(event) => handleFileUpload(doc.key, event.target.files?.[0])}
                          disabled={fileUploads[doc.key as string]}
                        />
                      </label>
                    </div>
                  ))}
                  </div>
                </div>

                    <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Vehicles Entering Community</h4>
                <p className="text-xs text-gray-500 mb-3">
                  Provide all truck or van plate numbers entering the building. The security desk will use this list to issue access passes.
                </p>
                <div className="space-y-3">
                  {formState.vehicleDetails.map((vehicle, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Plate Number</label>
                      <input
                        type="text"
                          value={vehicle.plateNumber}
                          onChange={(e) => handleVehicleChange(index, 'plateNumber', e.target.value.toUpperCase())}
                        className="input-field"
                          placeholder="UAE Plate Number"
                      />
                    </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-2">Vehicle Description</label>
                      <input
                        type="text"
                          value={vehicle.description}
                          onChange={(e) => handleVehicleChange(index, 'description', e.target.value)}
                        className="input-field"
                          placeholder="e.g. 3-ton moving truck, van with boxes"
                      />
                    </div>
                      <div className="flex gap-2 md:col-span-3">
                        {formState.vehicleDetails.length > 1 && (
                          <button onClick={() => removeVehicle(index)} className="btn-ghost text-sm">
                            Remove
                          </button>
                        )}
                        {index === formState.vehicleDetails.length - 1 && (
                          <button onClick={addVehicle} className="btn-secondary text-sm">
                            Add Another Vehicle
                          </button>
                        )}
                    </div>
                    </div>
                  ))}
                  </div>
                </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Additional Supporting Documents</h4>
                <div className="space-y-3">
                  {formState.additionalDocuments.length === 0 ? (
                    <p className="text-sm text-gray-500">No additional files added.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {formState.additionalDocuments.map((doc, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                          <span className="truncate max-w-[70%] flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" /> {doc.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              View
                            </a>
                            <button onClick={() => removeAdditionalDocument(index)} className="text-red-500 hover:underline">
                                Remove
                              </button>
                            </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <label className="btn-ghost inline-flex items-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>{fileUploads.additionalDocument ? 'Uploading…' : 'Add Document'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(event) => handleAdditionalDocumentUpload(event.target.files?.[0])}
                      disabled={fileUploads.additionalDocument}
                    />
                  </label>
                  </div>
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Special Instructions</label>
                  <textarea
                  value={formState.specialInstructions}
                  onChange={(e) => setFormState((prev) => ({ ...prev, specialInstructions: e.target.value }))}
                    className="input-field"
                    rows={4}
                  placeholder="Add any notes for building security (e.g., need access to service lift, fragile items, etc.)"
                  />
              </div>
                </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500 max-w-xl">
                Ensure the permit is submitted at least 3 business days before the requested move date. All files must be PDF / DOC / DOCX and under 10MB.
              </p>
              <div className="flex gap-3">
                <button onClick={handleCloseForm} className="btn-ghost" disabled={submitting}>
                  Cancel
                </button>
                <button onClick={handleSubmit} className="btn-primary flex items-center gap-2" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Submit Permit
                </button>
            </div>
          </div>
        </div>
            </div>
      )}

      {/* Permit Details Modal */}
      {detailModalOpen && selectedPermit && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Permit Reference</p>
                <h3 className="text-2xl font-semibold text-gray-900">
                  {selectedPermit.permit_type === 'move_in' ? 'Move-In' : 'Move-Out'} Permit
                          </h3>
                <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[selectedPermit.status as PermitStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {selectedPermit.status.replace('_', ' ')}
                            </span>
                          </div>
              <button onClick={closePermitDetails} className="text-gray-500 hover:text-gray-900">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Requested Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPermit.requested_move_date
                      ? new Date(selectedPermit.requested_move_date).toLocaleDateString()
                      : 'TBD'}
                  </p>
                            </div>
                            <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Time Window</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPermit.time_window_start
                      ? `${selectedPermit.time_window_start?.slice(0, 5)} – ${selectedPermit.time_window_end?.slice(0, 5)}`
                      : 'Not specified'}
                  </p>
                            </div>
                        </div>

              <div className="border border-gray-100 rounded-xl p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Property</p>
                <p className="text-sm font-semibold text-gray-900">{selectedPermit.property_name}</p>
                {selectedPermit.property_address && (
                  <p className="text-xs text-gray-500">
                    {typeof selectedPermit.property_address === 'string'
                      ? selectedPermit.property_address
                      : selectedPermit.property_address?.fullAddress || selectedPermit.property_address?.community || ''}
                          </p>
                        )}
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">Uploaded Documents</h4>
                <ul className="space-y-2 text-sm">
                  {REQUIRED_DOCUMENTS.concat(OPTIONAL_DOCUMENTS).map((doc) => {
                    const value = getPermitField(selectedPermit, doc.key as string)
                    if (!value) return null
                    return (
                      <li key={doc.key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="flex items-center gap-2 text-gray-700">
                          <FileText className="h-4 w-4 text-primary" /> {doc.label}
                        </span>
                        <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View
                        </a>
                      </li>
                    )
                  })}
                  {additionalDocsForModal.map((doc: any, index: number) => {
                    if (!doc?.url) return null
                    return (
                      <li key={`additional-${index}`} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="flex items-center gap-2 text-gray-700">
                          <FileText className="h-4 w-4 text-primary" /> {doc.name || `Additional Document ${index + 1}`}
                        </span>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          View
                        </a>
                      </li>
                    )
                  })}
                  {!hasPrimaryDocsForModal && additionalDocsForModal.length === 0 && (
                    <li className="text-text-secondary">No documents uploaded</li>
                  )}
                </ul>
                      </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" /> Vehicles
                </h4>
                <ul className="space-y-2 text-sm">
                  {(selectedPermit.vehicleDetails || selectedPermit.vehicle_details || []).map((vehicle: any, index: number) => (
                    <li key={index} className="bg-gray-50 px-3 py-2 rounded-lg flex flex-col">
                      <span className="font-semibold text-gray-800">{vehicle.plateNumber || vehicle.plate_number}</span>
                      <span className="text-xs text-gray-500">{vehicle.description || vehicle.vehicle_description}</span>
                    </li>
                  ))}
                </ul>
                    </div>

              {selectedPermit.reviewNotes && (
                <div className="border border-gray-100 rounded-xl p-4 bg-amber-50">
                  <p className="text-xs uppercase tracking-wide text-amber-600 mb-2">Review Notes</p>
                  <p className="text-sm text-amber-800 whitespace-pre-line">{selectedPermit.reviewNotes}</p>
                  </div>
              )}

              {selectedPermit.special_instructions && (
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Special Instructions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{selectedPermit.special_instructions}</p>
            </div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  )
}
