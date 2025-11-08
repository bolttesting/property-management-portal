'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Home, Building2, Mail, Phone, Users, Filter,
  CheckCircle, XCircle, Clock, LogOut, User as UserIcon, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function OwnersPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [owners, setOwners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    ownerType: '',
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
      loadOwners()
    }
  }, [hasHydrated, isAuthenticated, user, router, filters])

  const loadOwners = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.status) params.status = filters.status
      if (filters.ownerType) params.ownerType = filters.ownerType

      const response = await adminAPI.getOwners(params)
      setOwners(response.data.data.owners || [])
    } catch (error: any) {
      console.error('Failed to load owners:', error)
      toast.error('Failed to load property dealers')
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
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
                Property Dealers
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
            All Property Dealers
          </h1>
          <p className="text-lg text-gray-600">
            Manage and view all property dealers in the system
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
              <option value="active">Active</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filters.ownerType}
              onChange={(e) => setFilters({ ...filters, ownerType: e.target.value })}
              className="input-field max-w-xs"
            >
              <option value="">All Types</option>
              <option value="management_company">Management Company</option>
              <option value="real_estate_agency">Real Estate Agency</option>
              <option value="individual">Individual</option>
            </select>
            <div className="ml-auto text-sm text-gray-600">
              Total: {owners.length} dealers
            </div>
          </div>
        </div>

        {/* Owners List */}
        <div className="space-y-4">
          {owners.length === 0 ? (
            <div className="glass rounded-2xl shadow-xl p-12 text-center">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No property dealers found</p>
            </div>
          ) : (
            owners.map((owner) => (
              <div
                key={owner.id}
                className="glass rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Building2 className="h-6 w-6 text-primary" />
                      <h3 className="text-xl font-bold text-gray-900">
                        {owner.company_name || `${owner.first_name} ${owner.last_name}`}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(owner.status)}`}>
                        {owner.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <span>{owner.email}</span>
                      </div>
                      {owner.mobile && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <span>{owner.mobile}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Type:</span> {owner.owner_type.replace('_', ' ')}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Home className="h-4 w-4" />
                          {owner.total_properties || 0} Properties
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {owner.total_tenants || 0} Tenants
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {owner.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await adminAPI.approveOwner(owner.id)
                              toast.success('Property dealer approved!')
                              loadOwners()
                            } catch (error: any) {
                              toast.error(error.response?.data?.message || 'Failed to approve')
                            }
                          }}
                          className="btn-primary flex items-center gap-2"
                        >
                          <CheckCircle className="h-5 w-5" />
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Are you sure you want to reject this property dealer?')) return
                            try {
                              await adminAPI.rejectOwner(owner.id)
                              toast.success('Property dealer rejected')
                              loadOwners()
                            } catch (error: any) {
                              toast.error(error.response?.data?.message || 'Failed to reject')
                            }
                          }}
                          className="btn-secondary flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-5 w-5" />
                          Reject
                        </button>
                      </>
                    )}
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

