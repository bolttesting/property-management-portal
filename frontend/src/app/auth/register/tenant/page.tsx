'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI, uploadAPI } from '@/lib/api'
import Navigation from '@/components/Navigation'
import toast from 'react-hot-toast'
import { 
  Home, User, Mail, Phone, Upload, X, FileText, 
  MapPin, Briefcase, CreditCard, Calendar, Building,
  CheckCircle, AlertCircle
} from 'lucide-react'

export default function TenantRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const [formData, setFormData] = useState({
    // Step 1: Basic Information
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    nationality: '',
    dateOfBirth: '',
    
    // Step 2: UAE Documents
    emiratesId: '',
    passportNumber: '',
    passportExpiry: '',
    visaNumber: '',
    visaExpiry: '',
    visaType: '',
    
    // Step 3: Employment Details
    employmentStatus: '',
    companyName: '',
    jobTitle: '',
    monthlySalary: '',
    employmentStartDate: '',
    workEmail: '',
    workPhone: '',
    
    // Step 4: Address & Documents
    currentAddress: {
      emirate: '',
      area: '',
      building: '',
      apartment: '',
      street: '',
      poBox: '',
    },
  })

  const [documents, setDocuments] = useState({
    emiratesIdDocument: '',
    passportDocument: '',
    visaDocument: '',
    salaryCertificateDocument: '',
    bankStatementDocument: '',
    employmentContractDocument: '',
  })

  const uaeNationalities = [
    'UAE', 'India', 'Pakistan', 'Bangladesh', 'Philippines', 'Egypt', 'Sri Lanka',
    'Nepal', 'Jordan', 'Lebanon', 'Syria', 'Sudan', 'Yemen', 'Tunisia', 'Morocco',
    'Algeria', 'Iraq', 'Palestine', 'UK', 'USA', 'Canada', 'Australia', 'South Africa',
    'Other'
  ]

  const visaTypes = [
    'Employment Visa',
    'Family Visa',
    'Investor Visa',
    'Student Visa',
    'Tourist Visa',
    'Residence Visa',
    'Other'
  ]

  const employmentStatuses = [
    'Employed',
    'Self-Employed',
    'Business Owner',
    'Freelancer',
    'Student',
    'Unemployed',
    'Retired'
  ]

  const emirates = [
    'Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 
    'Ras Al Khaimah', 'Fujairah'
  ]

  const handleDocumentUpload = async (field: string, file: File) => {
    setUploading(field)
    try {
      const response = await uploadAPI.uploadDocument(file)
      setDocuments({
        ...documents,
        [field]: response.data.data.fileUrl,
      })
      toast.success('Document uploaded successfully')
    } catch (error: any) {
      toast.error('Failed to upload document')
    } finally {
      setUploading(null)
    }
  }

  const removeDocument = (field: string) => {
    setDocuments({
      ...documents,
      [field]: '',
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.email && !formData.mobile) {
          toast.error('Email or mobile number is required')
          return false
        }
        if (!formData.password || formData.password.length < 8) {
          toast.error('Password must be at least 8 characters')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match')
          return false
        }
        if (!formData.fullName) {
          toast.error('Full name is required')
          return false
        }
        if (!formData.nationality) {
          toast.error('Nationality is required')
          return false
        }
        return true
      case 2:
        if (!formData.emiratesId) {
          toast.error('Emirates ID is required')
          return false
        }
        if (!formData.passportNumber) {
          toast.error('Passport number is required')
          return false
        }
        if (!documents.emiratesIdDocument) {
          toast.error('Emirates ID document is required')
          return false
        }
        if (!documents.passportDocument) {
          toast.error('Passport document is required')
          return false
        }
        return true
      case 3:
        if (!formData.employmentStatus) {
          toast.error('Employment status is required')
          return false
        }
        if (formData.employmentStatus !== 'Unemployed' && formData.employmentStatus !== 'Student' && formData.employmentStatus !== 'Retired') {
          if (!formData.companyName) {
            toast.error('Company name is required')
            return false
          }
          if (!formData.monthlySalary) {
            toast.error('Monthly salary is required')
            return false
          }
        }
        return true
      case 4:
        if (!formData.currentAddress.emirate) {
          toast.error('Current emirate is required')
          return false
        }
        if (!formData.currentAddress.area) {
          toast.error('Current area is required')
          return false
        }
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(currentStep)) {
      return
    }

    setLoading(true)

    try {
      await authAPI.registerTenant({
        email: formData.email || null,
        mobile: formData.mobile || null,
        password: formData.password,
        fullName: formData.fullName,
        nationality: formData.nationality,
        employmentStatus: formData.employmentStatus,
        emiratesId: formData.emiratesId,
        passportNumber: formData.passportNumber,
        visaNumber: formData.visaNumber || null,
        currentAddress: formData.currentAddress,
        // Employment details
        companyName: formData.companyName || null,
        jobTitle: formData.jobTitle || null,
        monthlySalary: formData.monthlySalary ? parseFloat(formData.monthlySalary) : null,
        employmentStartDate: formData.employmentStartDate || null,
        // Documents
        emiratesIdDocument: documents.emiratesIdDocument || null,
        passportDocument: documents.passportDocument || null,
        visaDocument: documents.visaDocument || null,
        salaryCertificateDocument: documents.salaryCertificateDocument || null,
        bankStatementDocument: documents.bankStatementDocument || null,
        employmentContractDocument: documents.employmentContractDocument || null,
      })
      toast.success('Registration successful! Please login.')
      router.push('/auth/login')
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === currentStep
                    ? 'bg-primary text-white'
                    : step < currentStep
                    ? 'bg-green-500 text-white'
                    : 'bg-background-gray text-text-tertiary'
                }`}
              >
                {step < currentStep ? <CheckCircle className="h-6 w-6" /> : step}
              </div>
              <p className="mt-2 text-xs text-center text-text-secondary">
                {step === 1 && 'Basic Info'}
                {step === 2 && 'Documents'}
                {step === 3 && 'Employment'}
                {step === 4 && 'Address'}
              </p>
            </div>
            {step < totalSteps && (
              <div
                className={`h-1 flex-1 mx-2 ${
                  step < currentStep ? 'bg-green-500' : 'bg-background-gray'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-primary">
              Create Tenant Account
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Complete your registration with all required UAE documents
            </p>
          </div>

        <div className="card">
          {renderStepIndicator()}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="input-field pl-10"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="input-field pl-10"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Mobile Number *
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Nationality *
                    </label>
                    <select
                      required
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select Nationality</option>
                      {uaeNationalities.map((nat) => (
                        <option key={nat} value={nat}>{nat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Password *
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
                      Confirm Password *
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
                </div>
              </div>
            )}

            {/* Step 2: UAE Documents */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">UAE Documents</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      All documents must be clear, valid, and in PDF or image format. Maximum file size: 10MB per document.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Emirates ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.emiratesId}
                      onChange={(e) => setFormData({ ...formData, emiratesId: e.target.value })}
                      className="input-field"
                      placeholder="784-xxxx-xxxxxxx-x"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Emirates ID Document *
                    </label>
                    <DocumentUpload
                      value={documents.emiratesIdDocument}
                      onChange={(file) => handleDocumentUpload('emiratesIdDocument', file)}
                      onRemove={() => removeDocument('emiratesIdDocument')}
                      uploading={uploading === 'emiratesIdDocument'}
                      label="Upload Emirates ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.passportNumber}
                      onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                      className="input-field"
                      placeholder="A12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Passport Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.passportExpiry}
                      onChange={(e) => setFormData({ ...formData, passportExpiry: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Passport Document *
                  </label>
                  <DocumentUpload
                    value={documents.passportDocument}
                    onChange={(file) => handleDocumentUpload('passportDocument', file)}
                    onRemove={() => removeDocument('passportDocument')}
                    uploading={uploading === 'passportDocument'}
                    label="Upload Passport"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Visa Number
                    </label>
                    <input
                      type="text"
                      value={formData.visaNumber}
                      onChange={(e) => setFormData({ ...formData, visaNumber: e.target.value })}
                      className="input-field"
                      placeholder="Visa number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Visa Type
                    </label>
                    <select
                      value={formData.visaType}
                      onChange={(e) => setFormData({ ...formData, visaType: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select Visa Type</option>
                      {visaTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Visa Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.visaExpiry}
                      onChange={(e) => setFormData({ ...formData, visaExpiry: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Visa Document
                    </label>
                    <DocumentUpload
                      value={documents.visaDocument}
                      onChange={(file) => handleDocumentUpload('visaDocument', file)}
                      onRemove={() => removeDocument('visaDocument')}
                      uploading={uploading === 'visaDocument'}
                      label="Upload Visa"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Employment Details */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">Employment Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Employment Status *
                  </label>
                  <select
                    required
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select Employment Status</option>
                    {employmentStatuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {formData.employmentStatus && 
                 formData.employmentStatus !== 'Unemployed' && 
                 formData.employmentStatus !== 'Student' && 
                 formData.employmentStatus !== 'Retired' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Company Name *
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                          <input
                            type="text"
                            required
                            value={formData.companyName}
                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                            className="input-field pl-10"
                            placeholder="Company name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Job Title
                        </label>
                        <input
                          type="text"
                          value={formData.jobTitle}
                          onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                          className="input-field"
                          placeholder="Job title"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Monthly Salary (AED) *
                        </label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.monthlySalary}
                            onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                            className="input-field pl-10"
                            placeholder="15000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Employment Start Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                          <input
                            type="date"
                            value={formData.employmentStartDate}
                            onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
                            className="input-field pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Work Email
                        </label>
                        <input
                          type="email"
                          value={formData.workEmail}
                          onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                          className="input-field"
                          placeholder="work@company.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Work Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.workPhone}
                          onChange={(e) => setFormData({ ...formData, workPhone: e.target.value })}
                          className="input-field"
                          placeholder="+971 4 xxx xxxx"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Salary Certificate Document
                      </label>
                      <DocumentUpload
                        value={documents.salaryCertificateDocument}
                        onChange={(file) => handleDocumentUpload('salaryCertificateDocument', file)}
                        onRemove={() => removeDocument('salaryCertificateDocument')}
                        uploading={uploading === 'salaryCertificateDocument'}
                        label="Upload Salary Certificate"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Bank Statement (Last 3 months)
                      </label>
                      <DocumentUpload
                        value={documents.bankStatementDocument}
                        onChange={(file) => handleDocumentUpload('bankStatementDocument', file)}
                        onRemove={() => removeDocument('bankStatementDocument')}
                        uploading={uploading === 'bankStatementDocument'}
                        label="Upload Bank Statement"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Employment Contract
                      </label>
                      <DocumentUpload
                        value={documents.employmentContractDocument}
                        onChange={(file) => handleDocumentUpload('employmentContractDocument', file)}
                        onRemove={() => removeDocument('employmentContractDocument')}
                        uploading={uploading === 'employmentContractDocument'}
                        label="Upload Employment Contract"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 4: Current Address */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold mb-4">Current Address</h3>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Emirate *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                    <select
                      required
                      value={formData.currentAddress.emirate}
                      onChange={(e) => setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress, emirate: e.target.value }
                      })}
                      className="input-field pl-10"
                    >
                      <option value="">Select Emirate</option>
                      {emirates.map((emirate) => (
                        <option key={emirate} value={emirate}>{emirate}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Area *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.currentAddress.area}
                      onChange={(e) => setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress, area: e.target.value }
                      })}
                      className="input-field"
                      placeholder="e.g., Dubai Downtown"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Building Name
                    </label>
                    <input
                      type="text"
                      value={formData.currentAddress.building}
                      onChange={(e) => setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress, building: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Building name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Apartment/Unit Number
                    </label>
                    <input
                      type="text"
                      value={formData.currentAddress.apartment}
                      onChange={(e) => setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress, apartment: e.target.value }
                      })}
                      className="input-field"
                      placeholder="101"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Street
                    </label>
                    <input
                      type="text"
                      value={formData.currentAddress.street}
                      onChange={(e) => setFormData({
                        ...formData,
                        currentAddress: { ...formData.currentAddress, street: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Street name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    P.O. Box
                  </label>
                  <input
                    type="text"
                    value={formData.currentAddress.poBox}
                    onChange={(e) => setFormData({
                      ...formData,
                      currentAddress: { ...formData.currentAddress, poBox: e.target.value }
                    })}
                    className="input-field"
                    placeholder="P.O. Box number"
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-border">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                >
                  <span>Next</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                </button>
              )}
            </div>
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

// Document Upload Component
function DocumentUpload({ 
  value, 
  onChange, 
  onRemove, 
  uploading, 
  label 
}: { 
  value: string
  onChange: (file: File) => void
  onRemove: () => void
  uploading: boolean
  label: string
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      onChange(file)
    }
  }

  return (
    <div>
      {value ? (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-green-800">Document uploaded</span>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-background-gray transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                <p className="text-sm text-text-secondary">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 mb-2 text-text-tertiary" />
                <p className="mb-2 text-sm text-text-secondary">
                  <span className="font-semibold">Click to upload</span> {label}
                </p>
                <p className="text-xs text-text-tertiary">PDF, JPG, PNG (Max 10MB)</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  )
}

