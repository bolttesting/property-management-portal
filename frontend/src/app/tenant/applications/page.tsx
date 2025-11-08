'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { tenantAPI, chatAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, FileText, MapPin, Calendar, CheckCircle, XCircle, Clock, Eye, Home, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function TenantApplicationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingChat, setCreatingChat] = useState<string | null>(null)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'tenant') {
      router.push('/auth/login')
      return
    }

    loadApplications()
  }, [hasHydrated, isAuthenticated, user, router])

  const loadApplications = async () => {
    try {
      const response = await tenantAPI.getApplications()
      if (response.data?.success && response.data?.data?.applications) {
        setApplications(response.data.data.applications)
      }
    } catch (error: any) {
      console.error('Failed to load applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleMessageOwner = async (application: any) => {
    if (!application.owner_user_id) {
      toast.error('Dealer account information is missing')
      return
    }

    try {
      setCreatingChat(application.id)
      const response = await chatAPI.getOrCreateRoom({
        recipientId: application.owner_user_id,
        recipientType: 'owner',
        roomType: 'owner_tenant',
      })
      const roomId = response.data?.data?.roomId
      if (roomId) {
        toast.success('Chat opened with property dealer')
        router.push(`/tenant/chat?roomId=${roomId}`)
      } else {
        toast.error('Unable to open chat room')
      }
    } catch (error: any) {
      console.error('Chat creation error:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to open chat with dealer')
    } finally {
      setCreatingChat(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
      withdrawn: { icon: XCircle, color: 'bg-gray-100 text-gray-800', label: 'Withdrawn' },
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

        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold mb-2">My Applications</h1>
          <p className="text-text-secondary">View and manage your property applications</p>
        </div>

        {applications.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="h-16 w-16 mx-auto mb-4 text-text-tertiary opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No applications yet</h2>
            <p className="text-text-secondary mb-6">Start browsing properties and submit your first application</p>
            <Link href="/properties" className="btn-primary">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold mb-1">
                          {application.property_name || 'Property'}
                        </h3>
                        {application.property_address && (
                          <div className="flex items-center text-text-secondary mb-2">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {typeof application.property_address === 'string'
                                ? application.property_address
                                : `${application.property_address.street || ''} ${application.property_address.city || ''} ${application.property_address.emirate || ''}`.trim()}
                            </span>
                          </div>
                        )}
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>
                          Applied: {new Date(application.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {application.property_price && (
                        <div>
                          <span className="font-semibold text-text-primary">
                            AED {application.property_price.toLocaleString()}/month
                          </span>
                        </div>
                      )}
                      {application.offer_amount && (
                        <div>
                          <span className="font-semibold text-primary">
                            Your offer: AED {Number(application.offer_amount).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {application.notes && (
                      <div className="mt-3 p-3 bg-background-gray rounded-lg">
                        <p className="text-sm text-text-secondary">
                          <span className="font-semibold">Notes: </span>
                          {application.notes}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/properties/${application.property_id}`}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Property
                    </Link>
                    <button
                      onClick={() => handleMessageOwner(application)}
                      className="btn-primary flex items-center gap-2"
                      disabled={creatingChat === application.id}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {creatingChat === application.id ? 'Opening chat...' : 'Message Dealer'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

