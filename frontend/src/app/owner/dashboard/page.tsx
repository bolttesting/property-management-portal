'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Home, Users, FileText, Wrench, 
  TrendingUp, Plus, Filter, LogOut, User as UserIcon, MessageCircle,
  MapPin, Bed, Bath, Car, Ruler, Edit, Eye, Calendar, Mail, Phone
} from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

export default function OwnerDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<any[]>([])
  const [filters, setFilters] = useState({ location: '', status: '' })
  const [loggingOut, setLoggingOut] = useState(false)

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
    
    // If authenticated, load dashboard (only once on mount)
    if (isAuthenticated && user?.userType === 'owner') {
      loadDashboard()
    }
  }, [hasHydrated, isAuthenticated, user, router])

  // Load properties when filters change
  useEffect(() => {
    if (isAuthenticated && user?.userType === 'owner') {
      loadProperties()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const loadDashboard = async () => {
    try {
      const response = await ownerAPI.getDashboard()
      if (response.data && response.data.data && response.data.data.dashboard) {
        setStats(response.data.data.dashboard.statistics)
      } else {
        console.error('Invalid dashboard response:', response.data)
        toast.error('Invalid dashboard data received')
      }
    } catch (error: any) {
      console.error('Dashboard load error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to load dashboard'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const loadProperties = async () => {
    try {
      const response = await ownerAPI.getProperties(filters)
      if (response.data && response.data.data && response.data.data.properties) {
        // Parse address JSONB for all properties
        const propertiesWithParsedAddress = response.data.data.properties.map((property: any) => {
          if (property.address && typeof property.address === 'string') {
            try {
              property.address = JSON.parse(property.address)
            } catch (e) {
              property.address = {}
            }
          }
          return property
        })
        setProperties(propertiesWithParsedAddress)
      } else {
        console.error('Invalid properties response:', response.data)
        setProperties([])
      }
    } catch (error: any) {
      console.error('Properties load error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to load properties'
      toast.error(errorMessage)
      setProperties([])
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      // Call logout API
      await authAPI.logout()
    } catch (error) {
      // Even if API call fails, clear local storage
      console.error('Logout API error:', error)
    } finally {
      // Clear auth store and redirect
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
            Property Dealer Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your properties, tenants, and applications
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="card cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => router.push('/owner/properties')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Total Properties</p>
                <p className="text-3xl font-bold text-text-primary">{stats?.totalProperties || 0}</p>
                <p className="text-xs text-primary mt-1">Click to view →</p>
              </div>
              <div className="bg-primary-light rounded-full p-3">
                <Home className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div
            className="card cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => router.push('/owner/properties?status=occupied')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Occupied</p>
                <p className="text-3xl font-bold text-text-primary">{stats?.occupiedProperties || 0}</p>
              </div>
              <div className="bg-accent-green/10 rounded-full p-3">
                <Home className="h-6 w-6 text-accent-green" />
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => router.push('/owner/tenants')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Total Tenants</p>
                <p className="text-3xl font-bold text-text-primary">{stats?.totalTenants || 0}</p>
                <p className="text-xs text-primary mt-1">Click to manage →</p>
              </div>
              <div className="bg-primary-light rounded-full p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => router.push('/owner/applications')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Pending Applications</p>
                <p className="text-3xl font-bold text-text-primary">{stats?.pendingApplications || 0}</p>
                <p className="text-xs text-primary mt-1">Click to view →</p>
              </div>
              <div className="bg-accent-orange/10 rounded-full p-3">
                <FileText className="h-6 w-6 text-accent-orange" />
              </div>
            </div>
          </div>
        </div>

        {/* Property Filters */}
        <div className="card mb-8">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 mr-2 text-primary" />
            <h2 className="text-xl font-heading font-semibold">Property Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g., Dubai Downtown"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="input-field"
              />
            </div>
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
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div 
            className="card cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => router.push('/owner/tenants')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Manage Tenants</h3>
                <p className="text-text-secondary text-sm">View and manage all your tenants</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => router.push('/owner/tenants/new')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Add New Tenant</h3>
                <p className="text-text-secondary text-sm">Create a new tenant account</p>
              </div>
              <Plus className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Properties List - Enhanced Design */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-bold gradient-text">My Properties</h2>
            <button
              onClick={() => router.push('/owner/properties/new')}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Property</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
          
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const leaseStart = property.lease_start_date ? new Date(property.lease_start_date) : null
                const leaseEnd = property.lease_end_date ? new Date(property.lease_end_date) : null
                const address = property.address || {}
                const primaryImage = property.primary_image
                
                const getImageUrl = (imageUrl: string | undefined | null): string => {
                  if (!imageUrl) return ''
                  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                    return imageUrl
                  }
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
                  const backendUrl = apiUrl.replace('/api/v1', '') || 'http://localhost:5000'
                  return `${backendUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
                }
                
                return (
                  <div
                    key={property.id}
                    className="glass rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white"
                  >
                    {/* Property Image */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5">
                      {primaryImage ? (
                        <img
                          src={getImageUrl(primaryImage)}
                          alt={property.property_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-16 w-16 text-primary/30" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          property.status === 'occupied' ? 'bg-green-500 text-white' :
                          property.status === 'vacant' ? 'bg-blue-500 text-white' :
                          property.status === 'under_maintenance' ? 'bg-orange-500 text-white' :
                          'bg-gray-500 text-white'
                        }`}>
                          {property.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Property Content */}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                        {property.property_name}
                      </h3>
                      
                      <div className="flex items-center text-gray-600 text-sm mb-3">
                        <MapPin className="h-4 w-4 mr-1 text-primary" />
                        <span className="line-clamp-1">
                          {address.location || address.area || 'UAE'}
                        </span>
                      </div>

                      {/* Property Specs */}
                      <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
                        {address.bedrooms && (
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4" />
                            <span>{address.bedrooms}</span>
                          </div>
                        )}
                        {address.bathrooms && (
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4" />
                            <span>{address.bathrooms}</span>
                          </div>
                        )}
                        {address.area && (
                          <div className="flex items-center gap-1">
                            <Ruler className="h-4 w-4" />
                            <span>{address.area} {address.areaUnit || 'sqft'}</span>
                          </div>
                        )}
                        {address.parkingSpaces && (
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4" />
                            <span>{address.parkingSpaces}</span>
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-primary">
                          AED {property.price?.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {property.listing_type === 'sale' ? 'For Sale' : 'per month'}
                        </p>
                      </div>

                      {/* Tenant Information */}
                      {(property.current_tenant_name || property.current_tenant_email || property.current_tenant_mobile) && (
                        <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
                          <p className="text-xs font-semibold text-primary mb-2 flex items-center gap-1">
                            {property.status === 'occupied' ? (
                              <>👤 Currently Leased To</>
                            ) : (
                              <>✅ Approved Tenant</>
                            )}
                          </p>
                          <div className="space-y-1.5 text-sm">
                            {property.current_tenant_name && (
                              <div className="flex items-center gap-2 text-gray-700">
                                <UserIcon className="h-3.5 w-3.5 text-primary" />
                                <span className="font-medium">{property.current_tenant_name}</span>
                              </div>
                            )}
                            {property.current_tenant_email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate">{property.current_tenant_email}</span>
                              </div>
                            )}
                            {property.current_tenant_mobile && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span>{property.current_tenant_mobile}</span>
                              </div>
                            )}
                            {(leaseStart || leaseEnd) && (
                              <div className="flex items-center gap-2 text-gray-600 pt-1 border-t border-primary/10">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs">
                                  {leaseStart ? leaseStart.toLocaleDateString() : 'TBD'} - {leaseEnd ? leaseEnd.toLocaleDateString() : 'TBD'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => router.push(`/owner/properties/${property.id}/edit`)}
                          className="flex-1 btn-secondary text-sm flex items-center justify-center gap-1"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/owner/properties/${property.id}`)}
                          className="flex-1 btn-primary text-sm flex items-center justify-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="glass rounded-2xl shadow-xl p-12 text-center">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-4">No properties found</p>
              <button
                onClick={() => router.push('/owner/properties/new')}
                className="btn-primary"
              >
                Add Your First Property
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

