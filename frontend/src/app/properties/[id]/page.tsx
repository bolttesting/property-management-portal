'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { propertiesAPI, viewingsAPI, applicationsAPI, chatAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { MapPin, Bed, Bath, Car, Heart, Share2, ArrowLeft, Calendar, Ruler, ChevronLeft, ChevronRight, Phone, Mail, X, User, Home, MessageCircle, FileText, CheckCircle, Video, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function PropertyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuthStore()
  const [property, setProperty] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [userApplication, setUserApplication] = useState<any>(null)
  const [activeLease, setActiveLease] = useState<any>(null)
  const [rentPayments, setRentPayments] = useState<any[]>([])
  const [showViewingModal, setShowViewingModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showLeaseDetails, setShowLeaseDetails] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [viewingForm, setViewingForm] = useState({
    viewingDate: '',
    viewingTime: '',
    notes: '',
  })
  const [applyForm, setApplyForm] = useState({
    offerAmount: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const ownerUserId = property?.owner_user_id

  const handleMessageOwner = async () => {
    if (!isAuthenticated || user?.userType !== 'tenant') {
      toast.error('Please login as a tenant to send messages')
      router.push('/auth/login')
      return
    }

    if (!ownerUserId) {
      toast.error('Dealer is not available for chat')
      return
    }

    try {
      const response = await chatAPI.getOrCreateRoom({
        recipientId: ownerUserId,
        recipientType: 'owner',
        roomType: 'owner_tenant',
      })
      const roomId = response.data?.data?.roomId
      if (roomId) {
        toast.success('Chat opened with property dealer')
        router.push(`/tenant/chat?roomId=${roomId}`)
      } else {
        toast.error('Unable to open chat with dealer')
      }
    } catch (error: any) {
      console.error('Failed to open chat:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to open chat with dealer')
    }
  }

  useEffect(() => {
    if (params.id) {
      loadProperty()
      checkFavoriteStatus()
    }
  }, [params.id, isAuthenticated])

  const checkFavoriteStatus = async () => {
    if (!isAuthenticated || !params.id || typeof params.id !== 'string') {
      setIsFavorite(false)
      return
    }

    try {
      // Check if property is in favorites by fetching favorites list
      const response = await propertiesAPI.getFavorites()
      if (response.data?.success && response.data?.data?.properties) {
        const favoriteIds = response.data.data.properties.map((p: any) => p.id)
        setIsFavorite(favoriteIds.includes(params.id))
      }
    } catch (error) {
      // If error, assume not favorite
      console.error('Failed to check favorite status:', error)
      setIsFavorite(false)
    }
  }

  const loadProperty = async () => {
    try {
      if (!params.id || typeof params.id !== 'string') {
        throw new Error('Invalid property ID')
      }
      const response = await propertiesAPI.getById(params.id)
      if (response.data?.success && response.data?.data?.property) {
        setProperty(response.data.data.property)
        // Load images if available
        if (response.data.data.images && Array.isArray(response.data.data.images)) {
          setImages(response.data.data.images)
        }
        // Set user application status if available
        if (response.data.data.userApplication) {
          setUserApplication(response.data.data.userApplication)
        }
        // Set active lease if available
        if (response.data.data.activeLease) {
          setActiveLease(response.data.data.activeLease)
        }
      if (response.data.data.rentPayments) {
        setRentPayments(response.data.data.rentPayments)
      } else {
        setRentPayments([])
      }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      console.error('Failed to load property:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to load property'
      toast.error(errorMessage)
      // Don't redirect immediately - let user see the error
      setTimeout(() => {
        router.push('/properties')
      }, 2000)
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

  if (!property) return null

  const address = property.address || {}
  
  // Helper function to check if a value exists
  const hasValue = (val: any): boolean => {
    if (val === null || val === undefined) return false
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (trimmed === '') return false
      const num = parseFloat(trimmed)
      return !isNaN(num) && isFinite(num)
    }
    if (typeof val === 'number') return !isNaN(val) && isFinite(val)
    if (typeof val === 'boolean') return true
    return Boolean(val)
  }

  // Helper function to get image URL
  const getImageUrl = (imageUrl: string | undefined | null): string => {
    if (!imageUrl) return ''
    // If URL already includes http, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }
    // Otherwise, prepend backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'
    return `${backendUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`
  }

  const primaryImage = images.find((img: any) => img.is_primary) || images[0]

  const getDocumentUrl = (url: string | undefined | null): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'
    return `${backendUrl}${url.startsWith('/') ? url : '/' + url}`
  }

  // Handle Schedule Viewing
  const handleScheduleViewing = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!isAuthenticated || !user) {
      toast.error('Please login to schedule a viewing')
      if (typeof window !== 'undefined') {
        router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
      } else {
        router.push('/auth/login')
      }
      return
    }

    if (user.userType !== 'tenant') {
      toast.error('Only tenants can schedule viewings')
      return
    }

    if (!params?.id || typeof params.id !== 'string') {
      toast.error('Invalid property ID')
      return
    }

    if (!viewingForm.viewingDate || !viewingForm.viewingTime) {
      toast.error('Please select date and time')
      return
    }

    setSubmitting(true)
    try {
      const response = await viewingsAPI.create({
        propertyId: params.id,
        viewingDate: viewingForm.viewingDate,
        viewingTime: viewingForm.viewingTime,
        notes: viewingForm.notes || '',
      })
      
      if (response.data?.success) {
        toast.success('Viewing scheduled successfully!')
        setShowViewingModal(false)
        setViewingForm({ viewingDate: '', viewingTime: '', notes: '' })
      } else {
        throw new Error(response.data?.message || 'Failed to schedule viewing')
      }
    } catch (error: any) {
      console.error('Schedule viewing error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to schedule viewing'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Apply Now
  const handleApplyNow = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!isAuthenticated) {
      toast.error('Please login to apply for this property')
      if (typeof window !== 'undefined') {
        router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
      } else {
        router.push('/auth/login')
      }
      return
    }

    if (!params?.id || typeof params.id !== 'string') {
      toast.error('Invalid property ID')
      return
    }

    if (user?.userType !== 'tenant') {
      toast.error('Only tenants can apply for properties')
      return
    }

    // Validate offer amount if provided
    if (applyForm.offerAmount) {
      const offerAmount = parseFloat(applyForm.offerAmount)
      if (isNaN(offerAmount) || offerAmount <= 0) {
        toast.error('Please enter a valid offer amount')
        return
      }
    }

    // Check if already applied
    if (userApplication) {
      if (userApplication.status === 'approved') {
        toast.error('You have already been approved for this property')
        return
      } else {
        toast.error('You have already applied for this property')
        return
      }
    }

    // Check if property is occupied
    if (property?.status === 'occupied') {
      toast.error('This property is already leased and not accepting new applications')
      return
    }

    setSubmitting(true)
    try {
      await applicationsAPI.create({
        propertyId: params.id,
        applicantInfo: {
          name: user.email || 'Tenant',
        },
        offerAmount: applyForm.offerAmount ? parseFloat(applyForm.offerAmount) : null,
      })
      toast.success('Application submitted successfully!')
      // Reset form and close modal
      setApplyForm({ offerAmount: '' })
      setShowApplyModal(false)
      // Reload property to get updated application status
      loadProperty()
    } catch (error: any) {
      console.error('Apply now error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to submit application'
      
      // If error is about missing Emirates ID or passport, redirect to profile
      if (errorMessage.includes('Emirates ID is required') || errorMessage.includes('Passport number is required')) {
        toast.error(errorMessage)
        setTimeout(() => {
          router.push('/tenant/profile')
        }, 2000)
        return
      }
      
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Favorite
  const handleFavorite = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Please login to add to favorites')
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    if (user.userType !== 'tenant') {
      toast.error('Only tenants can add to favorites')
      return
    }

    if (!params.id || typeof params.id !== 'string') {
      toast.error('Invalid property ID')
      return
    }

    try {
      if (isFavorite) {
        await propertiesAPI.removeFromFavorites(params.id)
        setIsFavorite(false)
        toast.success('Removed from favorites')
      } else {
        await propertiesAPI.addToFavorites(params.id)
        setIsFavorite(true)
        toast.success('Added to favorites')
      }
    } catch (error: any) {
      console.error('Favorite error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to update favorites'
      toast.error(errorMessage)
    }
  }

  // Handle Share
  const handleShare = async () => {
    if (typeof window === 'undefined' || !navigator) return
    
    try {
      const url = window.location.href
      if (navigator.share && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: property?.property_name || 'Property',
            text: `Check out this property: ${property?.property_name}`,
            url: url,
          })
        } catch (error: any) {
          // User cancelled or error occurred - ignore silently
          if (error?.name !== 'AbortError') {
            console.error('Share error:', error)
          }
        }
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        // Fallback: Copy to clipboard
        try {
          await navigator.clipboard.writeText(url)
          toast.success('Link copied to clipboard!')
        } catch (error) {
          console.error('Clipboard error:', error)
          toast.error('Failed to copy link')
        }
      } else {
        // Final fallback: Show URL in alert
        toast.success(`Share this link: ${url}`)
      }
    } catch (error) {
      console.error('Share handler error:', error)
    }
  }

  // Get owner contact info
  const ownerName = property?.company_name || 
    (property?.first_name && property?.last_name 
      ? `${property.first_name} ${property.last_name}` 
      : 'Property Dealer')
  const ownerEmail = property?.owner_email
  const ownerMobile = property?.owner_mobile

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />

      <div className="container-custom py-8 md:py-12">
        <button
          onClick={() => {
            router.push('/properties')
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-primary font-semibold mb-8 transition-colors duration-300 group"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Back to Properties
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Images */}
            <div className="glass rounded-2xl shadow-xl overflow-hidden mb-8">
              {images.length > 0 ? (
                <div>
                  {/* Main Image */}
                  <div className="relative h-[500px] md:h-[600px] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden group">
                    <img
                      src={getImageUrl(images[selectedImageIndex]?.image_url || primaryImage?.image_url || images[0]?.image_url)}
                      alt={property.property_name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        console.error('Main image load error:', {
                          attemptedUrl: e.currentTarget.src,
                          imageUrl: images[selectedImageIndex]?.image_url || primaryImage?.image_url || images[0]?.image_url,
                          imagesArray: images
                        })
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.onerror = null
                      }}
                      onLoad={(e) => {
                        console.log('Main image loaded successfully:', e.currentTarget.src)
                      }}
                    />
                    {images.length > 1 && (
                      <>
                        {/* Navigation Arrows */}
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full p-3 shadow-xl hover:shadow-2xl transition-all duration-300 z-10 hover:scale-110"
                        >
                          <ChevronLeft className="h-6 w-6 text-gray-800" />
                        </button>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/95 backdrop-blur-sm hover:bg-white rounded-full p-3 shadow-xl hover:shadow-2xl transition-all duration-300 z-10 hover:scale-110"
                        >
                          <ChevronRight className="h-6 w-6 text-gray-800" />
                        </button>
                        {/* Image Counter */}
                        <div className="absolute bottom-6 right-6 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                          {selectedImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="p-4 bg-white border-t border-gray-100">
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {images.map((img: any, index: number) => (
                          <button
                            key={img.id || index}
                            onClick={() => setSelectedImageIndex(index)}
                            className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                              selectedImageIndex === index
                                ? 'border-primary shadow-lg ring-2 ring-primary/20'
                                : 'border-gray-200 hover:border-primary/50'
                            }`}
                          >
                            <img
                              src={getImageUrl(img.image_url)}
                              alt={`${property.property_name} ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Thumbnail load error:', {
                                  attemptedUrl: e.currentTarget.src,
                                  imageUrl: img.image_url,
                                  imageId: img.id
                                })
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.onerror = null
                              }}
                              onLoad={(e) => {
                                console.log('Thumbnail loaded successfully:', e.currentTarget.src)
                              }}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[500px] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No images available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="glass rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-4 text-gray-900">{property.property_name}</h1>
                  <div className="flex items-center text-gray-600 text-lg">
                    <MapPin className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                    <span>
                      {address.building_name && `${address.building_name}, `}
                      {address.apartment_no && `Unit ${address.apartment_no}, `}
                      {address.street && `${address.street}, `}
                      {address.community && `${address.community}, `}
                      {address.location || address.area || 'UAE'}
                      {address.emirate && `, ${address.emirate}`}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-accent-gold to-yellow-500 bg-clip-text text-transparent">
                    AED {property.price?.toLocaleString()}
                  </p>
                  <p className="text-base text-gray-600 font-medium mt-1">
                    {property.listing_type === 'sale' ? 'for sale' : 'per month'}
                  </p>
                  <span className={`inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-bold shadow-md ${
                    property.status === 'occupied' ? 'bg-accent-green text-white' :
                    property.status === 'vacant' ? 'bg-accent-gold text-white' :
                    property.status === 'under_maintenance' ? 'bg-orange-500 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {property.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Property Specifications */}
              {(address.bedrooms || address.bathrooms || address.area || address.parkingSpaces || property.property_type || property.category) && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h2 className="text-xl font-heading font-semibold mb-4">Property Specifications</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {property.property_type && (
                      <div>
                        <p className="text-sm text-text-secondary">Property Type</p>
                        <p className="font-semibold capitalize">{property.property_type}</p>
                      </div>
                    )}
                    {property.category && (
                      <div>
                        <p className="text-sm text-text-secondary">Category</p>
                        <p className="font-semibold capitalize">{property.category}</p>
                      </div>
                    )}
                    {hasValue(address.bedrooms) && (
                      <div className="flex items-center">
                        <Bed className="h-5 w-5 text-primary mr-2" />
                        <div>
                          <p className="text-sm text-text-secondary">Bedrooms</p>
                          <p className="font-semibold">{address.bedrooms}</p>
                        </div>
                      </div>
                    )}
                    {hasValue(address.bathrooms) && (
                      <div className="flex items-center">
                        <Bath className="h-5 w-5 text-primary mr-2" />
                        <div>
                          <p className="text-sm text-text-secondary">Bathrooms</p>
                          <p className="font-semibold">{address.bathrooms}</p>
                        </div>
                      </div>
                    )}
                    {hasValue(address.area) && (
                      <div className="flex items-center">
                        <Ruler className="h-5 w-5 text-primary mr-2" />
                        <div>
                          <p className="text-sm text-text-secondary">Area</p>
                          <p className="font-semibold">{address.area} {address.areaUnit || 'sqft'}</p>
                        </div>
                      </div>
                    )}
                    {hasValue(address.parkingSpaces) && (
                      <div className="flex items-center">
                        <Car className="h-5 w-5 text-primary mr-2" />
                        <div>
                          <p className="text-sm text-text-secondary">Parking</p>
                          <p className="font-semibold">{address.parkingSpaces}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Additional Details */}
                  {(hasValue(address.floorNumber) || hasValue(address.totalFloors) || hasValue(address.yearBuilt) || address.furnished !== undefined) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                      {(hasValue(address.floorNumber) || hasValue(address.totalFloors)) && (
                        <div>
                          <p className="text-sm text-text-secondary">Floor</p>
                          <p className="font-semibold">
                            {address.floorNumber || 'N/A'}
                            {address.totalFloors && ` of ${address.totalFloors}`}
                          </p>
                        </div>
                      )}
                      {hasValue(address.yearBuilt) && (
                        <div>
                          <p className="text-sm text-text-secondary">Year Built</p>
                          <p className="font-semibold">{address.yearBuilt}</p>
                        </div>
                      )}
                      {address.furnished !== undefined && (
                        <div>
                          <p className="text-sm text-text-secondary">Furnished</p>
                          <p className="font-semibold">{address.furnished ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Features */}
              {property.features && property.features.length > 0 && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="text-lg font-semibold mb-3">Features & Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.features.map((feature: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-background-gray text-text-primary rounded-full text-sm"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6">
                <h2 className="text-xl font-heading font-semibold mb-4">Description</h2>
                <p className="text-text-secondary">{property.description || 'No description available'}</p>
              </div>

              {activeLease && (
                <div className="mt-8 pt-6 border-t border-border space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-heading font-semibold">Lease Documents & Payments</h3>
                      <p className="text-sm text-text-secondary">Access your signed contract and upcoming rent instalments.</p>
                    </div>
                    {activeLease.contract_document_url && (
                      <a
                        href={getDocumentUrl(activeLease.contract_document_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View Contract
                      </a>
                    )}
                  </div>

                  {!activeLease.contract_document_url && (
                    <div className="flex items-start gap-2 text-sm text-text-secondary bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <p>The property dealer has not uploaded the signed contract yet. You can still review your rent instalments below.</p>
                    </div>
                  )}

                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-md font-semibold mb-4">Rent Instalments</h4>
                    {rentPayments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-text-secondary">
                              <th className="py-2">#</th>
                              <th className="py-2">Due Date</th>
                              <th className="py-2">Amount</th>
                              <th className="py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rentPayments.map((payment) => (
                              <tr key={payment.id} className="border-t border-gray-100">
                                <td className="py-2 font-medium">{payment.installment_number || '-'}</td>
                                <td className="py-2">{payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '-'}</td>
                                <td className="py-2 font-semibold text-text-primary">AED {Number(payment.amount || 0).toLocaleString()}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    payment.payment_status === 'paid'
                                      ? 'bg-green-100 text-green-700'
                                      : payment.payment_status === 'overdue'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {payment.payment_status?.replace('_', ' ') || 'pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary">No rent instalments available yet.</p>
                    )}
                  </div>
                </div>
              )}

              {property.virtual_tour_url && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="text-lg font-heading font-semibold mb-4 flex items-center">
                    <Video className="h-5 w-5 mr-2 text-primary" />
                    Virtual Tour
                  </h3>
                  <div className="aspect-video rounded-2xl overflow-hidden shadow-lg">
                    {property.virtual_tour_url.includes('youtube.com') || property.virtual_tour_url.includes('youtu.be') ? (
                      <iframe
                        src={property.virtual_tour_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : property.virtual_tour_url.includes('vimeo.com') ? (
                      <iframe
                        src={property.virtual_tour_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={property.virtual_tour_url}
                        controls
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="glass rounded-2xl shadow-xl p-6 sticky top-24 space-y-4 border border-gray-100/50">
              <button 
                onClick={() => setShowViewingModal(true)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Calendar className="h-5 w-5" />
                <span>Schedule Viewing</span>
              </button>
              {userApplication ? (
                <div className="space-y-3">
                  <button 
                    disabled
                    className="w-full px-4 py-3 rounded-xl font-semibold bg-green-50 text-green-700 border border-green-200 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {userApplication.status === 'approved' 
                      ? '✓ Application Approved' 
                      : userApplication.status === 'pending'
                      ? '⏳ Application Pending'
                      : userApplication.status === 'under_review'
                      ? '🔍 Under Review'
                      : '✓ Already Applied'}
                  </button>
                  {userApplication.status === 'approved' && activeLease && (
                    <button
                      onClick={() => setShowLeaseDetails(true)}
                      className="btn-primary w-full"
                    >
                      <span>View Lease Details</span>
                    </button>
                  )}
                </div>
              ) : property?.status === 'occupied' ? (
                <button 
                  disabled
                  className="w-full px-4 py-3 rounded-xl font-semibold bg-gray-100 text-gray-600 border border-gray-200 cursor-not-allowed"
                >
                  Property Leased
                </button>
              ) : (
                <button 
                  onClick={() => setShowApplyModal(true)}
                  disabled={submitting || !isAuthenticated || user?.userType !== 'tenant'}
                  className="btn-secondary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Now
                </button>
              )}
              <div className="flex gap-3">
                <button 
                  onClick={handleFavorite}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                    isFavorite 
                      ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100' 
                      : 'bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100 hover:border-red-200'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                  Favorite
                </button>
                <button 
                  onClick={handleShare}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-gray-50 text-gray-700 border-2 border-gray-200 hover:bg-gray-100 hover:border-primary/50 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-5 w-5" />
                  Share
                </button>
              </div>
              
              {/* Contact Owner Section */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Contact Property Dealer</h3>
                <div className="space-y-3">
                  {ownerName && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{ownerName}</span>
                    </div>
                  )}
                  {ownerEmail && (
                    <a 
                      href={`mailto:${ownerEmail}`}
                      className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-primary group-hover:underline">{ownerEmail}</span>
                    </a>
                  )}
                  {ownerMobile && (
                    <a 
                      href={`tel:${ownerMobile}`}
                      className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="text-sm font-medium text-green-700 group-hover:underline">{ownerMobile}</span>
                    </a>
                  )}
                  {isAuthenticated && user?.userType === 'tenant' && ownerUserId && (
                    <button
                      onClick={handleMessageOwner}
                      className="w-full flex items-center gap-3 p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                        <MessageCircle className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-sm font-medium text-indigo-700">Message Dealer</span>
                    </button>
                  )}
                  {(!ownerEmail && !ownerMobile) && (
                    <button
                      onClick={() => setShowContactModal(true)}
                      className="btn-ghost w-full text-sm"
                    >
                      Contact Dealer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Viewing Modal */}
      {showViewingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-8 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-heading font-bold gradient-text">Schedule Viewing</h2>
              <button
                onClick={() => setShowViewingModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleScheduleViewing} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={viewingForm.viewingDate}
                  onChange={(e) => setViewingForm({ ...viewingForm, viewingDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={viewingForm.viewingTime}
                  onChange={(e) => setViewingForm({ ...viewingForm, viewingTime: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={viewingForm.notes}
                  onChange={(e) => setViewingForm({ ...viewingForm, notes: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Any special requests or questions..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowViewingModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !viewingForm.viewingDate || !viewingForm.viewingTime}
                  className="btn-primary flex-1"
                >
                  <span>{submitting ? 'Scheduling...' : 'Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lease Details Modal */}
      {showLeaseDetails && activeLease && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-large shadow-xlarge max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-heading font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Lease Details
              </h2>
              <button
                onClick={() => setShowLeaseDetails(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Lease Active</span>
                </div>
                <p className="text-sm text-green-700">
                  Congratulations! Your application has been approved and the lease is now active.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Lease Start Date</p>
                  <p className="font-semibold">
                    {new Date(activeLease.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Lease End Date</p>
                  <p className="font-semibold">
                    {new Date(activeLease.end_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Monthly Rent</p>
                  <p className="font-semibold text-accent-gold">
                    AED {activeLease.rent_amount?.toLocaleString()}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Security Deposit</p>
                  <p className="font-semibold">
                    AED {activeLease.security_deposit?.toLocaleString()}
                  </p>
                </div>
                {activeLease.ejari_number && (
                  <div>
                    <p className="text-sm text-text-secondary mb-1">Ejari Number</p>
                    <p className="font-semibold">{activeLease.ejari_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-text-secondary mb-1">Ejari Status</p>
                  <p className="font-semibold capitalize">
                    {activeLease.ejari_status || 'Pending'}
                  </p>
                </div>
              </div>

              {activeLease.terms && (
                <div>
                  <p className="text-sm text-text-secondary mb-2">Terms & Conditions</p>
                  <div className="p-4 bg-background-gray rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {typeof activeLease.terms === 'string' 
                        ? activeLease.terms 
                        : JSON.stringify(activeLease.terms, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-border">
                <button
                  onClick={() => setShowLeaseDetails(false)}
                  className="btn-primary flex-1"
                >
                  <span>Close</span>
                </button>
                <Link
                  href="/tenant/dashboard"
                  className="btn-secondary flex-1 text-center"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal (if no email/phone) */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-large shadow-xlarge max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-heading font-bold">Contact Information</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-text-secondary">
                To contact the property dealer, please use the application form or schedule a viewing.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowContactModal(false)
                    setShowViewingModal(true)
                  }}
                  className="btn-primary flex-1"
                >
                  <span>Schedule Viewing</span>
                </button>
                <button
                  onClick={() => {
                    setShowContactModal(false)
                    setShowApplyModal(true)
                  }}
                  className="btn-secondary flex-1"
                >
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Now Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="glass rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-heading font-bold gradient-text">Apply for Property</h2>
              <button
                onClick={() => {
                  setShowApplyModal(false)
                  setApplyForm({ offerAmount: '' })
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleApplyNow} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Offer Amount (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">AED</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={applyForm.offerAmount}
                    onChange={(e) => setApplyForm({ ...applyForm, offerAmount: e.target.value })}
                    placeholder={property?.price ? `Asking price: AED ${property.price.toLocaleString()}` : 'Enter your offer'}
                    className="input-field pl-16 w-full"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {property?.price && `Asking price: AED ${property.price.toLocaleString()}${property.listing_type === 'sale' ? '' : '/month'}`}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowApplyModal(false)
                    setApplyForm({ offerAmount: '' })
                  }}
                  className="btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1"
                  disabled={submitting}
                >
                  <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

