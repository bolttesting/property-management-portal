'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Mail, Phone, MapPin, Send, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Navigation from '@/components/Navigation'
import toast from 'react-hot-toast'
import { contactAPI } from '@/lib/api'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // Dubai villa images from Unsplash
  const heroImages = [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80', // Modern villa
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80', // Luxury property
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&q=80', // Dubai villa
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&q=80', // Elegant home
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1920&q=80', // Premium villa
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      await contactAPI.submit({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject,
        message: formData.message,
      })
      
      toast.success('Thank you for your message! We will get back to you soon.')
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch (error: any) {
      console.error('Contact form error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to send message. Please try again.'
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
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
              Contact Us
            </h1>
            <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto drop-shadow-lg">
              Have questions? We're here to help! Get in touch with our team
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 md:py-24 bg-background-light">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-large shadow-medium p-8">
              <h2 className="text-2xl font-heading font-bold mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    placeholder="+971 50 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-field"
                    placeholder="How can we help you?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-field"
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {submitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6">Get in Touch</h2>
                <p className="text-lg text-text-secondary mb-8">
                  We're here to assist you with any questions about our services, properties, or how to get started. Reach out to us through any of the following channels.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-primary-light rounded-full p-3 mr-4">
                    <MapPin className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">Address</h3>
                    <p className="text-text-secondary">
                      Dubai, United Arab Emirates<br />
                      Business Bay, Dubai
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary-light rounded-full p-3 mr-4">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">Phone</h3>
                    <p className="text-text-secondary">
                      <a href="tel:+971XXXXXXXXX" className="text-primary hover:underline">
                        +971 XX XXX XXXX
                      </a>
                      <br />
                      <span className="text-sm text-text-tertiary">Mon - Fri, 9:00 AM - 6:00 PM GST</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary-light rounded-full p-3 mr-4">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">Email</h3>
                    <p className="text-text-secondary">
                      <a href="mailto:info@propertyuae.com" className="text-primary hover:underline">
                        info@propertyuae.com
                      </a>
                      <br />
                      <a href="mailto:support@propertyuae.com" className="text-primary hover:underline">
                        support@propertyuae.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary-light rounded-full p-3 mr-4">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary mb-1">Support</h3>
                    <p className="text-text-secondary">
                      24/7 Customer Support Available<br />
                      <span className="text-sm text-text-tertiary">We're always here to help</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-large shadow-medium p-6">
                <h3 className="font-semibold text-text-primary mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="/properties" className="block text-primary hover:underline">
                    Browse Properties
                  </Link>
                  <Link href="/about" className="block text-primary hover:underline">
                    Learn More About Us
                  </Link>
                  <Link href="/auth/register" className="block text-primary hover:underline">
                    Create an Account
                  </Link>
                  <Link href="/auth/login" className="block text-primary hover:underline">
                    Login to Your Account
                  </Link>
                </div>
              </div>
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

