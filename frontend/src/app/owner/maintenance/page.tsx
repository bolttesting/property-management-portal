'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import {
  Wrench,
  Filter,
  Calendar,
  MapPin,
  User,
  Mail,
  Phone,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardList,
  MessageCircle,
  Image as ImageIcon,
  Edit3,
  X,
} from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

type MaintenanceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800', icon: ClipboardList },
  in_progress: { label: 'In Progress', color: 'bg-indigo-100 text-indigo-800', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

const STATUS_OPTIONS: Array<{ value: MaintenanceStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const UPDATE_OPTIONS: Array<{ value: MaintenanceStatus; label: string }> = [
  { value: 'assigned', label: 'Mark as Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Mark as Completed' },
  { value: 'cancelled', label: 'Cancel Request' },
]

export default function OwnerMaintenancePage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [filters, setFilters] = useState<{ status: '' | MaintenanceStatus }>({ status: '' })
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [statusForm, setStatusForm] = useState<{ status: MaintenanceStatus; assignedTo: string }>({
    status: 'assigned',
    assignedTo: '',
  })
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'owner') {
      router.push('/auth/login')
      return
    }

    void loadRequests()
  }, [hasHydrated, isAuthenticated, user, router, filters.status])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.status) {
        params.status = filters.status
      }
      const response = await ownerAPI.getMaintenanceRequests(params)
      const maintenanceRequests = response.data?.data?.maintenanceRequests || []
      setRequests(Array.isArray(maintenanceRequests) ? maintenanceRequests : [])
    } catch (error: any) {
      console.error('Failed to load maintenance requests', error)
      toast.error('Unable to load maintenance requests')
    } finally {
      setLoading(false)
    }
  }

  const openStatusModal = (request: any) => {
    setSelectedRequest(request)
    setStatusForm({
      status: (request.status as MaintenanceStatus) || 'assigned',
      assignedTo: request.assigned_to || '',
    })
  }

  const handleStatusUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRequest) return

    try {
      setUpdatingStatus(true)
      await ownerAPI.updateMaintenanceRequest(selectedRequest.id, {
        status: statusForm.status,
        assignedTo: statusForm.assignedTo || undefined,
      })
      toast.success('Maintenance request updated')
      setSelectedRequest(null)
      void loadRequests()
    } catch (error: any) {
      console.error('Failed to update maintenance request', error)
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Unable to update maintenance request'
      toast.error(message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: MaintenanceStatus) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const getFileUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
    const backendUrl = apiUrl.replace('/api/v1', '') || 'http://localhost:5000'
    return `${backendUrl}${path.startsWith('/') ? path : `/${path}`}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const ownerNavItems = [
    { href: '/owner/dashboard', label: 'Dashboard' },
    { href: '/owner/tenants', label: 'Tenants' },
    { href: '/owner/properties', label: 'Properties' },
    { href: '/owner/applications', label: 'Applications' },
    { href: '/owner/maintenance', label: 'Maintenance' },
    { href: '/owner/move-permits', label: 'Move Permits' },
    { href: '/owner/chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation userType="owner" navItems={ownerNavItems} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text flex items-center gap-3">
            <Wrench className="h-10 w-10 text-primary" />
            Maintenance Requests
          </h1>
          <p className="text-lg text-gray-600">
            Track and manage maintenance issues reported by your tenants
          </p>
        </div>

        <div className="card mb-8">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 mr-2 text-primary" />
            <h2 className="text-xl font-heading font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ status: e.target.value as MaintenanceStatus | '' })
                }
                className="input-field"
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {requests.length === 0 ? (
          <div className="card py-16 text-center">
            <Wrench className="h-16 w-16 mx-auto mb-4 text-text-tertiary opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No maintenance requests found</h2>
            <p className="text-text-secondary">
              You’ll see tenant maintenance requests here as soon as they’re submitted.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {requests.map((request) => (
              <div key={request.id} className="card p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-semibold">{request.category || 'Maintenance Request'}</h3>
                        <p className="text-sm text-text-tertiary capitalize">{request.type}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(request.status as MaintenanceStatus)}
                        {request.assigned_to && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                            <Edit3 className="h-3 w-3" />
                            Assigned to {request.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-text-secondary whitespace-pre-line">{request.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>Submitted: {new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span>{request.property_name || 'Property'}</span>
                      </div>
                    </div>

                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                      <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Tenant
                      </p>
                      <div className="text-sm text-text-secondary space-y-1">
                        <p>{request.tenant_name || 'Unknown tenant'}</p>
                        {request.tenant_email && (
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            <span>{request.tenant_email}</span>
                          </p>
                        )}
                        {request.tenant_mobile && (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-primary" />
                            <span>{request.tenant_mobile}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {Array.isArray(request.photos) && request.photos.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          Photos
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {request.photos.map((photo: string) => (
                            <a
                              key={photo}
                              href={getFileUrl(photo)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block h-20 w-20 rounded-lg overflow-hidden border border-border hover:border-primary transition"
                            >
                              <img
                                src={getFileUrl(photo)}
                                alt="Maintenance attachment"
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:w-48 flex flex-col gap-3">
                    <button
                      onClick={() => openStatusModal(request)}
                      className="btn-primary w-full"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border">
              <h2 className="text-xl font-heading font-semibold">Update Maintenance Request</h2>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-text-tertiary hover:text-text-primary"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Status
                </label>
                <select
                  value={statusForm.status}
                  onChange={(e) =>
                    setStatusForm((prev) => ({
                      ...prev,
                      status: e.target.value as MaintenanceStatus,
                    }))
                  }
                  className="input-field"
                >
                  {UPDATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Assigned To (Optional)
                </label>
                <input
                  type="text"
                  value={statusForm.assignedTo}
                  onChange={(e) =>
                    setStatusForm((prev) => ({ ...prev, assignedTo: e.target.value }))
                  }
                  className="input-field"
                  placeholder="Name of the maintenance team or contractor"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="btn-primary flex-1"
                >
                  {updatingStatus ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

