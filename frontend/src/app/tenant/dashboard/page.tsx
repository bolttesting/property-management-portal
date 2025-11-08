'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { tenantAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Home, FileText, Wrench, Bell, 
  Search, Heart, Plus, LogOut, User as UserIcon, MessageCircle, ClipboardList
} from 'lucide-react'
import Link from 'next/link'
import DashboardNavigation from '@/components/DashboardNavigation'

export default function TenantDashboard() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [dashboard, setDashboard] = useState<any>(null)
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
      if (parsedUser.userType !== 'tenant') {
        router.push('/auth/login')
        return
      }
    } catch {
      router.push('/auth/login')
      return
    }
    
    // If authenticated, load dashboard
    if (isAuthenticated && user?.userType === 'tenant') {
      loadDashboard()
    }
  }, [hasHydrated, isAuthenticated, user, router])

  const loadDashboard = async () => {
    try {
      const response = await tenantAPI.getDashboard()
      setDashboard(response.data.data.dashboard)
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

  const tenantNavItems = [
    { href: '/tenant/dashboard', label: 'Dashboard' },
    { href: '/tenant/applications', label: 'Applications' },
    { href: '/tenant/favorites', label: 'Favorites' },
    { href: '/tenant/maintenance', label: 'Maintenance' },
    { href: '/tenant/move-permits', label: 'Move Permits' },
    { href: '/tenant/chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation userType="tenant" navItems={tenantNavItems} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
            Tenant Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Manage your property applications and leases
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <button
            onClick={() => router.push('/properties')}
            className="glass rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all duration-300 bg-white"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-gray-900">Search Properties</p>
          </button>
          <button
            onClick={() => router.push('/tenant/applications')}
            className="glass rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all duration-300 bg-white"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-gray-900">My Applications</p>
          </button>
          <button
            onClick={() => router.push('/tenant/favorites')}
            className="glass rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all duration-300 bg-white"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-gray-900">Favorites</p>
          </button>
          <button
            onClick={() => router.push('/tenant/maintenance')}
            className="glass rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all duration-300 bg-white"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-gray-900">Maintenance</p>
          </button>
          <button
            onClick={() => router.push('/tenant/move-permits')}
            className="glass rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-all duration-300 bg-white"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <p className="font-semibold text-gray-900">Move Permits</p>
          </button>
        </div>

        {/* Chat Section */}
        <div className="mb-8">
          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-2 gradient-text">Messages</h2>
                <p className="text-gray-600">Chat with property owners and dealers</p>
              </div>
              <button
                onClick={() => router.push('/tenant/chat')}
                className="btn-primary flex items-center gap-2"
              >
                <MessageCircle className="h-5 w-5" />
                Open Chat
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <h2 className="text-xl font-heading font-semibold mb-4">Recent Applications</h2>
            <div className="text-center py-8 text-gray-600">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No applications yet</p>
              <button
                onClick={() => router.push('/properties')}
                className="btn-primary mt-4"
              >
                Browse Properties
              </button>
            </div>
          </div>

          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <h2 className="text-xl font-heading font-semibold mb-4">Active Leases</h2>
            <div className="text-center py-8 text-gray-600">
              <Home className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active leases</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

