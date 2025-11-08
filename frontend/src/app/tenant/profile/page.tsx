'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { tenantAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Save, User as UserIcon, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff, Home } from 'lucide-react'
import Link from 'next/link'

export default function TenantProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, hasHydrated, updateUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [formData, setFormData] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    dateOfBirth: '',
    nationality: '',
    emiratesId: '',
    passportNumber: '',
    visaNumber: '',
    employmentStatus: '',
    address: {
      street: '',
      city: '',
      emirate: '',
      postalCode: '',
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
  })

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'tenant') {
      router.push('/auth/login')
      return
    }

    loadProfile()
  }, [hasHydrated, isAuthenticated, user, router])

  const loadProfile = async () => {
    try {
      const response = await tenantAPI.getProfile()
      if (response.data?.success && response.data?.data?.profile) {
        const profile = response.data.data.profile
        setProfile(profile)
        
        // Parse full_name into firstName and lastName for display
        const fullNameParts = (profile.full_name || '').split(' ')
        const firstName = fullNameParts[0] || ''
        const lastName = fullNameParts.slice(1).join(' ') || ''
        
        setFormData({
          fullName: profile.full_name || '',
          firstName,
          lastName,
          email: profile.email || user?.email || '',
          mobile: profile.mobile || user?.mobile || '',
          dateOfBirth: profile.date_of_birth || '',
          nationality: profile.nationality || '',
          emiratesId: profile.emirates_id || '',
          passportNumber: profile.passport_number || '',
          visaNumber: profile.visa_number || '',
          employmentStatus: profile.employment_status || '',
          address: typeof profile.current_address === 'string' 
            ? JSON.parse(profile.current_address || '{}')
            : (profile.current_address || {
                street: '',
                city: '',
                emirate: '',
                postalCode: '',
              }),
          emergencyContact: typeof profile.emergency_contact === 'string'
            ? JSON.parse(profile.emergency_contact || '{}')
            : (profile.emergency_contact || {
                name: '',
                relationship: '',
                phone: '',
              }),
        })
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Use fullName if provided, otherwise combine firstName and lastName
      const fullName = formData.fullName || `${formData.firstName} ${formData.lastName}`.trim()
      
      // Use authAPI.updateProfile to update both user table (mobile, email) and tenant table
      await authAPI.updateProfile({
        mobile: formData.mobile,
        fullName: fullName || undefined,
        nationality: formData.nationality || undefined,
        emiratesId: formData.emiratesId || undefined,
        passportNumber: formData.passportNumber || undefined,
        visaNumber: formData.visaNumber || undefined,
        employmentStatus: formData.employmentStatus || undefined,
        currentAddress: formData.address || undefined,
      })
      toast.success('Profile updated successfully!')
      loadProfile() // Reload to get updated data
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to update profile'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    setChangingPassword(true)

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      toast.success('Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
    } catch (error: any) {
      console.error('Failed to change password:', error)
      const errorMessage = error.response?.data?.error?.message || 
                          error.response?.data?.message || 
                          'Failed to change password'
      toast.error(errorMessage)
    } finally {
      setChangingPassword(false)
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-full">
              <UserIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">Edit Profile</h1>
              <p className="text-text-secondary">Update your personal information</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName || `${formData.firstName} ${formData.lastName}`.trim()}
                    onChange={(e) => {
                      const fullName = e.target.value
                      const parts = fullName.split(' ')
                      setFormData({ 
                        ...formData, 
                        fullName,
                        firstName: parts[0] || '',
                        lastName: parts.slice(1).join(' ') || ''
                      })
                    }}
                    className="input-field"
                    required
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="input-field bg-background-gray"
                  />
                  <p className="text-xs text-text-secondary mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Mobile
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Emirates ID
                  </label>
                  <input
                    type="text"
                    value={formData.emiratesId}
                    onChange={(e) => setFormData({ ...formData, emiratesId: e.target.value })}
                    className="input-field"
                    placeholder="123-4567-1234567-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                    className="input-field"
                    placeholder="A12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Visa Number
                  </label>
                  <input
                    type="text"
                    value={formData.visaNumber}
                    onChange={(e) => setFormData({ ...formData, visaNumber: e.target.value })}
                    className="input-field"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Employment Status
                  </label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select employment status</option>
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self Employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Emirate
                  </label>
                  <input
                    type="text"
                    value={formData.address.emirate}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, emirate: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, postalCode: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                    })}
                    className="input-field"
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                    })}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Change Password
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    Update your account password for better security
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(!showPasswordForm)
                    if (showPasswordForm) {
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    }
                  }}
                  className="btn-secondary"
                >
                  {showPasswordForm ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordForm && (
                <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Enter your current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Enter your new password (min. 8 characters)"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="input-field pr-10"
                        placeholder="Confirm your new password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      }}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="btn-primary"
                    >
                      {changingPassword ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => router.push('/tenant/dashboard')}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

