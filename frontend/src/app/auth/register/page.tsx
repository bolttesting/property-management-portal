'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Home, User, Mail, Phone, Building2 } from 'lucide-react'
import Navigation from '@/components/Navigation'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userTypeParam = searchParams.get('type')
  const [selectedUserType, setSelectedUserType] = useState<'tenant' | 'owner'>(userTypeParam === 'owner' ? 'owner' : 'tenant')
  const setAuth = useAuthStore((state) => state.setAuth)

  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    firstName: '',
    lastName: '',
    companyName: '',
    ownerType: 'management_company',
    nationality: '',
    employmentStatus: '',
    emiratesId: '',
    passportNumber: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      if (selectedUserType === 'tenant') {
        // Register tenant with basic info - they can complete profile later
        // Only send fields that have values, don't send null fields
        const tenantData: any = {
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
          fullName: formData.fullName,
        }
        
        // Only include optional fields if they have values
        if (formData.nationality) tenantData.nationality = formData.nationality
        if (formData.employmentStatus) tenantData.employmentStatus = formData.employmentStatus
        if (formData.emiratesId) tenantData.emiratesId = formData.emiratesId
        if (formData.passportNumber) tenantData.passportNumber = formData.passportNumber
        
        const response = await authAPI.registerTenant(tenantData)
        
        if (response.data?.success && response.data?.data?.token) {
          // Auto-login after registration
          setAuth(response.data.data.user, response.data.data.token)
          toast.success('Account created successfully! You can now complete your profile.')
          router.push('/tenant/profile')
        } else {
          toast.success('Registration successful! Please login.')
          router.push('/auth/login')
        }
      } else {
        await authAPI.registerOwner({
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          ownerType: formData.ownerType,
          companyName: formData.companyName,
        })
        toast.success('Registration submitted! Please wait for admin approval.')
        router.push('/auth/login')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          error.message ||
                          'Registration failed'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-primary">
              Create your account
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Choose your account type to get started
            </p>
          </div>

          <div className="card">
            {/* User Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-primary mb-3">
                I want to sign up as:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedUserType('tenant')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedUserType === 'tenant'
                      ? 'border-primary bg-primary-light/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-text-primary">Tenant</p>
                  <p className="text-xs text-text-secondary mt-1">Looking for a property</p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserType('owner')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedUserType === 'owner'
                      ? 'border-primary bg-primary-light/20'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-text-primary">Property Dealer</p>
                  <p className="text-xs text-text-secondary mt-1">Manage properties</p>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedUserType === 'tenant' ? (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="input-field pl-10"
                      placeholder="John Smith"
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    You can add more details like Emirates ID, passport, and documents in your profile after registration.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="input-field"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="input-field"
                        placeholder="Smith"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                      <input
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="input-field pl-10"
                        placeholder="ABC Property Management"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field pl-10"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="input-field pl-10"
                    placeholder="+971 50 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input-field"
                  placeholder="Re-enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
