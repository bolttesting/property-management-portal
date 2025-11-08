'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  ArrowLeft, User, Mail, Phone, Globe, Briefcase, MapPin, 
  CreditCard, Calendar, Building, Edit, FileText, Eye
} from 'lucide-react'

export default function TenantViewPage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    // Wait for hydration and params to be available
    if (!hasHydrated) {
      return
    }

    // Wait for params.id to be available (Next.js dynamic routes)
    if (!params || !params.id) {
      console.log('Waiting for tenant ID in params...', params)
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

    // Only load tenant if we have all required data
    if (isAuthenticated && user?.userType === 'owner' && params.id && typeof params.id === 'string') {
      loadTenant()
    }
  }, [hasHydrated, params, params?.id, isAuthenticated, user, router])

  const loadTenant = async () => {
    // Prevent multiple simultaneous calls
    if (hasLoaded || loading) {
      console.log('Already loaded or loading tenant, skipping...')
      return
    }

    try {
      setLoading(true)
      setHasLoaded(true)
      const tenantId = params?.id
      console.log('Loading tenant with ID:', tenantId, 'Type:', typeof tenantId)
      
      if (!tenantId || typeof tenantId !== 'string') {
        throw new Error(`Invalid tenant ID: ${tenantId}`)
      }

      console.log('Calling API: GET /owner/tenants/' + tenantId)
      const response = await ownerAPI.getTenantById(tenantId)
      console.log('Tenant API response status:', response.status)
      console.log('Tenant API response data:', response.data)
      
      if (!response.data) {
        throw new Error('No data in response')
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'API request failed')
      }

      if (!response.data.data || !response.data.data.tenant) {
        console.error('Invalid response structure:', response.data)
        throw new Error('Invalid response structure from server')
      }

      const tenantData = response.data.data.tenant
      console.log('Tenant data loaded:', tenantData.id, tenantData.full_name)

      // Parse current_address if it's a string
      let currentAddress = tenantData.current_address || {}
      if (typeof currentAddress === 'string') {
        try {
          currentAddress = JSON.parse(currentAddress)
        } catch (e) {
          console.warn('Failed to parse current_address:', e)
          currentAddress = {}
        }
      }

      setTenant({
        ...tenantData,
        current_address: currentAddress,
      })
    } catch (error: any) {
      console.error('Failed to load tenant - Full error:', error)
      console.error('Error response:', error.response)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to load tenant data'
      
      console.error('Displaying error to user:', errorMessage)
      toast.error(errorMessage)
      
      // Don't redirect immediately - let user see the error
      setTimeout(() => {
        router.push('/owner/tenants')
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!tenant) {
    return null
  }

  const address = tenant.current_address || {}

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/owner/tenants')}
            className="flex items-center text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Tenants
          </button>
          <button
            onClick={() => router.push(`/owner/tenants/${tenant.id}/edit`)}
            className="btn-primary flex items-center"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit Tenant
          </button>
        </div>

        <div className="card">
          {/* Tenant Header */}
          <div className="flex items-start justify-between mb-6 pb-6 border-b border-border">
            <div className="flex items-center">
              <div className="bg-primary-light rounded-full p-4 mr-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-heading font-bold">{tenant.full_name}</h1>
                <p className="text-text-secondary mt-1">Tenant Profile</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-text-secondary">Profile Completion</div>
              <div className="text-2xl font-bold text-primary">{tenant.profile_completion || 0}%</div>
              <div className="w-32 bg-background-gray rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${tenant.profile_completion || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-xl font-heading font-semibold mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenant.email && (
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-text-tertiary mr-3" />
                  <div>
                    <p className="text-sm text-text-secondary">Email</p>
                    <p className="font-semibold">{tenant.email}</p>
                  </div>
                </div>
              )}
              {tenant.mobile && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-text-tertiary mr-3" />
                  <div>
                    <p className="text-sm text-text-secondary">Mobile</p>
                    <p className="font-semibold">{tenant.mobile}</p>
                  </div>
                </div>
              )}
              {tenant.nationality && (
                <div className="flex items-center">
                  <Globe className="h-5 w-5 text-text-tertiary mr-3" />
                  <div>
                    <p className="text-sm text-text-secondary">Nationality</p>
                    <p className="font-semibold">{tenant.nationality}</p>
                  </div>
                </div>
              )}
              {tenant.employment_status && (
                <div className="flex items-center">
                  <Briefcase className="h-5 w-5 text-text-tertiary mr-3" />
                  <div>
                    <p className="text-sm text-text-secondary">Employment Status</p>
                    <p className="font-semibold">{tenant.employment_status}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* UAE Documents */}
          {(tenant.emirates_id || tenant.passport_number || tenant.visa_number) && (
            <div className="mb-8">
              <h2 className="text-xl font-heading font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary" />
                UAE Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenant.emirates_id && (
                  <div>
                    <p className="text-sm text-text-secondary">Emirates ID</p>
                    <p className="font-semibold">{tenant.emirates_id}</p>
                  </div>
                )}
                {tenant.passport_number && (
                  <div>
                    <p className="text-sm text-text-secondary">Passport Number</p>
                    <p className="font-semibold">{tenant.passport_number}</p>
                  </div>
                )}
                {tenant.visa_number && (
                  <div>
                    <p className="text-sm text-text-secondary">Visa Number</p>
                    <p className="font-semibold">{tenant.visa_number}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Address */}
          {(address.emirate || address.area || address.building || address.apartment) && (
            <div className="mb-8">
              <h2 className="text-xl font-heading font-semibold mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                Current Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {address.emirate && (
                  <div>
                    <p className="text-sm text-text-secondary">Emirate</p>
                    <p className="font-semibold">{address.emirate}</p>
                  </div>
                )}
                {address.area && (
                  <div>
                    <p className="text-sm text-text-secondary">Area</p>
                    <p className="font-semibold">{address.area}</p>
                  </div>
                )}
                {address.building && (
                  <div>
                    <p className="text-sm text-text-secondary">Building</p>
                    <p className="font-semibold">{address.building}</p>
                  </div>
                )}
                {address.apartment && (
                  <div>
                    <p className="text-sm text-text-secondary">Apartment/Unit</p>
                    <p className="font-semibold">{address.apartment}</p>
                  </div>
                )}
                {address.street && (
                  <div>
                    <p className="text-sm text-text-secondary">Street</p>
                    <p className="font-semibold">{address.street}</p>
                  </div>
                )}
                {address.poBox && (
                  <div>
                    <p className="text-sm text-text-secondary">P.O. Box</p>
                    <p className="font-semibold">{address.poBox}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Status */}
          <div className="pt-6 border-t border-border">
            <h2 className="text-xl font-heading font-semibold mb-4">Account Status</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Status</p>
                <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold ${
                  tenant.user_status === 'active' ? 'bg-accent-green text-white' :
                  tenant.user_status === 'suspended' ? 'bg-red-500 text-white' :
                  'bg-text-tertiary text-white'
                }`}>
                  {tenant.user_status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-secondary">Registration Source</p>
                <p className="font-semibold mt-1">
                  {tenant.registration_source === 'created_by_owner' ? 'Created by Owner' :
                   tenant.registration_source === 'mobile' ? 'Mobile Registration' :
                   tenant.registration_source === 'email' ? 'Email Registration' :
                   tenant.registration_source || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

