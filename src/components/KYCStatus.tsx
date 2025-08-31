'use client'

import React from 'react'
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'
import { KYCData } from '@/types'

interface KYCStatusProps {
  kyc: KYCData | null
  onRetry?: () => void
}

const KYCStatus: React.FC<KYCStatusProps> = ({ kyc, onRetry }) => {
  if (!kyc) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="w-8 h-8 text-warning-500" />
          <div>
            <h3 className="font-semibold text-secondary-900">KYC Required</h3>
            <p className="text-sm text-secondary-600">
              Complete identity verification to access all features
            </p>
          </div>
        </div>
      </div>
    )
  }

  const getStatusConfig = (status: KYCData['status']) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircleIcon,
          iconColor: 'text-success-500',
          bgColor: 'bg-success-50',
          borderColor: 'border-success-200',
          title: 'Verification Approved',
          description: 'Your identity has been verified. You can now access all platform features.',
          badge: 'badge-success'
        }
      case 'pending':
        return {
          icon: ClockIcon,
          iconColor: 'text-warning-500',
          bgColor: 'bg-warning-50',
          borderColor: 'border-warning-200',
          title: 'Verification Pending',
          description: 'Your documents are being reviewed. This usually takes 24-48 hours.',
          badge: 'badge-warning'
        }
      case 'rejected':
        return {
          icon: XCircleIcon,
          iconColor: 'text-error-500',
          bgColor: 'bg-error-50',
          borderColor: 'border-error-200',
          title: 'Verification Rejected',
          description: 'Your submission was rejected. Please check your documents and try again.',
          badge: 'badge-error'
        }
    }
  }

  const config = getStatusConfig(kyc.status)
  const StatusIcon = config.icon

  return (
    <div className={`border rounded-xl p-6 ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start space-x-4">
        <StatusIcon className={`w-8 h-8 ${config.iconColor} flex-shrink-0`} />
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-secondary-900">{config.title}</h3>
            <span className={`${config.badge} capitalize`}>
              {kyc.status}
            </span>
          </div>
          
          <p className="text-sm text-secondary-600 mb-4">
            {config.description}
          </p>

          <div className="space-y-2 text-sm text-secondary-500">
            <div className="flex justify-between">
              <span>Submitted:</span>
              <span>{kyc.submittedAt.toLocaleDateString()}</span>
            </div>
            
            {kyc.approvedAt && (
              <div className="flex justify-between">
                <span>Approved:</span>
                <span>{kyc.approvedAt.toLocaleDateString()}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>Full Name:</span>
              <span>{kyc.fullName}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Email:</span>
              <span>{kyc.email}</span>
            </div>
          </div>

          {kyc.status === 'rejected' && onRetry && (
            <div className="mt-4">
              <button 
                onClick={onRetry}
                className="btn-primary text-sm"
              >
                Retry Verification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default KYCStatus