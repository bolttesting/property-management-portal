'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI, applicationsAPI, chatAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  FileText, Filter, CheckCircle, XCircle, Clock, 
  Eye, MapPin, Calendar, User, Building, X, MessageCircle, Mail, Phone
} from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

export default function OwnerApplicationsPage() {
  const router = useRouter()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [filters, setFilters] = useState({
    status: '',
  })
  const [creatingChat, setCreatingChat] = useState<string | null>(null)

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) {
      return
    }

    // Check localStorage directly as fallback
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    
    if (!token || !storedUser) {
      router.push('/auth/login')
      return
    }
    
    try {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser.userType !== 'owner') {
        router.push('/auth/login')
        return
      }
    } catch {
      router.push('/auth/login')
      return
    }
    
    // If authenticated, load applications
    if (isAuthenticated && user?.userType === 'owner') {
      loadApplications()
    }
  }, [hasHydrated, isAuthenticated, user, filters, router])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.status) {
        params.status = filters.status
      }
      const response = await ownerAPI.getApplications(params)
      setApplications(response.data.data.applications || [])
    } catch (error: any) {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      await applicationsAPI.updateStatus(applicationId, newStatus)
      toast.success(`Application ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully`)
      loadApplications()
      setSelectedApplication(null)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update application status')
    }
  }

  const handleMessageTenant = async (application: any) => {
    if (!application.tenant_user_id) {
      toast.error('Tenant account information is missing')
      return
    }
    try {
      setCreatingChat(application.id)
      const response = await chatAPI.getOrCreateRoom({
        recipientId: application.tenant_user_id,
        recipientType: 'tenant',
        roomType: 'owner_tenant',
      })
      const roomId = response.data?.data?.roomId
      if (roomId) {
        toast.success('Chat opened with tenant')
        router.push(`/owner/chat?roomId=${roomId}`)
      } else {
        toast.error('Unable to open chat room')
      }
    } catch (error: any) {
      console.error('Chat creation error:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to open chat with tenant')
    } finally {
      setCreatingChat(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      under_review: { color: 'bg-blue-500', icon: Clock, text: 'Under Review' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500', icon: XCircle, text: 'Rejected' },
      cancelled: { color: 'bg-gray-500', icon: XCircle, text: 'Cancelled' },
    }
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
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
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
            Applications
          </h1>
          <p className="text-lg text-gray-600">
            Review and manage property applications from tenants
          </p>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl shadow-xl p-6 mb-8">
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
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-field"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-heading font-semibold">
              All Applications ({applications.length})
            </h2>
          </div>

          {applications.length > 0 ? (
            <div className="space-y-4">
              {applications.map((application) => {
                const propertyAddress = application.property_address || {}
                const applicantInfo = application.applicant_info || {}
                
                const propertyPrice =
                  typeof application.property_price === 'number'
                    ? application.property_price
                    : Number(application.property_price ?? application.price ?? 0)

                return (
                  <div
                    key={application.id}
                    className="border border-border rounded-lg p-6 hover:shadow-medium transition-shadow bg-white"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{application.property_name}</h3>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex items-center text-text-secondary text-sm mb-2">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {propertyAddress.location || propertyAddress.area || 'UAE'}
                          </span>
                        </div>
                        <div className="flex items-center text-text-secondary text-sm">
                          <User className="h-4 w-4 mr-1" />
                          <span>{application.tenant_name || 'N/A'}</span>
                          {application.email && (
                            <span className="ml-3">• {application.email}</span>
                          )}
                          {application.mobile && (
                            <span className="ml-3">• {application.mobile}</span>
                          )}
                        </div>
                        {(application.nationality || application.employment_status) && (
                          <div className="mt-2 text-xs text-text-tertiary space-x-4">
                            {application.nationality && <span>Nationality: {application.nationality}</span>}
                            {application.employment_status && <span>Employment: {application.employment_status}</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-accent-gold mb-1">
                          {propertyPrice > 0 ? `AED ${propertyPrice.toLocaleString()}` : 'AED —'}
                        </p>
                        <p className="text-xs text-text-secondary">per month</p>
                        {application.offer_amount && (
                          <p className="text-xs text-primary mt-2">Offer: AED {Number(application.offer_amount).toLocaleString()}</p>
                        )}
                      </div>
                    </div>

                    {/* Application Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                      {application.move_in_date && (
                        <div className="flex items-center text-text-secondary">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Move-in: {new Date(application.move_in_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {application.viewing_date && (
                        <div className="flex items-center text-text-secondary">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Viewing: {new Date(application.viewing_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center text-text-secondary">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Applied: {new Date(application.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Employment Details */}
                    {application.employment_details && (
                      <div className="mb-4 p-3 bg-background-gray rounded-lg">
                        <p className="text-sm font-semibold mb-1">Employment Details</p>
                        <p className="text-sm text-text-secondary">
                          {application.employment_details.company_name && (
                            <span>Company: {application.employment_details.company_name}</span>
                          )}
                          {application.employment_details.salary && (
                            <span className="ml-3">Salary: AED {application.employment_details.salary?.toLocaleString()}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-border">
                      <button
                        onClick={() => setSelectedApplication(application)}
                        className="btn-secondary text-sm flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </button>
                      {application.status === 'pending' || application.status === 'under_review' ? (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(application.id, 'approved')}
                            className="btn-primary text-sm flex items-center bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(application.id, 'rejected')}
                            className="btn-secondary text-sm flex items-center bg-red-600 hover:bg-red-700 text-white"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </>
                      ) : null}
                      {application.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(application.id, 'under_review')}
                          className="btn-secondary text-sm flex items-center"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Mark Under Review
                        </button>
                      )}
                      <button
                        onClick={() => handleMessageTenant(application)}
                        className="btn-secondary text-sm flex items-center"
                        disabled={creatingChat === application.id}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {creatingChat === application.id ? 'Opening chat...' : 'Message Tenant'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary mb-4">No applications found</p>
              {filters.status && (
                <button
                  onClick={() => setFilters({ status: '' })}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-heading font-bold">Application Details</h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Property</h3>
                  <p className="text-text-secondary">{selectedApplication.property_name}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Applicant</h3>
                  <p className="text-text-secondary">{selectedApplication.tenant_name}</p>
                  {selectedApplication.email && (
                    <p className="text-text-secondary flex items-center"><Mail className="h-4 w-4 mr-1" />{selectedApplication.email}</p>
                  )}
                  {selectedApplication.mobile && (
                    <p className="text-text-secondary flex items-center"><Phone className="h-4 w-4 mr-1" />{selectedApplication.mobile}</p>
                  )}
                  {(selectedApplication.nationality || selectedApplication.employment_status) && (
                    <div className="text-sm text-text-tertiary space-y-1 mt-2">
                      {selectedApplication.nationality && <p>Nationality: {selectedApplication.nationality}</p>}
                      {selectedApplication.employment_status && <p>Employment: {selectedApplication.employment_status}</p>}
                      {selectedApplication.emirates_id_masked && <p>Emirates ID: {selectedApplication.emirates_id_masked}</p>}
                    </div>
                  )}
                  {selectedApplication.offer_amount && (
                    <p className="text-sm text-primary mt-2">Offer Amount: AED {Number(selectedApplication.offer_amount).toLocaleString()}</p>
                  )}
                </div>

                {selectedApplication.applicant_info && (
                  <div>
                    <h3 className="font-semibold mb-2">Applicant Information</h3>
                    <pre className="bg-background-gray p-3 rounded text-sm text-text-secondary overflow-auto">
                      {JSON.stringify(selectedApplication.applicant_info, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedApplication.employment_details && (
                  <div>
                    <h3 className="font-semibold mb-2">Employment Details</h3>
                    <pre className="bg-background-gray p-3 rounded text-sm text-text-secondary overflow-auto">
                      {JSON.stringify(selectedApplication.employment_details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedApplication.documents && selectedApplication.documents.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Documents</h3>
                    <div className="space-y-2">
                      {selectedApplication.documents.map((doc: any, index: number) => (
                        <a
                          key={index}
                          href={`http://localhost:5000${doc.document_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-primary hover:underline"
                        >
                          {doc.file_name || doc.document_type} ({doc.document_type})
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <button
                    onClick={() => setSelectedApplication(null)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                  {selectedApplication.status === 'pending' || selectedApplication.status === 'under_review' ? (
                    <>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedApplication.id, 'approved')
                        }}
                        className="btn-primary bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          handleStatusUpdate(selectedApplication.id, 'rejected')
                        }}
                        className="btn-secondary bg-red-600 hover:bg-red-700 text-white"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  <button
                    onClick={() => handleMessageTenant(selectedApplication)}
                    className="btn-primary flex items-center"
                    disabled={creatingChat === selectedApplication.id}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {creatingChat === selectedApplication.id ? 'Opening chat...' : 'Message Tenant'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

