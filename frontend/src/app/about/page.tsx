'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Shield, TrendingUp, MessageCircle, Users, Award, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import Navigation from '@/components/Navigation'

export default function AboutPage() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Dubai villa images from Unsplash
  const heroImages = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80', // Luxury villa
    'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1920&q=80', // Modern villa
    'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=1920&q=80', // Dubai property
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&q=80', // Luxury home
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1920&q=80', // Villa exterior
  ]

  // Auto-slide functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length)
    }, 5000)

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
                alt={`Dubai Villa ${index + 1}`}
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
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-3 transition-all duration-300 hover:scale-110"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full p-3 transition-all duration-300 hover:scale-110"
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
              About Property UAE
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              Your trusted partner for property management and real estate solutions in the UAE
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-text-secondary mb-4">
                At Property UAE, we are dedicated to revolutionizing the property management and real estate industry in the United Arab Emirates. Our mission is to provide seamless, transparent, and efficient property management solutions that connect property owners, dealers, and tenants.
              </p>
              <p className="text-lg text-text-secondary">
                We strive to create a platform that simplifies property transactions, ensures compliance with UAE regulations, and fosters trust between all parties involved in the real estate ecosystem.
              </p>
            </div>
            <div className="bg-background-light rounded-large p-8">
              <Building2 className="h-24 w-24 text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-heading font-bold text-center mb-4">UAE's Leading Property Platform</h3>
              <p className="text-center text-text-secondary">
                Connecting property dealers, owners, and tenants across all Emirates
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-background-light">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Our Core Values</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="bg-primary-light rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">RERA Compliant</h3>
              <p className="text-text-secondary">
                All our processes and contracts strictly adhere to UAE RERA regulations, ensuring legal compliance and protection for all parties.
              </p>
            </div>

            <div className="card text-center">
              <div className="bg-primary-light rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">Transparency</h3>
              <p className="text-text-secondary">
                We believe in complete transparency in all transactions, pricing, and communications to build trust and long-term relationships.
              </p>
            </div>

            <div className="card text-center">
              <div className="bg-primary-light rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-semibold mb-2">Customer First</h3>
              <p className="text-text-secondary">
                Our customers are at the heart of everything we do. We provide 24/7 support and personalized service to meet your needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">What We Offer</h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Comprehensive property management solutions for everyone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card">
              <Users className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-heading font-semibold mb-2">For Property Dealers</h3>
              <p className="text-text-secondary">
                Manage your property portfolio, handle tenant applications, track maintenance requests, and generate financial reports all in one place.
              </p>
            </div>

            <div className="card">
              <Home className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-heading font-semibold mb-2">For Tenants</h3>
              <p className="text-text-secondary">
                Browse premium properties, apply for rentals, schedule viewings, submit maintenance requests, and manage your lease documents.
              </p>
            </div>

            <div className="card">
              <Award className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-heading font-semibold mb-2">For Property Owners</h3>
              <p className="text-text-secondary">
                Get your properties listed, find qualified tenants, manage leases, and ensure compliance with UAE regulations effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary text-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-light mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust Property UAE for their real estate needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register" className="btn-secondary bg-white text-primary hover:bg-primary-light">
              Sign Up Now
            </Link>
            <Link href="/contact" className="btn-secondary border-white text-white hover:bg-white/10">
              Contact Us
            </Link>
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

