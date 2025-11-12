'use client'

import Link from 'next/link'
import { MapPin, Bed, Bath, Heart, Share2, Car } from 'lucide-react'

interface PropertyCardProps {
  property: {
    id: string
    property_name: string
    address: any
    price: number
    status: string
    property_type: string
    category?: string
    primary_image?: string
    listing_type?: 'rent' | 'sale'
  }
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const location = property.address?.location || property.address?.area || 'UAE'
  const statusColors: Record<string, string> = {
    vacant: 'bg-accent-green text-white',
    occupied: 'bg-accent-orange text-white',
    under_maintenance: 'bg-accent-red text-white',
    unavailable: 'bg-text-tertiary text-white',
  }

  // Helper function to get image URL
  const getImageUrl = (imageUrl: string | undefined | null): string => {
    if (!imageUrl) {
      console.log('PropertyCard: No image URL provided')
      return ''
    }
    // If URL already includes http, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('PropertyCard: Image URL already absolute:', imageUrl)
      return imageUrl
    }
    // Otherwise, prepend backend URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'
    const backendUrl = apiUrl.replace('/api/v1', '') || 'http://localhost:5000'
    const fullUrl = `${backendUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
    console.log('PropertyCard: Constructed image URL:', {
      original: imageUrl,
      apiUrl,
      backendUrl,
      fullUrl
    })
    return fullUrl
  }

  return (
    <div className="property-card fade-in">
      {/* Image Container */}
      <div className="relative h-48 sm:h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {property.primary_image ? (
          <img
            src={getImageUrl(property.primary_image)}
            alt={property.property_name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
            loading="lazy"
            onError={(e) => {
              console.error('PropertyCard image load error:', {
                attemptedUrl: e.currentTarget.src,
                imageUrl: property.primary_image,
                propertyId: property.id,
                error: 'Image failed to load'
              })
              // Hide the image and show placeholder
              e.currentTarget.style.display = 'none'
              e.currentTarget.onerror = null
              const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
              if (placeholder) {
                placeholder.style.display = 'flex'
              }
            }}
            onLoad={(e) => {
              console.log('PropertyCard image loaded successfully:', e.currentTarget.src)
              // Hide placeholder when image loads
              const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder') as HTMLElement
              if (placeholder) {
                placeholder.style.display = 'none'
              }
            }}
          />
        ) : null}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Placeholder - shown when no image or image fails to load */}
        <div 
          className="image-placeholder absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 z-0"
          style={{ display: property.primary_image ? 'none' : 'flex' }}
        >
          <div className="text-center">
            <MapPin className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-2" />
            <p className="text-xs sm:text-sm text-gray-500">No Image</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-10">
          <button className="bg-white/95 backdrop-blur-sm hover:bg-white rounded-full p-2 sm:p-2.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 hover:text-red-500 transition-colors" />
          </button>
          <button className="bg-white/95 backdrop-blur-sm hover:bg-white rounded-full p-2 sm:p-2.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10">
          <span className={`text-xs px-3 py-1 sm:px-4 sm:py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-sm ${statusColors[property.status] || 'bg-gray-700 text-white'}`}>
            {property.status.charAt(0).toUpperCase() + property.status.slice(1).replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 bg-white">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors duration-300 flex-1 pr-2">
            {property.property_name}
          </h3>
          <div className="text-right flex-shrink-0">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-accent-gold to-yellow-500 bg-clip-text text-transparent">
              AED {property.price.toLocaleString()}
            </span>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {property.listing_type === 'sale' ? 'for sale' : 'per month'}
            </p>
          </div>
        </div>

        <div className="flex items-center text-gray-600 text-sm mb-4">
          <MapPin className="h-4 w-4 mr-1.5 text-primary flex-shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Property Specifications */}
        {(property.address?.bedrooms || property.address?.bathrooms || property.address?.area || property.address?.parkingSpaces) && (
          <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-100">
            {property.address?.bedrooms && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                <Bed className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">{property.address.bedrooms}</span>
              </div>
            )}
            {property.address?.bathrooms && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                <Bath className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">{property.address.bathrooms}</span>
              </div>
            )}
            {property.address?.area && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">{property.address.area} {property.address.areaUnit || 'sqft'}</span>
              </div>
            )}
            {property.address?.parkingSpaces && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg">
                <Car className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">{property.address.parkingSpaces}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800 capitalize">
              {property.property_type}
            </span>
            {property.category && (
              <span className="text-xs text-gray-500 capitalize mt-0.5">
                {property.category}
              </span>
            )}
          </div>
          <Link
            href={`/properties/${property.id}`}
            className="flex items-center gap-1 text-primary font-semibold hover:gap-2 transition-all duration-300 text-sm group/link"
          >
            View Details
            <span className="group-hover/link:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

