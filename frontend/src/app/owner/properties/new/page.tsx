'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { propertiesAPI, uploadAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Home, Upload, X, Image as ImageIcon, Video, Plus } from 'lucide-react'

export default function NewPropertyPage() {
  const router = useRouter()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: 'apartment',
    category: 'residential',
    listingType: 'rent',
    status: 'vacant',
    address: {
      emirate: 'Dubai',
      area: '',
      location: '',
      community: '',
      street: '',
      building_name: '',
      apartment_no: '',
    },
    bedrooms: '',
    bathrooms: '',
    area: '',
    areaUnit: 'sqft',
    parkingSpaces: '',
    furnished: false,
    yearBuilt: '',
    floorNumber: '',
    totalFloors: '',
    description: '',
    price: '',
    features: [] as string[],
  })

  const availableFeatures = [
    'Swimming Pool',
    'Gym',
    'Parking',
    'Balcony',
    'Garden',
    'Maid Room',
    'Storage',
    'Elevator',
    'Security',
    'Concierge',
    'Pet Friendly',
    'Furnished',
    'Air Conditioning',
    'Central AC',
    'Built-in Wardrobes',
    'Kitchen Appliances',
    'Washing Machine',
    'Dishwasher',
    'Microwave',
    'Refrigerator',
  ]

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
  }, [hasHydrated, isAuthenticated, user, router])

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB`)
        }
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!validTypes.includes(file.type)) {
          throw new Error(`File ${file.name} is not a valid image type. Allowed: JPG, PNG, WebP`)
        }
        
        try {
          const response = await uploadAPI.uploadImage(file)
          console.log('Image upload response:', response.data)
          if (!response.data?.data?.fileUrl) {
            throw new Error('Invalid response from server: missing fileUrl')
          }
          return response.data.data.fileUrl
        } catch (uploadError: any) {
          console.error(`Failed to upload ${file.name}:`, uploadError)
          throw new Error(`Failed to upload ${file.name}: ${uploadError.response?.data?.error?.message || uploadError.message || 'Unknown error'}`)
        }
      })
      
      const newImageUrls = await Promise.all(uploadPromises)
      console.log('Uploaded image URLs:', newImageUrls)
      
      if (newImageUrls.length === 0) {
        throw new Error('No images were uploaded successfully')
      }
      
      setImages([...images, ...newImageUrls])
      if (primaryImageIndex === null && newImageUrls.length > 0) {
        setPrimaryImageIndex(images.length) // Set first uploaded image as primary
      }
      toast.success(`${newImageUrls.length} image(s) uploaded successfully`)
    } catch (error: any) {
      console.error('Image upload error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to upload images'
      toast.error(errorMessage)
    } finally {
      setUploadingImages(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    if (primaryImageIndex === index) {
      setPrimaryImageIndex(newImages.length > 0 ? 0 : null)
    } else if (primaryImageIndex !== null && primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1)
    }
  }

  const toggleFeature = (feature: string) => {
    if (formData.features.includes(feature)) {
      setFormData({
        ...formData,
        features: formData.features.filter((f) => f !== feature),
      })
    } else {
      setFormData({
        ...formData,
        features: [...formData.features, feature],
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create property - send all fields including specifications
      const response = await propertiesAPI.create({
        propertyName: formData.propertyName,
        propertyType: formData.propertyType,
        category: formData.category,
        listingType: formData.listingType,
        status: formData.status || 'vacant',
        price: parseFloat(formData.price),
        description: formData.description,
        features: formData.features,
        address: {
          ...formData.address,
          location: formData.address.location || formData.address.area,
        },
        location: formData.address.location || formData.address.area,
        bedrooms: formData.bedrooms && formData.bedrooms.trim() !== '' ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms && formData.bathrooms.trim() !== '' ? parseFloat(formData.bathrooms) : undefined,
        area: formData.area && formData.area.trim() !== '' ? parseFloat(formData.area) : undefined,
        areaUnit: formData.areaUnit,
        parkingSpaces: formData.parkingSpaces && formData.parkingSpaces.trim() !== '' ? parseInt(formData.parkingSpaces) : undefined,
        furnished: formData.furnished,
        yearBuilt: formData.yearBuilt && formData.yearBuilt.trim() !== '' ? parseInt(formData.yearBuilt) : undefined,
        floorNumber: formData.floorNumber && formData.floorNumber.trim() !== '' ? parseInt(formData.floorNumber) : undefined,
        totalFloors: formData.totalFloors && formData.totalFloors.trim() !== '' ? parseInt(formData.totalFloors) : undefined,
        community: formData.address.community,
        street: formData.address.street,
        videoUrl: videoUrl || null,
        virtualTourUrl: videoUrl || null,
      })

      const propertyId = response.data.data.property.id

      // Upload images if any
      if (images.length > 0) {
        try {
          console.log('Adding images to property:', {
            propertyId,
            imageUrls: images,
            primaryImageIndex
          })
          
          const addImagesResponse = await propertiesAPI.addImages(propertyId, {
            imageUrls: images,
            primaryImageIndex: primaryImageIndex,
          })
          
          console.log('Add images response:', addImagesResponse.data)
          toast.success(`Property created and ${images.length} image(s) added successfully`)
        } catch (error: any) {
          console.error('Failed to add images:', error)
          const errorMessage = error.response?.data?.error?.message || 
                              error.response?.data?.message || 
                              error.message || 
                              'Failed to add images'
          toast.error(`Property created but failed to add images: ${errorMessage}`)
        }
      }

      toast.success('Property created successfully!')
      router.push('/owner/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create property')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-text-secondary hover:text-primary mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>

        <div className="card">
          <h1 className="text-3xl font-heading font-bold mb-6">Add New Property</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.propertyName}
                    onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Luxury 2BR Apartment Downtown"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Listing Type *
                    </label>
                    <select
                      required
                      value={formData.listingType}
                      onChange={(e) => setFormData({ ...formData, listingType: e.target.value })}
                      className="input-field"
                    >
                      <option value="rent">For Rent</option>
                      <option value="sale">For Sale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Property Type *
                    </label>
                    <select
                      required
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="input-field"
                    >
                      <option value="apartment">Apartment</option>
                      <option value="villa">Villa</option>
                      <option value="townhouse">Townhouse</option>
                      <option value="office">Office</option>
                      <option value="retail">Retail</option>
                      <option value="warehouse">Warehouse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Location Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Emirate *
                  </label>
                  <select
                    required
                    value={formData.address.emirate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, emirate: e.target.value },
                      })
                    }
                    className="input-field"
                  >
                    <option value="Dubai">Dubai</option>
                    <option value="Abu Dhabi">Abu Dhabi</option>
                    <option value="Sharjah">Sharjah</option>
                    <option value="Ajman">Ajman</option>
                    <option value="Umm Al Quwain">Umm Al Quwain</option>
                    <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                    <option value="Fujairah">Fujairah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Area / Location * (for filtering, e.g., "Dubai Downtown")
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address.location}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          location: e.target.value,
                          area: e.target.value,
                        },
                      })
                    }
                    className="input-field"
                    placeholder="e.g., Dubai Downtown, JBR, Marina, Business Bay"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Community
                    </label>
                    <input
                      type="text"
                      value={formData.address.community}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, community: e.target.value },
                        })
                      }
                      className="input-field"
                      placeholder="e.g., Palm Jumeirah, Emirates Hills"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Street
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                      className="input-field"
                      placeholder="Street name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Building Name
                    </label>
                    <input
                      type="text"
                      value={formData.address.building_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, building_name: e.target.value },
                        })
                      }
                      className="input-field"
                      placeholder="Building name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Apartment/Unit No
                    </label>
                    <input
                      type="text"
                      value={formData.address.apartment_no}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, apartment_no: e.target.value },
                        })
                      }
                      className="input-field"
                      placeholder="101"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Property Specifications */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Property Specifications</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                    className="input-field"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                    className="input-field"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Area
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="input-field"
                    placeholder="1200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Unit
                  </label>
                  <select
                    value={formData.areaUnit}
                    onChange={(e) => setFormData({ ...formData, areaUnit: e.target.value })}
                    className="input-field"
                  >
                    <option value="sqft">Sq Ft</option>
                    <option value="sqm">Sq M</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Parking Spaces
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.parkingSpaces}
                    onChange={(e) => setFormData({ ...formData, parkingSpaces: e.target.value })}
                    className="input-field"
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Year Built
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                    className="input-field"
                    placeholder="2020"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.floorNumber}
                    onChange={(e) => setFormData({ ...formData, floorNumber: e.target.value })}
                    className="input-field"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Total Floors
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.totalFloors}
                    onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                    className="input-field"
                    placeholder="20"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.furnished}
                    onChange={(e) => setFormData({ ...formData, furnished: e.target.checked })}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <span className="ml-2 text-sm text-text-primary">Furnished</span>
                </label>
              </div>
            </div>

            {/* Price */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Pricing</h2>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Monthly Rent (AED) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="input-field"
                  placeholder="50000"
                />
              </div>
            </div>

            {/* Features & Amenities */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Features & Amenities</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableFeatures.map((feature) => (
                  <label key={feature} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.features.includes(feature)}
                      onChange={() => toggleFeature(feature)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <span className="ml-2 text-sm text-text-primary">{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Images */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Property Images</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Upload Images (JPG, PNG, WebP - Max 10MB each)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-background-gray transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-10 h-10 mb-2 text-text-tertiary" />
                        <p className="mb-2 text-sm text-text-secondary">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-text-tertiary">Multiple images supported</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                      />
                    </label>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={`http://localhost:5000${imageUrl}`}
                          alt={`Property ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-border"
                        />
                        {primaryImageIndex === index && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPrimaryImageIndex(index)}
                              className="bg-white text-primary p-2 rounded hover:bg-primary-light transition-colors"
                              title="Set as primary"
                            >
                              <ImageIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
                              title="Remove"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {uploadingImages && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="mt-2 text-sm text-text-secondary">Uploading images...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video */}
            <div className="border-b border-border pb-6">
              <h2 className="text-xl font-heading font-semibold mb-4">Video / Virtual Tour</h2>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Video URL (YouTube, Vimeo, or direct video link)
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                />
                <p className="mt-1 text-xs text-text-tertiary">
                  Enter a YouTube, Vimeo, or direct video URL for property tour
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-heading font-semibold mb-4">Description</h2>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Property Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={6}
                  placeholder="Describe your property in detail... Include information about the neighborhood, nearby amenities, transportation, schools, etc."
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || uploadingImages}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Property'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
