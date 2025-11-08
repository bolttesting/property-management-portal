'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { propertiesAPI, ownerAPI, uploadAPI, rentPaymentsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  MapPin, Bed, Bath, Car, ArrowLeft, Edit, 
  Calendar, Building, Home, Ruler, Calendar as CalendarIcon,
  Video, Image as ImageIcon, X, Upload, FileText, AlertCircle, User
} from 'lucide-react'

export default function OwnerPropertyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [property, setProperty] = useState<any>(null)
  const [images, setImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [lease, setLease] = useState<any>(null)
  const [rentPayments, setRentPayments] = useState<any[]>([])
  const [uploadingContract, setUploadingContract] = useState(false)
  const [updatingSchedule, setUpdatingSchedule] = useState(false)
  const [selectedChequeCount, setSelectedChequeCount] = useState<number | null>(null)
  const [firstDueDate, setFirstDueDate] = useState('')
  const [reminderLeadDays, setReminderLeadDays] = useState(3)
  const [paymentMethod, setPaymentMethod] = useState('cheque')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    // Wait for hydration before checking auth
    if (!hasHydrated) {
      return
    }

    // Check localStorage directly as fallback
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    
    if (!token || !storedUser || !isAuthenticated || user?.userType !== 'owner') {
      router.push('/auth/login')
      return
    }

    if (params.id) {
      loadProperty()
    }
  }, [hasHydrated, params.id, isAuthenticated, user, router])

  const loadLeaseInfo = async (propertyId: string) => {
    try {
      const response = await ownerAPI.getLeases({ propertyId, status: 'active', limit: 1 })
      const leases = response.data?.data?.leases || []
      if (leases.length === 0) {
        setLease(null)
        setRentPayments([])
        return
      }

      const activeLease = leases[0]
      if (activeLease?.payment_plan && typeof activeLease.payment_plan === 'string') {
        try {
          activeLease.payment_plan = JSON.parse(activeLease.payment_plan)
        } catch {
          // ignore parse failure
        }
      }

      setLease(activeLease)
      if (activeLease?.cheque_count) {
        setSelectedChequeCount(activeLease.cheque_count)
      }
      if (activeLease?.payment_method) {
        setPaymentMethod(activeLease.payment_method)
      }
      setFirstDueDate(activeLease?.start_date || '')

      try {
        const paymentsResponse = await rentPaymentsAPI.getPayments({ leaseId: activeLease.id, limit: 120 })
        const payments = paymentsResponse.data?.data?.payments || []
        setRentPayments(payments)
        if (payments.length > 0) {
          setFirstDueDate(payments[0].due_date || activeLease.start_date || '')
          if (payments[0].reminder_lead_days !== undefined && payments[0].reminder_lead_days !== null) {
            setReminderLeadDays(payments[0].reminder_lead_days)
          }
        }
      } catch (error) {
        console.warn('Failed to load rent payments', error)
        setRentPayments([])
      }
    } catch (error) {
      console.warn('Failed to load lease info', error)
      setLease(null)
      setRentPayments([])
    }
  }

  const loadProperty = async () => {
    try {
      setLoading(true)
      const response = await propertiesAPI.getById(params.id as string)
      const property = response.data.data.property
      
      // Parse address if it's a string (JSONB from PostgreSQL)
      if (property.address && typeof property.address === 'string') {
        try {
          property.address = JSON.parse(property.address)
        } catch (e) {
          property.address = {}
        }
      }
      
      // Debug: Log address to see what we have
      console.log('=== Property Data Debug ===')
      console.log('Full property object:', JSON.stringify(property, null, 2))
      console.log('Property address:', property.address)
      console.log('Address type:', typeof property.address)
      console.log('Bedrooms:', property.address?.bedrooms, 'Type:', typeof property.address?.bedrooms)
      console.log('Bathrooms:', property.address?.bathrooms, 'Type:', typeof property.address?.bathrooms)
      console.log('Area:', property.address?.area, 'Type:', typeof property.address?.area)
      console.log('Parking:', property.address?.parkingSpaces, 'Type:', typeof property.address?.parkingSpaces)
      console.log('Furnished:', property.address?.furnished, 'Type:', typeof property.address?.furnished)
      console.log('Year Built:', property.address?.yearBuilt, 'Type:', typeof property.address?.yearBuilt)
      console.log('Floor Number:', property.address?.floorNumber, 'Type:', typeof property.address?.floorNumber)
      console.log('Total Floors:', property.address?.totalFloors, 'Type:', typeof property.address?.totalFloors)
      console.log('==========================')
      
      // Debug: Log images data
      console.log('=== Images Debug ===')
      console.log('Images array:', response.data.data.images)
      console.log('Images count:', response.data.data.images?.length || 0)
      if (response.data.data.images && response.data.data.images.length > 0) {
        response.data.data.images.forEach((img: any, index: number) => {
          console.log(`Image ${index}:`, {
            id: img.id,
            image_url: img.image_url,
            is_primary: img.is_primary,
            full_url: `http://localhost:5000${img.image_url}`
          })
        })
      }
      console.log('===================')
      
      setProperty(property)
      setImages(response.data.data.images || [])

      const activeLeaseFromResponse = response.data.data.activeLease || null
      const rentPaymentsFromResponse = response.data.data.rentPayments || []

      if (activeLeaseFromResponse) {
        if (activeLeaseFromResponse.payment_plan && typeof activeLeaseFromResponse.payment_plan === 'string') {
          try {
            activeLeaseFromResponse.payment_plan = JSON.parse(activeLeaseFromResponse.payment_plan)
          } catch {
            // ignore parse error
          }
        }

        setLease(activeLeaseFromResponse)
        if (activeLeaseFromResponse.cheque_count) {
          setSelectedChequeCount(activeLeaseFromResponse.cheque_count)
        }
        if (activeLeaseFromResponse.payment_method) {
          setPaymentMethod(activeLeaseFromResponse.payment_method)
        }
        setFirstDueDate(activeLeaseFromResponse.start_date || '')

        if (rentPaymentsFromResponse.length > 0) {
          setRentPayments(rentPaymentsFromResponse)
          setFirstDueDate(rentPaymentsFromResponse[0].due_date || activeLeaseFromResponse.start_date || '')
          if (rentPaymentsFromResponse[0].reminder_lead_days !== undefined && rentPaymentsFromResponse[0].reminder_lead_days !== null) {
            setReminderLeadDays(rentPaymentsFromResponse[0].reminder_lead_days)
          }
        } else {
          setRentPayments([])
        }
      } else {
        await loadLeaseInfo(property.id)
      }
    } catch (error: any) {
      toast.error('Failed to load property')
      router.push('/owner/dashboard')
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

  if (!isAuthenticated || user?.userType !== 'owner') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!property) return null

  const getDocumentUrl = (url: string | undefined | null): string => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'
    return `${backendUrl}${url.startsWith('/') ? url : '/' + url}`
  }

  const handleContractButtonClick = () => {
    if (!lease) {
      toast.error('No active lease found for this property')
      return
    }
    fileInputRef.current?.click()
  }

  const handleContractFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!lease) {
      toast.error('No active lease found for this property')
      return
    }

    try {
      setUploadingContract(true)
      const uploadResponse = await uploadAPI.uploadDocument(file)
      const fileUrl = uploadResponse.data?.data?.fileUrl
      if (!fileUrl) {
        throw new Error('Upload succeeded but no file URL was returned')
      }

      const updateResponse = await ownerAPI.updateLeaseContract(lease.id, {
        contractUrl: fileUrl,
      })

      if (updateResponse.data?.success) {
        await loadLeaseInfo(property.id)
        toast.success('Lease contract uploaded successfully')
      }
    } catch (error: any) {
      console.error('Contract upload error:', error)
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to upload contract')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setUploadingContract(false)
    }
  }

  const handleScheduleUpdate = async () => {
    if (!lease) {
      toast.error('No active lease found for this property')
      return
    }
    if (!selectedChequeCount) {
      toast.error('Please select the number of cheques')
      return
    }
    if (!firstDueDate) {
      toast.error('Please select the first due date')
      return
    }

    try {
      setUpdatingSchedule(true)
      const response = await ownerAPI.updateLeaseContract(lease.id, {
        chequeCount: selectedChequeCount,
        firstDueDate,
        reminderLeadDays,
        paymentMethod,
      })

      if (response.data?.success) {
        await loadLeaseInfo(property.id)
        toast.success('Payment schedule updated')
      }
    } catch (error: any) {
      console.error('Schedule update error:', error)
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to update schedule')
    } finally {
      setUpdatingSchedule(false)
    }
  }

  // Parse address if it's a string (JSONB from PostgreSQL)
  let address = property.address || {}
  if (typeof address === 'string') {
    try {
      address = JSON.parse(address)
    } catch (e) {
      address = {}
    }
  }
  
  // Helper function to check if a value exists (used in multiple places)
  const hasValue = (val: any): boolean => {
    if (val === null || val === undefined) return false
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (trimmed === '') return false
      // Check if it's a valid number (including 0)
      const num = parseFloat(trimmed)
      return !isNaN(num) && isFinite(num)
    }
    if (typeof val === 'number') return !isNaN(val) && isFinite(val) // Allow 0 as valid
    if (typeof val === 'boolean') return true // Boolean values are always valid
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
  
  // Debug: Log current image state (only if images exist)
  if (images.length > 0) {
    console.log('Current images state:', {
      imagesCount: images.length,
      selectedIndex: selectedImageIndex,
      primaryImage: primaryImage?.image_url,
      currentImage: images[selectedImageIndex]?.image_url,
      currentImageUrl: getImageUrl(images[selectedImageIndex]?.image_url || primaryImage?.image_url || images[0]?.image_url)
    })
  } else {
    console.log('No images found for this property')
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-text-secondary hover:text-primary"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </button>
          <button
            onClick={() => router.push(`/owner/properties/${property.id}/edit`)}
            className="btn-primary flex items-center"
          >
            <Edit className="h-5 w-5 mr-2" />
            Edit Property
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white rounded-large shadow-medium overflow-hidden">
              {images.length > 0 ? (
                <div>
                  {/* Main Image */}
                  <div className="relative h-96 bg-background-gray">
                    <img
                      src={getImageUrl(images[selectedImageIndex]?.image_url || primaryImage?.image_url || images[0]?.image_url)}
                      alt={property.property_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Main image load error:', {
                          attemptedUrl: e.currentTarget.src,
                          imageUrl: images[selectedImageIndex]?.image_url || primaryImage?.image_url || images[0]?.image_url,
                          imagesArray: images
                        })
                        // Try fallback to a placeholder or hide the image
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.onerror = null // Prevent infinite loop
                      }}
                      onLoad={(e) => {
                        console.log('Main image loaded successfully:', e.currentTarget.src)
                      }}
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition"
                        >
                          →
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                          {selectedImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="grid grid-cols-6 gap-2 p-4">
                      {images.map((img: any, index: number) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`relative h-20 rounded-lg overflow-hidden border-2 transition ${
                            selectedImageIndex === index ? 'border-primary' : 'border-transparent'
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
                              e.currentTarget.onerror = null // Prevent infinite loop
                            }}
                            onLoad={(e) => {
                              console.log('Thumbnail loaded successfully:', e.currentTarget.src)
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 bg-background-gray flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-text-tertiary" />
                </div>
              )}
            </div>

            {/* Property Details */}
            <div className="bg-white rounded-large shadow-medium p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-heading font-bold mb-2">{property.property_name}</h1>
                  <div className="flex items-center text-text-secondary">
                    <MapPin className="h-5 w-5 mr-2" />
                    <span>
                      {address.building_name && `${address.building_name}, `}
                      {address.apartment_no && `Unit ${address.apartment_no}, `}
                      {address.street && `${address.street}, `}
                      {address.community && `${address.community}, `}
                      {address.location || 'UAE'}
                      {address.emirate && `, ${address.emirate}`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-accent-gold">AED {property.price?.toLocaleString()}</p>
                  <p className="text-sm text-text-secondary">per month</p>
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    property.status === 'occupied' ? 'bg-accent-green text-white' :
                    property.status === 'vacant' ? 'bg-accent-gold text-white' :
                    property.status === 'under_maintenance' ? 'bg-orange-500 text-white' :
                    'bg-text-tertiary text-white'
                  }`}>
                    {property.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Property Specifications */}
              {(() => {
                // Debug: Log what we're checking
                console.log('Checking specifications:')
                console.log('  bedrooms:', address.bedrooms, 'hasValue:', hasValue(address.bedrooms))
                console.log('  bathrooms:', address.bathrooms, 'hasValue:', hasValue(address.bathrooms))
                console.log('  area:', address.area, 'hasValue:', hasValue(address.area))
                console.log('  parkingSpaces:', address.parkingSpaces, 'hasValue:', hasValue(address.parkingSpaces))
                console.log('  furnished:', address.furnished, 'hasValue:', address.furnished !== undefined)
                console.log('  yearBuilt:', address.yearBuilt, 'hasValue:', hasValue(address.yearBuilt))
                console.log('  floorNumber:', address.floorNumber, 'hasValue:', hasValue(address.floorNumber))
                console.log('  totalFloors:', address.totalFloors, 'hasValue:', hasValue(address.totalFloors))
                
                // Check if we have any specifications to show
                const hasSpecs = hasValue(address.bedrooms) || 
                                hasValue(address.bathrooms) || 
                                hasValue(address.area) || 
                                hasValue(address.parkingSpaces) || 
                                address.furnished !== undefined || 
                                hasValue(address.yearBuilt) || 
                                hasValue(address.floorNumber) ||
                                hasValue(address.totalFloors)
                
                console.log('hasSpecs result:', hasSpecs)
                
                // Always show the section if we have property type and category, even if no specs
                // This ensures the section is visible
                if (!hasSpecs && !property.property_type && !property.category) return null
                
                // Helper to format area value
                const formatArea = (area: any, unit: string = 'sqft'): string => {
                  if (!hasValue(area)) return ''
                  const numArea = typeof area === 'string' ? parseFloat(area) : area
                  if (isNaN(numArea)) return ''
                  return `${numArea.toLocaleString()} ${unit}`
                }
                
                return (
                  <div className="mb-6 pb-6 border-b border-border">
                    <h2 className="text-xl font-heading font-semibold mb-4">Property Specifications</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Always show property type and category */}
                      <div>
                        <p className="text-sm text-text-secondary">Property Type</p>
                        <p className="font-semibold capitalize">{property.property_type || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary">Category</p>
                        <p className="font-semibold capitalize">{property.category || 'N/A'}</p>
                      </div>
                      
                      {/* Show specifications if available */}
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
                      {hasValue(address.area) && (() => {
                        const areaStr = formatArea(address.area, address.areaUnit || 'sqft')
                        return areaStr ? (
                          <div className="flex items-center">
                            <Ruler className="h-5 w-5 text-primary mr-2" />
                            <div>
                              <p className="text-sm text-text-secondary">Area</p>
                              <p className="font-semibold">{areaStr}</p>
                            </div>
                          </div>
                        ) : null
                      })()}
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
                  </div>
                )
              })()}

              {/* Additional Details - Show all available information */}
              {(hasValue(address.floorNumber) || hasValue(address.totalFloors) || hasValue(address.yearBuilt) || address.furnished !== undefined) && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {hasValue(address.floorNumber) || hasValue(address.totalFloors) ? (
                      <div>
                        <p className="text-sm text-text-secondary">Floor</p>
                        <p className="font-semibold">
                          {address.floorNumber || 'N/A'}
                          {address.totalFloors && ` of ${address.totalFloors}`}
                        </p>
                      </div>
                    ) : null}
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

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Description</h3>
                <p className="text-text-secondary whitespace-pre-line">
                  {property.description || 'No description available'}
                </p>
              </div>

              {lease ? (
                <div className="mt-8 pt-6 border-t border-border space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">Lease Management</h3>
                      <p className="text-sm text-text-secondary">Upload the signed contract and manage rent instalments.</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleContractButtonClick}
                        disabled={uploadingContract}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingContract ? 'Uploading...' : lease?.contract_document_url ? 'Replace Contract' : 'Upload Contract'}
                      </button>
                      {lease?.contract_document_url && (
                        <a
                          href={getDocumentUrl(lease.contract_document_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          View Contract
                        </a>
                      )}
                    </div>
                  </div>

                  {(lease?.tenant_name || lease?.tenant_email || lease?.tenant_mobile) && (
                    <div className="bg-white border border-primary/20 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-md font-semibold mb-3 text-primary flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Current Tenant
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {lease?.tenant_name && (
                          <div>
                            <p className="text-text-secondary">Name</p>
                            <p className="font-semibold text-text-primary">{lease.tenant_name}</p>
                          </div>
                        )}
                        {lease?.tenant_email && (
                          <div>
                            <p className="text-text-secondary">Email</p>
                            <p className="font-semibold text-text-primary break-all">{lease.tenant_email}</p>
                          </div>
                        )}
                        {lease?.tenant_mobile && (
                          <div>
                            <p className="text-text-secondary">Mobile</p>
                            <p className="font-semibold text-text-primary">{lease.tenant_mobile}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-text-secondary">Lease Period</p>
                          <p className="font-semibold text-text-primary">
                            {lease?.start_date ? new Date(lease.start_date).toLocaleDateString() : 'TBD'}
                            {' '}–{' '}
                            {lease?.end_date ? new Date(lease.end_date).toLocaleDateString() : 'TBD'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleContractFileChange}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-md font-semibold mb-4">Payment Schedule</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">Payment Method</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="input-field"
                          >
                            <option value="cheque">Cheques</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cash">Cash</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">Number of Cheques</label>
                          <select
                            value={selectedChequeCount ?? ''}
                            onChange={(e) => setSelectedChequeCount(e.target.value ? Number(e.target.value) : null)}
                            className="input-field"
                          >
                            <option value="">Select...</option>
                            {[1, 2, 4, 6, 12].map((count) => (
                              <option key={count} value={count}>{count}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">First Due Date</label>
                          <input
                            type="date"
                            value={firstDueDate}
                            onChange={(e) => setFirstDueDate(e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">Reminder Lead Days</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={reminderLeadDays}
                            onChange={(e) => setReminderLeadDays(Number(e.target.value))}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleScheduleUpdate}
                        disabled={updatingSchedule}
                        className="btn-primary mt-4"
                      >
                        {updatingSchedule ? 'Updating...' : 'Update Schedule'}
                      </button>
                      <p className="text-xs text-text-secondary mt-3 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                        Regenerating the schedule sends updated reminders to the tenant.
                      </p>
                    </div>

                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                      <h4 className="text-md font-semibold mb-4">Rent Instalments</h4>
                      {rentPayments.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto -mx-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-text-secondary">
                                <th className="px-3 py-2">#</th>
                                <th className="px-3 py-2">Due Date</th>
                                <th className="px-3 py-2">Amount</th>
                                <th className="px-3 py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rentPayments.map((payment) => (
                                <tr key={payment.id} className="border-t border-gray-100">
                                  <td className="px-3 py-2 font-semibold">{payment.installment_number || '-'}</td>
                                  <td className="px-3 py-2">{payment.due_date ? new Date(payment.due_date).toLocaleDateString() : '-'}</td>
                                  <td className="px-3 py-2 font-semibold">AED {Number(payment.amount || 0).toLocaleString()}</td>
                                  <td className="px-3 py-2">
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
                        <p className="text-sm text-text-secondary">No rent instalments generated yet. Configure the schedule to create reminders.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : property.status === 'occupied' ? (
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-sm text-text-secondary">Lease details are not yet available. Approve an application to generate the lease contract and schedule.</p>
                </div>
              ) : null}

              {/* Video/Virtual Tour */}
              {property.virtual_tour_url && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Video className="h-5 w-5 mr-2" />
                    Virtual Tour
                  </h3>
                  <div className="aspect-video rounded-lg overflow-hidden">
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
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-large shadow-medium p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/owner/properties/${property.id}/edit`)}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <Edit className="h-5 w-5 mr-2" />
                  Edit Property
                </button>
                <button
                  onClick={() => router.push(`/owner/applications?property=${property.id}`)}
                  className="btn-secondary w-full flex items-center justify-center"
                >
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  View Applications
                </button>
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-large shadow-medium p-6">
              <h3 className="text-lg font-semibold mb-4">Property Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Property ID:</span>
                  <span className="font-medium">{property.id?.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Created:</span>
                  <span className="font-medium">
                    {new Date(property.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Last Updated:</span>
                  <span className="font-medium">
                    {new Date(property.updated_at).toLocaleDateString()}
                  </span>
                </div>
                {property.current_lease_id && (
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Current Lease:</span>
                    <span className="font-medium text-accent-green">Active</span>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Contact */}
            <div className="bg-white rounded-large shadow-medium p-6">
              <h3 className="text-lg font-semibold mb-4">Owner Details</h3>
              <div className="space-y-2 text-sm">
                {property.company_name && (
                  <div>
                    <p className="text-text-secondary">Company</p>
                    <p className="font-medium">{property.company_name}</p>
                  </div>
                )}
                {(property.first_name || property.last_name) && (
                  <div>
                    <p className="text-text-secondary">Contact Person</p>
                    <p className="font-medium">
                      {property.first_name} {property.last_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

