'use client'

import { useState } from 'react'
import { useWallet } from './useWallet'
import { useGroupManager } from './useContracts'
import { Payment } from '@/types'

interface UsePaymentsReturn {
  makePayment: (groupId: string, amount: number) => Promise<string>
  getPaymentHistory: (userAddress: string, groupId: string) => Promise<Payment[]>
  getNextPaymentDue: (tokenId: string) => Promise<{ amount: number; dueDate: Date } | null>
  getPaymentStatus: (tokenId: string) => Promise<'current' | 'late' | 'defaulted'>
  isLoading: boolean
  error: string | null
}

export const usePayments = (): UsePaymentsReturn => {
  const { isConnected } = useWallet()
  const groupManager = useGroupManager()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const makePayment = async (groupId: string, amount: number): Promise<string> => {
    if (!groupManager.isConnected || !isConnected) {
      throw new Error('Group Manager contract not available or wallet not connected')
    }

    setIsLoading(true)
    setError(null)

    try {
      // For now, we'll use the GroupManager's makePayment function
      // In the real implementation, the GroupManager accepts payments in the configured token
      const { tx } = await groupManager.makePayment(groupId, amount)
      const receipt = await tx.wait()
      
      // Return transaction hash
      return receipt.hash
    } catch (err: unknown) {
      console.error('Payment failed:', err)
      const errorMessage = (err instanceof Error ? err.message : 'Payment failed')
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getPaymentHistory = async (userAddress: string, groupId: string): Promise<Payment[]> => {
    if (!groupManager.isConnected) {
      console.warn('Group Manager contract not available - returning empty payment history')
      return []
    }

    try {
      // Get user's payment info from the GroupManager
      const paymentInfo = await groupManager.getUserPaymentInfo(groupId, userAddress)
      
      // TODO: In a full implementation, you would query payment events from the blockchain
      // For now, we create basic payment entries based on available data
      const payments: Payment[] = []
      
      if (paymentInfo.totalPaid > 0) {
        // Create payment entries based on contract data
        // This is simplified - in production you'd parse event logs for detailed history
        payments.push({
          id: `${groupId}-${userAddress}-${Date.now()}`,
          nftTokenId: '0', // Would be obtained from related NFT
          groupId,
          amount: paymentInfo.totalPaid,
          currency: 'FLR',
          status: 'completed',
          transactionHash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          paidAt: paymentInfo.lastPayment,
          dueDate: paymentInfo.lastPayment,
          paymentType: 'quota'
        })
      }
      
      return payments
    } catch (err) {
      console.error('Error getting payment history:', err)
      return []
    }
  }

  const getNextPaymentDue = async (tokenId: string): Promise<{ amount: number; dueDate: Date } | null> => {
    if (!groupManager.isConnected) {
      return null
    }

    try {
      // TODO: In a full implementation, this would calculate the next due payment 
      // based on the group's payment schedule and the user's payment history
      
      // For now, return a monthly payment due on the 1st of next month
      const nextMonth = new Date()
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      nextMonth.setDate(1)
      
      return {
        amount: 2000, // Placeholder amount - would be based on group quota value
        dueDate: nextMonth
      }
    } catch (err) {
      console.error('Error getting next payment due:', err)
      return null
    }
  }

  const getPaymentStatus = async (tokenId: string): Promise<'current' | 'late' | 'defaulted'> => {
    if (!groupManager.isConnected) {
      return 'current'
    }

    try {
      // This is a simplified implementation
      // In a real system, you'd check the NFT contract for payment status
      // For now, return 'current' as default
      return 'current'
    } catch (err) {
      console.error('Error getting payment status:', err)
      return 'current'
    }
  }

  return {
    makePayment,
    getPaymentHistory,
    getNextPaymentDue,
    getPaymentStatus,
    isLoading,
    error
  }
}

