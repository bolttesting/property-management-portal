'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { adminAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Users, Building2, Home, FileText, 
  TrendingUp, Clock, CheckCircle, XCircle, LogOut, User as UserIcon, MessageSquare
} from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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
      if (parsedUser.userType !== 'admin') {
        router.push('/auth/login')
        return
      }
    } catch {
      router.push('/auth/login')
      return
    }
    
    // If authenticated, load dashboard
    if (isAuthenticated && user?.userType === 'admin') {
      loadDashboard()
    }
  }, [hasHydrated, isAuthenticated, user, router])

  const loadDashboard = async () => {
    try {
      const response = await adminAPI.getDashboard()
      setStats(response.data.data.dashboard.statistics)
    } catch (error: any) {
      toast.error('Failed to load dashboard')
    } finally {
      setLoading(false)
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

  const adminNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/owners', label: 'Property Dealers' },
    { href: '/admin/properties', label: 'Properties' },
    { href: '/admin/applications', label: 'Applications' },
    { href: '/admin/tenants', label: 'Tenants' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation userType="admin" navItems={adminNavItems} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
            Admin Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage the entire property management system
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm mb-1">Property Dealers</p>
                <p className="text-3xl font-bold text-text-primary">{stats?.totalPropertyDealers || 0}</p>
                <p className="text-xs text-text-tertiary mt-1">
                  {stats?.pendingPropertyDealers || 0} pending
                </p>
              </div>
              <div className="bg-primary-light rounded-full p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Properties</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalProperties || 0}</p>
              </div>
              <div className="bg-primary/10 rounded-full p-3">
                <Home className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Tenants</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalTenants || 0}</p>
              </div>
              <div className="bg-primary/10 rounded-full p-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Applications</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalApplications || 0}</p>
              </div>
              <div className="bg-primary/10 rounded-full p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <h2 className="text-xl font-heading font-semibold mb-4">Pending Approvals</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/admin/owners/pending')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-orange-500 mr-3" />
                  <span className="font-medium">Property Dealers ({stats?.pendingPropertyDealers || 0})</span>
                </div>
                <span className="text-primary font-semibold">View →</span>
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <h2 className="text-xl font-heading font-semibold mb-4">Quick Links</h2>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/admin/properties')}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                View All Properties
              </button>
              <button
                onClick={() => router.push('/admin/applications')}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                View All Applications
              </button>
              <button
                onClick={() => router.push('/admin/owners')}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Manage Property Dealers
              </button>
              <button
                onClick={() => router.push('/admin/contact-messages')}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Contact Messages
              </button>
              <button
                onClick={() => router.push('/admin/tenants')}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                View All Tenants
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

