'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Plus, Filter, Search, Edit, Eye, Home,
  MapPin, Bed, Bath, Car, Ruler,
  User, Mail, Phone, Calendar, MessageCircle
} from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

export default function OwnerPropertiesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const initialStatus = searchParams.get('status') ?? ''
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    location: '',
    status: initialStatus,
  })

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
    
    // If authenticated, load properties
    if (isAuthenticated && user?.userType === 'owner') {
      loadProperties()
    }
  }, [hasHydrated, isAuthenticated, user, filters, router])

  useEffect(() => {
    const statusParam = searchParams.get('status') ?? ''
    setFilters((prev) =>
      prev.status === statusParam ? prev : { ...prev, status: statusParam }
    )
  }, [searchParams])

  const loadProperties = async () => {
    try {
      setLoading(true)
      const response = await ownerAPI.getProperties(filters)
      setProperties(response.data.data.properties)
    } catch (error: any) {
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
              My Properties
            </h1>
            <p className="text-lg text-gray-600">
              View and manage all your properties
            </p>
          </div>
          <button
            onClick={() => router.push('/owner/properties/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl shadow-xl p-6 mb-8">
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

        {/* Properties List */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-bold gradient-text">
              All Properties ({properties.length})
            </h2>
          </div>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const address = property.address || {}
                const primaryImage = property.primary_image
                
                // Helper function to get image URL
                const getImageUrl = (imageUrl: string | undefined | null): string => {
                  if (!imageUrl) {
                    console.log('Owner Properties: No image URL provided for property:', property.id)
                    return ''
                  }
                  // If URL already includes http, return as is
                  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                    console.log('Owner Properties: Image URL already absolute:', imageUrl)
                    return imageUrl
                  }
                  // Otherwise, prepend backend URL
                  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
                  const backendUrl = apiUrl.replace('/api/v1', '') || 'http://localhost:5000'
                  const fullUrl = `${backendUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
                  console.log('Owner Properties: Constructed image URL:', {
                    propertyId: property.id,
                    original: imageUrl,
                    apiUrl,
                    backendUrl,
                    fullUrl
                  })
                  return fullUrl
                }
                
                const leaseStart = property.lease_start_date ? new Date(property.lease_start_date) : null
                const leaseEnd = property.lease_end_date ? new Date(property.lease_end_date) : null

                return (
                  <div
                    key={property.id}
                    className="glass rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white"
                  >
                    {/* Image */}
                    <div className="relative h-48 bg-background-gray">
                      {primaryImage ? (
                        <>
                          <img
                            src={getImageUrl(primaryImage)}
                            alt={property.property_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Property image load error:', {
                                attemptedUrl: e.currentTarget.src,
                                imageUrl: primaryImage,
                                propertyId: property.id,
                                error: 'Image failed to load - check console for details'
                              })
                              // Don't hide the image, show placeholder instead
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.onerror = null
                              // Show placeholder
                              const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'flex'
                              }
                            }}
                            onLoad={(e) => {
                              console.log('Property image loaded successfully:', e.currentTarget.src)
                              // Hide placeholder if image loads
                              const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
                              if (placeholder) {
                                placeholder.style.display = 'none'
                              }
                            }}
                          />
                          <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-background-gray" style={{ display: 'none' }}>
                            <Home className="h-12 w-12 text-text-tertiary" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-12 w-12 text-text-tertiary" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          property.status === 'occupied' ? 'bg-accent-green text-white' :
                          property.status === 'vacant' ? 'bg-accent-gold text-white' :
                          property.status === 'under_maintenance' ? 'bg-orange-500 text-white' :
                          'bg-text-tertiary text-white'
                        }`}>
                          {property.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {property.property_name}
                      </h3>
                      <div className="flex items-center text-text-secondary text-sm mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="line-clamp-1">
                          {address.location || address.area || 'UAE'}
                        </span>
                      </div>

                      {/* Specifications */}
                      <div className="flex flex-wrap gap-3 mb-3 text-sm text-text-secondary">
                        {address.bedrooms && (
                          <div className="flex items-center">
                            <Bed className="h-4 w-4 mr-1" />
                            <span>{address.bedrooms}</span>
                          </div>
                        )}
                        {address.bathrooms && (
                          <div className="flex items-center">
                            <Bath className="h-4 w-4 mr-1" />
                            <span>{address.bathrooms}</span>
                          </div>
                        )}
                        {address.area && (
                          <div className="flex items-center">
                            <Ruler className="h-4 w-4 mr-1" />
                            <span>{address.area} {address.areaUnit || 'sqft'}</span>
                          </div>
                        )}
                        {address.parkingSpaces && (
                          <div className="flex items-center">
                            <Car className="h-4 w-4 mr-1" />
                            <span>{address.parkingSpaces}</span>
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <p className="text-2xl font-bold text-accent-gold">
                          AED {property.price?.toLocaleString()}
                        </p>
                        <p className="text-xs text-text-secondary">per month</p>
                      </div>

                      {(property.current_tenant_name || property.current_tenant_email || property.current_tenant_mobile) && (
                        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-1">
                            {property.status === 'occupied' ? 'Currently leased to' : 'Approved tenant'}
                          </p>
                          <div className="space-y-1 text-sm text-text-secondary">
                            {property.current_tenant_name && (
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-2 text-primary" />
                                <span>{property.current_tenant_name}</span>
                              </div>
                            )}
                            {property.current_tenant_email && (
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2 text-primary" />
                                <span>{property.current_tenant_email}</span>
                              </div>
                            )}
                            {property.current_tenant_mobile && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2 text-primary" />
                                <span>{property.current_tenant_mobile}</span>
                              </div>
                            )}
                            {(leaseStart || leaseEnd) && (
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-primary" />
                                <span>
                                  {leaseStart ? leaseStart.toLocaleDateString() : 'Start TBD'}
                                  {' '}–{' '}
                                  {leaseEnd ? leaseEnd.toLocaleDateString() : 'End TBD'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-border">
                        <button
                          onClick={() => router.push(`/owner/properties/${property.id}/edit`)}
                          className="flex-1 btn-secondary text-sm flex items-center justify-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/owner/properties/${property.id}`)}
                          className="flex-1 btn-primary text-sm flex items-center justify-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Home className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary mb-4">No properties found</p>
              {filters.location || filters.status ? (
                <button
                  onClick={() => setFilters({ location: '', status: '' })}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => router.push('/owner/properties/new')}
                  className="btn-primary"
                >
                  Add Your First Property
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

