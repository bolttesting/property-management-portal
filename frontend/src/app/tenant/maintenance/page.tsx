'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { tenantAPI, uploadAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Wrench, Plus, Clock, CheckCircle, XCircle, AlertCircle, Calendar, FileText, X, Home } from 'lucide-react'
import Link from 'next/link'

export default function TenantMaintenancePage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [properties, setProperties] = useState<Array<{ id: string; name: string }>>([])
  const [photoUploads, setPhotoUploads] = useState<Array<{ url: string; name: string }>>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    type: 'routine',
    category: '',
    propertyId: '',
  })

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'tenant') {
      router.push('/auth/login')
      return
    }

    void Promise.all([loadRequests(), loadProperties()])
  }, [hasHydrated, isAuthenticated, user, router])

  const loadRequests = async () => {
    try {
      const response = await tenantAPI.getMaintenanceRequests()
      const maintenanceRequests = response.data?.data?.maintenanceRequests || []
      setRequests(Array.isArray(maintenanceRequests) ? maintenanceRequests : [])
    } catch (error: any) {
      console.error('Failed to load maintenance requests:', error)
      toast.error('Failed to load maintenance requests')
    } finally {
      setLoading(false)
    }
  }

  const loadProperties = async () => {
    try {
      setLoadingProperties(true)
      const response = await tenantAPI.getLeases({ status: 'active', limit: 50 })
      const leases: any[] = response.data?.data?.leases || []
      const options = leases
        .filter((lease) => lease.property_id)
        .map((lease) => ({
          id: lease.property_id,
          name: lease.property_name || `Property ${lease.property_id}`,
        }))
      setProperties(options)
      if (!formData.propertyId && options.length > 0) {
        setFormData((prev) => ({ ...prev, propertyId: options[0].id }))
      }
    } catch (error) {
      console.error('Failed to load tenant properties', error)
      toast.error('Could not load your leased properties')
    } finally {
      setLoadingProperties(false)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const remainingSlots = Math.max(5 - photoUploads.length, 0)
    const filesToUpload = files.slice(0, remainingSlots)

    if (filesToUpload.length === 0) {
      toast.error('You can attach up to 5 photos per request')
      event.target.value = ''
      return
    }

    setUploadingPhotos(true)
    try {
      for (const file of filesToUpload) {
        const uploadResponse = await uploadAPI.uploadImage(file)
        const fileUrl = uploadResponse.data?.data?.fileUrl
        if (fileUrl) {
          setPhotoUploads((prev) => [...prev, { url: fileUrl, name: file.name }])
        } else {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    } catch (error: any) {
      console.error('Photo upload failed', error)
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Failed to upload photo'
      toast.error(message)
    } finally {
      setUploadingPhotos(false)
      event.target.value = ''
    }
  }

  const removePhoto = (url: string) => {
    setPhotoUploads((prev) => prev.filter((photo) => photo.url !== url))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!formData.propertyId) {
        toast.error('Please select which property needs attention')
        return
      }

      await tenantAPI.createMaintenanceRequest({
        propertyId: formData.propertyId,
        type: formData.type,
        category: formData.category || null,
        description: formData.description,
        photos: photoUploads.map((photo) => photo.url),
      })
      toast.success('Maintenance request submitted successfully!')
      setShowModal(false)
      setPhotoUploads([])
      setFormData({
        description: '',
        type: 'routine',
        category: '',
        propertyId: properties[0]?.id || '',
      })
      void loadRequests()
    } catch (error: any) {
      console.error('Failed to submit maintenance request:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to submit maintenance request'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      in_progress: { icon: AlertCircle, color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    )
  }

  const getPriorityBadge = (type: string) => {
    const typeConfig = {
      routine: { color: 'bg-gray-100 text-gray-800', label: 'Routine' },
      urgent: { color: 'bg-orange-100 text-orange-800', label: 'Urgent' },
      emergency: { color: 'bg-red-100 text-red-800', label: 'Emergency' },
    }
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.routine

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/tenant/dashboard"
            className="flex items-center text-text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="btn-secondary flex items-center gap-2"
            title="Go to Homepage"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2 flex items-center gap-2">
              <Wrench className="h-8 w-8 text-primary" />
              Maintenance Requests
            </h1>
            <p className="text-text-secondary">Report and track maintenance issues</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Request
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <Wrench className="h-16 w-16 mx-auto mb-4 text-text-tertiary opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No maintenance requests</h2>
            <p className="text-text-secondary mb-6">Submit a request if you need maintenance work done</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Create Request
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="card">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {request.category || 'Maintenance Request'}
                        </h3>
                        <span className="text-sm text-text-secondary capitalize">
                          {request.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {getPriorityBadge(request.type)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    <p className="text-text-secondary mb-3">{request.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          Submitted: {new Date(request.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {request.property_name && (
                        <div>
                          <span className="font-semibold">Property: </span>
                          {request.property_name}
                        </div>
                      )}
                    </div>
                    {request.notes && (
                      <div className="mt-3 p-3 bg-background-gray rounded-lg">
                        <p className="text-sm text-text-secondary">
                          <span className="font-semibold">Owner Notes: </span>
                          {request.notes}
                        </p>
                      </div>
                    )}
                    {Array.isArray(request.photos) && request.photos.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-text-primary mb-2">Photos</p>
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
                                alt="Maintenance photo"
                                className="h-full w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-large shadow-xlarge max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-heading font-bold">New Maintenance Request</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder="Describe the maintenance issue in detail..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Plumbing, Electrical, HVAC"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Property
                </label>
                {properties.length > 0 ? (
                  <select
                    value={formData.propertyId}
                    onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                    className="input-field"
                    disabled={loadingProperties}
                    required
                  >
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name} — ID {property.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-field"
                    placeholder="No active lease found — please contact your property manager"
                    disabled
                  />
                )}
                <p className="text-xs text-text-tertiary mt-1">
                  We automatically list the properties linked to your active leases. Select the one that needs attention.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Photos (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="input-field"
                  disabled={uploadingPhotos || photoUploads.length >= 5}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Attach up to 5 images to help the maintenance team understand the issue.
                </p>
                {uploadingPhotos && (
                  <p className="text-xs text-primary mt-2">Uploading photos...</p>
                )}
                {photoUploads.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {photoUploads.map((photo) => (
                      <div key={photo.url} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                        <img
                          src={getFileUrl(photo.url)}
                          alt={photo.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.url)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    uploadingPhotos ||
                    !formData.description ||
                    !formData.propertyId
                  }
                  className="btn-primary flex-1"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

