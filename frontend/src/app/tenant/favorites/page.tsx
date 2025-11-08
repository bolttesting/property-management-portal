'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { propertiesAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Heart, MapPin, Bed, Bath, Car, Ruler, Eye, Trash2, Home } from 'lucide-react'
import Link from 'next/link'
import PropertyCard from '@/components/PropertyCard'

export default function TenantFavoritesPage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated } = useAuthStore()
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'tenant') {
      router.push('/auth/login')
      return
    }

    loadFavorites()
  }, [hasHydrated, isAuthenticated, user, router])

  const loadFavorites = async () => {
    try {
      const response = await propertiesAPI.getFavorites()
      if (response.data?.success && response.data?.data?.properties) {
        setFavorites(response.data.data.properties)
      }
    } catch (error: any) {
      console.error('Failed to load favorites:', error)
      toast.error('Failed to load favorites')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (propertyId: string) => {
    try {
      await propertiesAPI.removeFromFavorites(propertyId)
      toast.success('Removed from favorites')
      loadFavorites() // Reload favorites
    } catch (error: any) {
      console.error('Failed to remove favorite:', error)
      toast.error('Failed to remove from favorites')
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
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/tenant/dashboard"
            className="flex items-center text-text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <Link
            href="/"
            className="btn-secondary flex items-center gap-2"
            title="Go to Homepage"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold mb-2 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            My Favorites
          </h1>
          <p className="text-text-secondary">Properties you've saved for later</p>
        </div>

        {favorites.length === 0 ? (
          <div className="card text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-text-tertiary opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-text-secondary mb-6">Start exploring properties and add them to your favorites</p>
            <Link href="/properties" className="btn-primary">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((property) => (
              <div key={property.id} className="relative">
                <PropertyCard property={property} />
                <button
                  onClick={() => handleRemoveFavorite(property.id)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-medium hover:bg-red-50 text-red-500 transition-colors"
                  title="Remove from favorites"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

