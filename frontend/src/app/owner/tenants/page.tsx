'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { ownerAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Users, ArrowLeft, Mail, Phone, Edit, Eye, MessageCircle } from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

export default function TenantsPage() {
  const router = useRouter()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

    if (isAuthenticated && user?.userType === 'owner') {
      loadTenants()
    }
  }, [hasHydrated, isAuthenticated, user, router])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const response = await ownerAPI.getTenants()
      console.log('Tenants API response:', response.data)
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response structure from server')
      }

      const tenantsData = response.data.data.tenants || []
      console.log('Loaded tenants:', tenantsData)
      
      // Verify each tenant has an ID
      tenantsData.forEach((tenant: any, index: number) => {
        if (!tenant.id) {
          console.error(`Tenant at index ${index} is missing ID:`, tenant)
        }
      })
      
      setTenants(tenantsData)
    } catch (error: any) {
      console.error('Failed to load tenants:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message ||
                          'Failed to load tenants'
      toast.error(errorMessage)
      setTenants([])
    } finally {
      setLoading(false)
    }
  }

  if (!hasHydrated || loading) {
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
              My Tenants
            </h1>
            <p className="text-lg text-gray-600">
              View and manage all your tenants
            </p>
          </div>
          <button
            onClick={() => router.push('/owner/tenants/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Tenant</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {tenants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((tenant, index) => (
              <div key={tenant.id || tenant.user_id || `tenant-${index}`} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-primary-light rounded-full p-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        try {
                          console.log('View button clicked for tenant:', tenant)
                          const tenantId = tenant.id || tenant.user_id
                          if (!tenantId) {
                            console.error('Tenant ID is missing. Full tenant object:', JSON.stringify(tenant, null, 2))
                            toast.error('Tenant ID not found. Please refresh the page.')
                            return
                          }
                          console.log('Navigating to tenant view:', tenantId)
                          await router.push(`/owner/tenants/${tenantId}`)
                        } catch (error) {
                          console.error('Navigation error:', error)
                          toast.error('Failed to navigate to tenant view')
                        }
                      }}
                      className="text-text-secondary hover:text-primary transition-colors p-1"
                      title="View Tenant"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation()
                        e.preventDefault()
                        try {
                          console.log('Edit button clicked for tenant:', tenant)
                          const tenantId = tenant.id || tenant.user_id
                          if (!tenantId) {
                            console.error('Tenant ID is missing. Full tenant object:', JSON.stringify(tenant, null, 2))
                            toast.error('Tenant ID not found. Please refresh the page.')
                            return
                          }
                          console.log('Navigating to tenant edit:', tenantId)
                          await router.push(`/owner/tenants/${tenantId}/edit`)
                        } catch (error) {
                          console.error('Navigation error:', error)
                          toast.error('Failed to navigate to tenant edit')
                        }
                      }}
                      className="text-text-secondary hover:text-primary transition-colors p-1"
                      title="Edit Tenant"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div 
                  onClick={async () => {
                    try {
                      const tenantId = tenant.id || tenant.user_id
                      if (tenantId) {
                        await router.push(`/owner/tenants/${tenantId}`)
                      } else {
                        console.error('Tenant ID is missing when clicking card. Full tenant object:', JSON.stringify(tenant, null, 2))
                        toast.error('Tenant ID not found. Please refresh the page.')
                      }
                    } catch (error) {
                      console.error('Navigation error:', error)
                      toast.error('Failed to navigate to tenant view')
                    }
                  }}
                  className="cursor-pointer"
                >
                  <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors">{tenant.full_name}</h3>
                </div>
                <div className="space-y-2 text-sm text-text-secondary">
                  {tenant.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{tenant.email}</span>
                    </div>
                  )}
                  {tenant.mobile && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{tenant.mobile}</span>
                    </div>
                  )}
                  {tenant.nationality && (
                    <div>
                      <span className="font-medium">Nationality: </span>
                      {tenant.nationality}
                    </div>
                  )}
                  {tenant.employment_status && (
                    <div>
                      <span className="font-medium">Employment: </span>
                      {tenant.employment_status}
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Profile Completion</span>
                    <span className="font-semibold">{tenant.profile_completion || 0}%</span>
                  </div>
                  <div className="w-full bg-background-gray rounded-full h-2 mt-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${tenant.profile_completion || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Users className="h-16 w-16 mx-auto text-text-tertiary mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Tenants Yet</h3>
            <p className="text-text-secondary mb-6">
              Start by adding your first tenant account
            </p>
            <button
              onClick={() => router.push('/owner/tenants/new')}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2 inline" />
              Add First Tenant
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

