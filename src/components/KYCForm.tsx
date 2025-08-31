'use client'

import React, { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { 
  DocumentTextIcon, 
  CameraIcon, 
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline'
import { KYCData } from '@/types'

interface KYCFormProps {
  onSubmit?: (data: KYCData) => void
  initialData?: Partial<KYCData>
}

const KYCForm: React.FC<KYCFormProps> = ({ onSubmit, initialData }) => {
  const { address } = useWallet()
  const [formData, setFormData] = useState({
    fullName: initialData?.fullName || '',
    email: initialData?.email || '',
    documentId: initialData?.documentId || '',
  })
  const [documentImage, setDocumentImage] = useState<File | null>(null)
  const [selfieImage, setSelfieImage] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'selfie') => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ 
          ...prev, 
          [type]: 'File size must be less than 5MB' 
        }))
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ 
          ...prev, 
          [type]: 'Please select a valid image file' 
        }))
        return
      }

      if (type === 'document') {
        setDocumentImage(file)
        setErrors(prev => ({ ...prev, document: '' }))
      } else {
        setSelfieImage(file)
        setErrors(prev => ({ ...prev, selfie: '' }))
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.documentId.trim()) {
      newErrors.documentId = 'Document ID is required'
    }

    if (!documentImage) {
      newErrors.document = 'Document image is required'
    }

    if (!selfieImage) {
      newErrors.selfie = 'Selfie image is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setStatus('submitting')

    try {
      // Simulate KYC API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      const kycData: KYCData = {
        ...formData,
        documentImage: documentImage!,
        selfieImage: selfieImage!,
        status: 'pending',
        submittedAt: new Date(),
      }

      if (onSubmit) {
        onSubmit(kycData)
      }

      setStatus('success')
    } catch (error) {
      setStatus('error')
      console.error('KYC submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-secondary-200">
        <div className="text-center">
          <CheckCircleIcon className="w-16 h-16 text-success-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
            KYC Submitted Successfully!
          </h2>
          <p className="text-secondary-600 mb-6">
            Your identity verification has been submitted and is being reviewed. 
            You'll receive an email confirmation shortly.
          </p>
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-700">
              <strong>What's next?</strong> Our team will review your submission within 24 hours. 
              Once approved, you'll be able to join investment groups and participate in draws.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-secondary-200">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-secondary-900 mb-2">
          Identity Verification (KYC)
        </h2>
        <p className="text-secondary-600">
          Complete your identity verification to join investment groups and participate in the platform.
        </p>
      </div>

      {status === 'error' && (
        <div className="mb-6 bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <XCircleIcon className="w-5 h-5" />
          <span>Something went wrong. Please try again.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">Personal Information</h3>
          
          <div>
            <label htmlFor="fullName" className="form-label">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className={`form-input ${errors.fullName ? 'border-error-300' : ''}`}
              placeholder="Enter your full legal name"
              disabled={isSubmitting}
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-error-600">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${errors.email ? 'border-error-300' : ''}`}
              placeholder="Enter your email address"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-error-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="documentId" className="form-label">
              Document ID *
            </label>
            <input
              type="text"
              id="documentId"
              name="documentId"
              value={formData.documentId}
              onChange={handleInputChange}
              className={`form-input ${errors.documentId ? 'border-error-300' : ''}`}
              placeholder="Enter your document/passport number"
              disabled={isSubmitting}
            />
            {errors.documentId && (
              <p className="mt-1 text-sm text-error-600">{errors.documentId}</p>
            )}
          </div>
        </div>

        {/* Document Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-secondary-900">Document Upload</h3>
          
          <div>
            <label className="form-label">
              Government ID or Passport *
            </label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              errors.document ? 'border-error-300' : 'border-secondary-300 hover:border-primary-400'
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'document')}
                className="hidden"
                id="documentUpload"
                disabled={isSubmitting}
              />
              <label htmlFor="documentUpload" className="cursor-pointer">
                <DocumentTextIcon className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                <p className="text-sm text-secondary-600">
                  {documentImage ? documentImage.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-secondary-500 mt-1">
                  PNG, JPG, GIF up to 5MB
                </p>
              </label>
            </div>
            {errors.document && (
              <p className="mt-1 text-sm text-error-600">{errors.document}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              Selfie Photo *
            </label>
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              errors.selfie ? 'border-error-300' : 'border-secondary-300 hover:border-primary-400'
            }`}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'selfie')}
                className="hidden"
                id="selfieUpload"
                disabled={isSubmitting}
              />
              <label htmlFor="selfieUpload" className="cursor-pointer">
                <CameraIcon className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                <p className="text-sm text-secondary-600">
                  {selfieImage ? selfieImage.name : 'Click to upload your selfie'}
                </p>
                <p className="text-xs text-secondary-500 mt-1">
                  Clear photo holding your ID next to your face
                </p>
              </label>
            </div>
            {errors.selfie && (
              <p className="mt-1 text-sm text-error-600">{errors.selfie}</p>
            )}
          </div>
        </div>

        {/* Connected Wallet Info */}
        <div className="bg-secondary-50 rounded-lg p-4">
          <h4 className="font-medium text-secondary-900 mb-2">Connected Wallet</h4>
          <p className="text-sm text-secondary-600 font-mono">{address}</p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
        >
          {isSubmitting ? (
            <>
              <div className="loading-spinner w-4 h-4"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="w-5 h-5" />
              <span>Submit for Verification</span>
            </>
          )}
        </button>

        <div className="text-center">
          <p className="text-xs text-secondary-500">
            By submitting, you agree to our terms and privacy policy. 
            Your data is encrypted and stored securely.
          </p>
        </div>
      </form>
    </div>
  )
}

export default KYCForm