'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Home, TrendingUp, Shield, MessageCircle, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { propertiesAPI } from '@/lib/api'
import PropertyCard from '@/components/PropertyCard'
import Navigation from '@/components/Navigation'
import toast from 'react-hot-toast'

export default function HomePage() {
  const router = useRouter()
  const [rentProperties, setRentProperties] = useState<any[]>([])
  const [saleProperties, setSaleProperties] = useState<any[]>([])
  const [loadingRent, setLoadingRent] = useState(true)
  const [loadingSale, setLoadingSale] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Hero slider images - High quality property images from Unsplash
  const heroImages = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&q=80',
  ]

  useEffect(() => {
    loadFeaturedProperties()
  }, [])

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [heroImages.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
  }

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length)
  }

  const handleSearch = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }
    
    if (searchQuery.trim()) {
      router.push(`/properties?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/properties')
    }
  }

  const loadFeaturedProperties = async () => {
    try {
      setLoadingRent(true)
      setLoadingSale(true)
      
      // Load rent properties
      const rentResponse = await propertiesAPI.getAll({ limit: 6, page: 1, listingType: 'rent' })
      if (rentResponse.data?.success && rentResponse.data?.data?.properties) {
        setRentProperties(rentResponse.data.data.properties)
      }
      
      // Load sale properties
      const saleResponse = await propertiesAPI.getAll({ limit: 6, page: 1, listingType: 'sale' })
      if (saleResponse.data?.success && saleResponse.data?.data?.properties) {
        setSaleProperties(saleResponse.data.data.properties)
      }
    } catch (error: any) {
      console.error('Failed to load featured properties:', error)
      // Don't show error toast on home page - just log it
    } finally {
      setLoadingRent(false)
      setLoadingSale(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative text-white min-h-screen flex items-center overflow-hidden">
        {/* Image Slider Background */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={`Property ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>
            </div>
          ))}
        </div>

        {/* Slider Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-3 transition-all duration-300 hover:scale-110 group"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-3 transition-all duration-300 hover:scale-110 group"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        {/* Slider Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Content Overlay */}
        <div className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20">
          <div className="text-center fade-in">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold mb-6 leading-tight drop-shadow-2xl">
              Find Your Perfect Property
              <br />
              <span className="bg-gradient-to-r from-yellow-200 via-yellow-300 to-yellow-400 bg-clip-text text-transparent">
                in the UAE
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-12 text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              Premium properties for rent and sale across Dubai, Abu Dhabi, and Sharjah
            </p>
            
            {/* Search Bar */}
            <div className="max-w-4xl mx-auto fade-in" style={{ animationDelay: '0.2s' }}>
              <form onSubmit={handleSearch} className="glass rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by location, property type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field text-gray-900"
                    style={{ color: '#111827' }}
                  />
                </div>
                <button 
                  type="submit"
                  className="btn-primary w-full md:w-auto whitespace-nowrap relative z-10"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <Search className="inline-block mr-2 h-5 w-5" />
                    Search Properties
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-4 gradient-text">
              Why Choose Us?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Your trusted partner for property management in the UAE
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-3 text-gray-900">RERA Compliant</h3>
              <p className="text-gray-600 leading-relaxed">
                All contracts and processes comply with UAE RERA regulations
              </p>
            </div>

            <div className="card text-center hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                <TrendingUp className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-3 text-gray-900">Premium Properties</h3>
              <p className="text-gray-600 leading-relaxed">
                Access to the best properties across all Emirates
              </p>
            </div>

            <div className="card text-center hover:scale-105 transition-transform duration-300 group">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-6 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                <MessageCircle className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-3 text-gray-900">24/7 Support</h3>
              <p className="text-gray-600 leading-relaxed">
                Dedicated support team available whenever you need help
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Properties for Rent Section */}
      <section className="section-padding bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
                Properties for Rent
              </h2>
              <p className="text-lg text-gray-600">
                Discover premium rental properties across the UAE
              </p>
            </div>
            <Link href="/properties?listingType=rent" className="btn-secondary whitespace-nowrap">
              View All Rentals →
            </Link>
          </div>

          {loadingRent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="property-card animate-pulse">
                  <div className="h-48 bg-background-gray rounded-large mb-4"></div>
                  <div className="p-4">
                    <div className="h-4 bg-background-gray rounded mb-2"></div>
                    <div className="h-4 bg-background-gray rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-background-gray rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : rentProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rentProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <Home className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary text-lg">No rental properties available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Properties for Sale Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
                Properties for Sale
              </h2>
              <p className="text-lg text-gray-600">
                Find your dream property to own in the UAE
              </p>
            </div>
            <Link href="/properties?listingType=sale" className="btn-secondary whitespace-nowrap">
              View All Sales →
            </Link>
          </div>

          {loadingSale ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="property-card animate-pulse">
                  <div className="h-48 bg-background-gray rounded-large mb-4"></div>
                  <div className="p-4">
                    <div className="h-4 bg-background-gray rounded mb-2"></div>
                    <div className="h-4 bg-background-gray rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-background-gray rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : saleProperties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {saleProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          ) : (
            <div className="col-span-full text-center py-12">
              <Home className="h-16 w-16 text-text-tertiary mx-auto mb-4" />
              <p className="text-text-secondary text-lg">No properties for sale available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-white border-t border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-text-secondary mb-4">Trusted by</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-text-secondary font-semibold">Dubai Land Department</div>
              <div className="text-text-secondary font-semibold">RERA</div>
              <div className="text-text-secondary font-semibold">UAE Real Estate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-dark text-white py-12">
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
                <li><Link href="/properties" className="hover:text-white transition-colors">Properties</Link></li>
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Owners</h4>
              <ul className="space-y-2 text-primary-light">
                <li><Link href="/auth/register?type=owner" className="hover:text-white transition-colors">Register</Link></li>
                <li><Link href="/owner/login" className="hover:text-white transition-colors">Owner Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-primary-light">
                <li>Dubai, UAE</li>
                <li>Email: <a href="mailto:ahmad@logixcontact.com" className="hover:text-white transition-colors">ahmad@logixcontact.com</a></li>
                <li>Phone: <a href="tel:+971524212189" className="hover:text-white transition-colors">+971 524 212 189</a></li>
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

