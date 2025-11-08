'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Home, Mail, Phone, FileText, Filter,
  LogOut, User as UserIcon, ArrowLeft, Clock, CheckCircle, XCircle
} from 'lucide-react'
import Link from 'next/link'

export default function AdminApplicationsPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
  })

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
      if (parsedUser.userType !== 'admin') {
        router.push('/auth/login')
        return
      }
    } catch {
      router.push('/auth/login')
      return
    }
    
    if (isAuthenticated && user?.userType === 'admin') {
      loadApplications()
    }
  }, [hasHydrated, isAuthenticated, user, router, filters])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.status) params.status = filters.status

      const response = await adminAPI.getAllApplications(params)
      setApplications(response.data.data.applications || [])
    } catch (error: any) {
      console.error('Failed to load applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await authAPI.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      logout()
      router.push('/auth/login')
      setLoggingOut(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20 backdrop-blur-xl bg-white/90 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/admin/dashboard" className="flex items-center group/logo">
              <ArrowLeft className="h-6 w-6 text-gray-600 mr-2 group-hover/logo:-translate-x-1 transition-transform" />
              <span className="text-xl md:text-2xl font-heading font-extrabold gradient-text">
                All Applications
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="px-4 py-2 rounded-lg font-semibold text-gray-700 hover:text-primary hover:bg-primary/10 transition-all duration-300">
                Dashboard
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.email || 'Admin'}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-4 py-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-custom py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
            All Applications
          </h1>
          <p className="text-lg text-gray-600">
            View and manage all property applications
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 glass rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-5 w-5 text-gray-600" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input-field max-w-xs"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="ml-auto text-sm text-gray-600">
              Total: {applications.length} applications
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="glass rounded-2xl shadow-xl p-12 text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No applications found</p>
            </div>
          ) : (
            applications.map((application) => (
              <div
                key={application.id}
                className="glass rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Home className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold text-gray-900">
                        {application.property_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(application.status)}`}>
                        {getStatusIcon(application.status)}
                        {application.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Tenant:</span> {application.tenant_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <span>{application.email}</span>
                      </div>
                      {application.mobile && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <span>{application.mobile}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Dealer:</span> {application.owner_company || `${application.owner_first_name} ${application.owner_last_name}`}
                      </div>
                      {application.offer_amount && (
                        <div className="col-span-full">
                          <span className="font-medium">Offer Amount:</span> AED {parseFloat(application.offer_amount).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Applied: {new Date(application.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

