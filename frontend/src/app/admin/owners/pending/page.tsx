'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { adminAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Building2, Mail, Phone } from 'lucide-react'

export default function PendingOwnersPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [owners, setOwners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'admin') {
      router.push('/auth/login')
      return
    }
    loadPendingOwners()
  }, [isAuthenticated, user])

  const loadPendingOwners = async () => {
    try {
      const response = await adminAPI.getPendingOwners()
      setOwners(response.data.data.owners)
    } catch (error: any) {
      toast.error('Failed to load pending owners')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await adminAPI.approveOwner(id)
      toast.success('Property dealer approved!')
      loadPendingOwners()
    } catch (error: any) {
      toast.error('Failed to approve owner')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Are you sure you want to reject this property dealer?')) return

    try {
      await adminAPI.rejectOwner(id)
      toast.success('Property dealer rejected')
      loadPendingOwners()
    } catch (error: any) {
      toast.error('Failed to reject owner')
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
    <div className="min-h-screen bg-background-light">
      <header className="bg-white shadow-small">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-heading font-bold">Pending Property Dealers</h1>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {owners.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-text-secondary text-lg">No pending property dealers</p>
            <p className="text-text-tertiary mt-2">All dealers have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {owners.map((owner) => (
              <div key={owner.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Building2 className="h-5 w-5 text-primary mr-2" />
                      <h3 className="text-xl font-semibold">
                        {owner.company_name || `${owner.first_name} ${owner.last_name}`}
                      </h3>
                    </div>
                    <div className="space-y-1 text-sm text-text-secondary">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {owner.email}
                      </div>
                      {owner.mobile && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {owner.mobile}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Type:</span> {owner.owner_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(owner.id)}
                      className="btn-primary flex items-center"
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(owner.id)}
                      className="btn-secondary flex items-center border-accent-red text-accent-red hover:bg-accent-red hover:text-white"
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Reject
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

