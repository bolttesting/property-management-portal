'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { propertiesAPI } from '@/lib/api'
import PropertyCard from '@/components/PropertyCard'
import Navigation from '@/components/Navigation'
import { Search, Filter, SlidersHorizontal, Home } from 'lucide-react'
import toast from 'react-hot-toast'

function PropertiesPageContent() {
  const searchParams = useSearchParams()
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'rent' | 'sale' | 'all'>('all')
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    category: '',
    listingType: '',
  })

  useEffect(() => {
    // Initialize tab from URL params
    const listingTypeParam = searchParams.get('listingType')
    if (listingTypeParam === 'rent' || listingTypeParam === 'sale') {
      setActiveTab(listingTypeParam)
    }
  }, [searchParams])

  useEffect(() => {
    // Update listingType filter when tab changes
    if (activeTab === 'all') {
      setFilters(prev => ({ ...prev, listingType: '' }))
    } else {
      setFilters(prev => ({ ...prev, listingType: activeTab }))
    }
  }, [activeTab])

  useEffect(() => {
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      loadProperties()
    }, filters.search ? 500 : 0) // Wait 500ms if searching, otherwise immediate

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const loadProperties = async () => {
    try {
      setLoading(true)
      // Use search endpoint if there's a search query, otherwise use getAll
      const params: any = {
        status: filters.status || undefined,
        type: filters.type || undefined,
        category: filters.category || undefined,
        listingType: filters.listingType || undefined,
      }
      
      let response
      if (filters.search) {
        // Use search endpoint with query parameter
        params.q = filters.search
        response = await propertiesAPI.search(params)
      } else {
        // Use regular getAll endpoint
        response = await propertiesAPI.getAll(params)
      }
      
      setProperties(response.data.data.properties)
    } catch (error: any) {
      toast.error('Failed to load properties')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <Navigation />

      <div className="flex-1 container-custom py-8 md:py-12 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
            Browse Properties
          </h1>
          <p className="text-lg text-gray-600">
            Discover your perfect property in the UAE
          </p>
        </div>

        {/* Tabs for Rent/Sale/All */}
        <div className="mb-8">
          <div className="inline-flex gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-lg border border-gray-100">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2.5 font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'all'
                  ? 'text-white bg-gradient-to-r from-primary to-blue-600 shadow-lg'
                  : 'text-gray-600 hover:text-primary hover:bg-primary/5'
              }`}
            >
              All Properties
            </button>
            <button
              onClick={() => setActiveTab('rent')}
              className={`px-6 py-2.5 font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'rent'
                  ? 'text-white bg-gradient-to-r from-primary to-blue-600 shadow-lg'
                  : 'text-gray-600 hover:text-primary hover:bg-primary/5'
              }`}
            >
              For Rent
            </button>
            <button
              onClick={() => setActiveTab('sale')}
              className={`px-6 py-2.5 font-semibold rounded-lg transition-all duration-300 ${
                activeTab === 'sale'
                  ? 'text-white bg-gradient-to-r from-primary to-blue-600 shadow-lg'
                  : 'text-gray-600 hover:text-primary hover:bg-primary/5'
              }`}
            >
              For Sale
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="glass rounded-2xl shadow-xl p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by location, property type..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="input-field pl-12"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input-field min-w-[150px]"
                >
                  <option value="">All Status</option>
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="under_maintenance">Under Maintenance</option>
                </select>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="input-field min-w-[150px]"
                >
                  <option value="">All Types</option>
                  <option value="apartment">Apartment</option>
                  <option value="villa">Villa</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="office">Office</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Loading properties...</p>
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {properties.map((property, index) => (
              <div key={property.id} className="fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <PropertyCard property={property} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass rounded-2xl">
            <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 text-xl font-semibold mb-2">No properties found</p>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-primary-dark text-white py-12 mt-auto">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Home className="h-6 w-6 mr-2" />
                <span className="text-xl font-heading font-bold">Property UAE</span>
              </div>
              <p className="text-primary-light">
                Your trusted property management partner in the UAE
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-primary-light">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link href="/properties" className="hover:text-white transition-colors">Properties</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Owners</h4>
              <ul className="space-y-2 text-primary-light">
                <li><Link href="/auth/register?type=owner" className="hover:text-white transition-colors">Register</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Owner Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-primary-light">
                <li>Dubai, UAE</li>
                <li>
                  Email:{' '}
                  <a href="mailto:ahmad@logixcontact.com" className="hover:text-white transition-colors">
                    ahmad@logixcontact.com
                  </a>
                </li>
                <li>
                  Phone:{' '}
                  <a href="tel:+971524212189" className="hover:text-white transition-colors">
                    +971 524 212 189
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary mt-8 pt-8 text-center text-primary-light">
            <p>&copy; 2024 Property &amp; Tenancy Management UAE. All rights reserved.</p>
            <p className="mt-2">
              Designed and developed by{' '}
              <a href="https://muhammadahmad.io" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                Muhammad Ahmad
              </a>
              . Powered by{' '}
              <a href="https://logixcontact.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                Logix Contact
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <PropertiesPageContent />
    </Suspense>
  )
}

