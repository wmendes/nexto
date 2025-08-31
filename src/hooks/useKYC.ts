'use client'

import { useState, useEffect } from 'react'
import { KYCData } from '@/types'
import { useWallet } from './useWallet'

interface UseKYCReturn {
  kycData: KYCData | null
  isLoading: boolean
  error: string | null
  submitKYC: (data: KYCData) => Promise<void>
  retryKYC: () => void
  refreshKYC: () => Promise<void>
}

export const useKYC = (): UseKYCReturn => {
  const { address, isConnected } = useWallet()
  const [kycData, setKycData] = useState<KYCData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load KYC data from localStorage (in production, this would come from an API)
  const loadKYCData = async () => {
    if (!address || !isConnected) {
      setKycData(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would be an API call
      const savedKYC = localStorage.getItem(`kyc_${address}`)
      if (savedKYC) {
        const parsedKYC = JSON.parse(savedKYC)
        // Convert date strings back to Date objects
        parsedKYC.submittedAt = new Date(parsedKYC.submittedAt)
        if (parsedKYC.approvedAt) {
          parsedKYC.approvedAt = new Date(parsedKYC.approvedAt)
        }
        setKycData(parsedKYC)
      } else {
        setKycData(null)
      }
    } catch (err) {
      console.error('Error loading KYC data:', err)
      setError('Failed to load KYC data')
      setKycData(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Submit KYC data
  const submitKYC = async (data: KYCData) => {
    if (!address) {
      throw new Error('No wallet connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      // In production, this would be an API call to KYC service
      // For now, we'll simulate the process and save to localStorage
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simulate random approval/rejection for demo (in production this would be real KYC processing)
      const isApproved = Math.random() > 0.2 // 80% approval rate for demo
      
      const processedKYC: KYCData = {
        ...data,
        status: isApproved ? 'approved' : 'pending',
        submittedAt: new Date(),
        approvedAt: isApproved ? new Date() : undefined,
      }

      // Save to localStorage (in production, this would be handled by the backend)
      localStorage.setItem(`kyc_${address}`, JSON.stringify(processedKYC))
      
      setKycData(processedKYC)
    } catch (err) {
      console.error('Error submitting KYC:', err)
      setError('Failed to submit KYC data')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Retry KYC (for rejected applications)
  const retryKYC = () => {
    if (address) {
      localStorage.removeItem(`kyc_${address}`)
      setKycData(null)
    }
  }

  // Refresh KYC data
  const refreshKYC = async () => {
    await loadKYCData()
  }

  // Load KYC data when wallet connects or address changes
  useEffect(() => {
    loadKYCData()
  }, [address, isConnected])

  // Simulate KYC status updates (in production, this would be done via webhooks or polling)
  useEffect(() => {
    if (kycData && kycData.status === 'pending') {
      const timer = setTimeout(() => {
        // Simulate approval after 30 seconds for demo purposes
        const approvedKYC: KYCData = {
          ...kycData,
          status: 'approved',
          approvedAt: new Date(),
        }
        
        if (address) {
          localStorage.setItem(`kyc_${address}`, JSON.stringify(approvedKYC))
          setKycData(approvedKYC)
        }
      }, 30000) // 30 seconds

      return () => clearTimeout(timer)
    }
  }, [kycData, address])

  return {
    kycData,
    isLoading,
    error,
    submitKYC,
    retryKYC,
    refreshKYC,
  }
}