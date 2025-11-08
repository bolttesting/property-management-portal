'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Home, Mail, Phone, MapPin, Filter,
  LogOut, User as UserIcon, ArrowLeft, Building2
} from 'lucide-react'
import Link from 'next/link'

export default function AdminPropertiesPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    location: '',
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
      loadProperties()
    }
  }, [hasHydrated, isAuthenticated, user, router, filters])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (filters.status) params.status = filters.status
      if (filters.location) params.location = filters.location

      const response = await adminAPI.getAllProperties(params)
      setProperties(response.data.data.properties || [])
    } catch (error: any) {
      console.error('Failed to load properties:', error)
      toast.error('Failed to load properties')
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
                All Properties
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
            All Properties
          </h1>
          <p className="text-lg text-gray-600">
            View and manage all properties in the system
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
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <input
              type="text"
              placeholder="Filter by location..."
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="input-field max-w-xs"
            />
            <div className="ml-auto text-sm text-gray-600">
              Total: {properties.length} properties
            </div>
          </div>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          {properties.length === 0 ? (
            <div className="glass rounded-2xl shadow-xl p-12 text-center">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No properties found</p>
            </div>
          ) : (
            properties.map((property) => {
              // Format property address
              let address = property.address
              if (typeof address === 'string') {
                try {
                  address = JSON.parse(address)
                } catch {
                  address = {}
                }
              }

              return (
                <div
                  key={property.id}
                  className="glass rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Home className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-bold text-gray-900">
                          {property.property_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          property.status === 'occupied' ? 'bg-green-100 text-green-800' :
                          property.status === 'vacant' ? 'bg-blue-100 text-blue-800' :
                          property.status === 'sold' ? 'bg-purple-100 text-purple-800' :
                          property.status === 'under_maintenance' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Location:</span> {address?.location || address?.area || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Price:</span> AED {property.price?.toLocaleString()} {property.listing_type === 'sale' ? '' : '/month'}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {property.property_type} - {property.category}
                        </div>
                        <div>
                          <span className="font-medium">Listing Type:</span> {property.listing_type === 'sale' ? 'For Sale' : 'For Rent'}
                        </div>
                        {property.current_tenant_name && (
                          <>
                            <div className="col-span-full border-t pt-3 mt-2">
                              <p className="font-semibold text-gray-900 mb-2">Current Tenant/Owner:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div>
                                  <span className="font-medium">Name:</span> {property.current_tenant_name}
                                </div>
                                {property.current_tenant_email && (
                                  <div>
                                    <span className="font-medium">Email:</span> {property.current_tenant_email}
                                  </div>
                                )}
                                {property.current_tenant_mobile && (
                                  <div>
                                    <span className="font-medium">Mobile:</span> {property.current_tenant_mobile}
                                  </div>
                                )}
                                {property.lease_start_date && (
                                  <div>
                                    <span className="font-medium">Lease Start:</span> {new Date(property.lease_start_date).toLocaleDateString()}
                                  </div>
                                )}
                                {property.lease_end_date && (
                                  <div>
                                    <span className="font-medium">Lease End:</span> {new Date(property.lease_end_date).toLocaleDateString()}
                                  </div>
                                )}
                                {property.offer_amount && (
                                  <div>
                                    <span className="font-medium">Offer Amount:</span> AED {parseFloat(property.offer_amount).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <select
                        value={property.status}
                        onChange={async (e) => {
                          try {
                            await adminAPI.updatePropertyStatus(property.id, e.target.value)
                            toast.success(`Property status updated to ${e.target.value}`)
                            loadProperties()
                          } catch (error: any) {
                            toast.error(error.response?.data?.message || 'Failed to update status')
                            // Revert selection on error
                            e.target.value = property.status
                          }
                        }}
                        className="input-field"
                      >
                        <option value="vacant">Vacant</option>
                        <option value="occupied">Occupied</option>
                        <option value="under_maintenance">Under Maintenance</option>
                        <option value="unavailable">Unavailable</option>
                        <option value="sold">Sold</option>
                      </select>
                      <Link
                        href={`/properties/${property.id}`}
                        className="btn-secondary text-center"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

