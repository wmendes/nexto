'use client'

import React, { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { useWallet } from '@/hooks/useWallet'
import { useKYC } from '@/hooks/useKYC'
import { usePayments } from '@/hooks/usePayments'
import { useConsortiumNFT, useGroupManager } from '@/hooks/useContracts'
import { Payment, ConsortiumNFT, ConsortiumGroup } from '@/types'
import {
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatDate, formatDateTime, getFlareExplorerUrl, getDaysUntilDue } from '@/utils/flare'

const PaymentsPage: React.FC = () => {
  const { isConnected, address, balance } = useWallet()
  const { kycData } = useKYC()
  const { makePayment, getPaymentHistory, getNextPaymentDue, getPaymentStatus, isLoading, error } = usePayments()
  const { getOwnerTokens, getConsortiumShare } = useConsortiumNFT()
  const { getGroup } = useGroupManager()
  
  const [userNfts, setUserNfts] = useState<ConsortiumNFT[]>([])
  const [selectedNft, setSelectedNft] = useState<ConsortiumNFT | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [nextDue, setNextDue] = useState<{ amount: number; dueDate: Date } | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'current' | 'late' | 'defaulted'>('current')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentCurrency, setPaymentCurrency] = useState<'FLR'>('FLR')
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null)
  const [groups, setGroups] = useState<Record<string, ConsortiumGroup>>({})

  // Load NFTs from blockchain when component mounts or when KYC status changes
  useEffect(() => {
    const loadUserNFTs = async () => {
      if (!isConnected || !address || kycData?.status !== 'approved') {
        setUserNfts([])
        setSelectedNft(null)
        return
      }

      try {
        console.log('Loading user NFTs from blockchain...')
        
        // Get token IDs owned by the user
        const tokenIds = await getOwnerTokens(address)
        console.log(`Found ${tokenIds.length} NFTs for user`)
        
        // Fetch details for each token
        const nftPromises = tokenIds.map(async (tokenId: number) => {
          try {
            const share = await getConsortiumShare(tokenId)
            
            // Convert contract data to ConsortiumNFT format
            const nft: ConsortiumNFT = {
              tokenId: tokenId.toString(),
              groupId: share.groupId,
              ownerAddress: address,
              mintedAt: share.mintedAt,
              quotaValue: share.quotaValue,
              status: share.isContemplated ? 'contemplated' : 'active',
              paymentStatus: share.paymentStatus === 0 ? 'current' : 
                           share.paymentStatus === 1 ? 'late' : 'defaulted',
              nextPaymentDue: share.lastPaymentAt > 0 ? 
                new Date(share.lastPaymentAt * 1000 + 30 * 24 * 60 * 60 * 1000) : undefined,
              metadataUri: `https://consortium.app/metadata/${share.groupId}/${tokenId}.json`,
              transactionHash: '0x' + Array.from({length: 64}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('')
            }
            return nft
          } catch (error) {
            console.error(`Error fetching NFT ${tokenId}:`, error)
            return null
          }
        })

        const fetchedNfts = await Promise.all(nftPromises)
        const validNfts = fetchedNfts.filter((nft): nft is ConsortiumNFT => nft !== null)
        
        setUserNfts(validNfts)
        
        // Auto-select first NFT if none selected
        if (validNfts.length > 0 && !selectedNft) {
          setSelectedNft(validNfts[0])
        }
        
        // Load group details for each NFT
        const groupPromises = validNfts.map(async (nft) => {
          try {
            const groupData = await getGroup(nft.groupId)
            if (groupData) {
              return {
                id: nft.groupId,
                name: groupData.name || `Group ${nft.groupId}`,
                assetType: 'real_estate' as const,
                totalValue: groupData.totalValue,
                quotas: groupData.quotas,
                quotaValue: groupData.quotaValue,
                duration: groupData.duration,
                adminFee: groupData.adminFee,
                reserveFund: groupData.reserveFund,
                startDate: groupData.startDate,
                assemblyFrequency: 'monthly' as const,
                participants: groupData.participants,
                maxParticipants: groupData.maxParticipants,
                status: groupData.isActive ? 'active' as const : 'inactive' as const,
                organizerAddress: groupData.organizer,
                ipfsHash: groupData.ipfsHash || '',
              }
            }
            return null
          } catch (error) {
            console.error(`Error fetching group ${nft.groupId}:`, error)
            return null
          }
        })
        
        const fetchedGroups = await Promise.all(groupPromises)
        const groupsMap = fetchedGroups.reduce((acc, group) => {
          if (group) {
            acc[group.id] = group
          }
          return acc
        }, {} as Record<string, ConsortiumGroup>)
        
        setGroups(groupsMap)
        console.log(`Loaded ${validNfts.length} NFTs and ${Object.keys(groupsMap).length} groups`)
        
      } catch (error) {
        console.error('Error loading user NFTs:', error)
        setUserNfts([])
        setSelectedNft(null)
      }
    }

    loadUserNFTs()
  }, [isConnected, address, kycData?.status])

  useEffect(() => {
    if (selectedNft) {
      loadPaymentData()
    }
  }, [selectedNft])

  const loadPaymentData = async () => {
    if (!selectedNft || !address) return

    try {
      const [history, due, status] = await Promise.all([
        getPaymentHistory(address, selectedNft.groupId),
        getNextPaymentDue(selectedNft.tokenId),
        getPaymentStatus(selectedNft.tokenId)
      ])

      setPayments(history)
      setNextDue(due)
      setPaymentStatus(status)
    } catch (error) {
      console.error('Error loading payment data:', error)
    }
  }

  const handlePayment = async () => {
    if (!selectedNft || !nextDue) return

    try {
      const txHash = await makePayment(selectedNft.groupId, nextDue.amount)
      setPaymentSuccess(txHash)
      setShowPaymentModal(false)
      
      // Reload payment data
      setTimeout(() => {
        loadPaymentData()
      }, 1000)
    } catch (error) {
      console.error('Payment failed:', error)
    }
  }

  const generateReceipt = (payment: Payment) => {
    // In production, this would generate a proper PDF receipt
    const receiptData = {
      paymentId: payment.id,
      tokenId: payment.nftTokenId,
      amount: payment.amount,
      currency: payment.currency,
      date: payment.paidAt,
      transactionHash: payment.transactionHash
    }
    
    const dataStr = JSON.stringify(receiptData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const link = document.createElement('a')
    link.href = dataUri
    link.download = `receipt-${payment.id}.json`
    link.click()
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <CreditCardIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-secondary-600">
              Please connect your wallet to view and make payments.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (kycData?.status !== 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <CreditCardIcon className="w-16 h-16 text-warning-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              KYC Verification Required
            </h1>
            <p className="text-secondary-600 mb-6">
              Complete your identity verification to make payments.
            </p>
            <a href="/dashboard" className="btn-primary">
              Complete Verification
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (userNfts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <CreditCardIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              No Active NFTs
            </h1>
            <p className="text-secondary-600 mb-6">
              Join a consortium group to start making payments.
            </p>
            <a href="/groups" className="btn-primary">
              Browse Groups
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Payment Center
          </h1>
          <p className="text-secondary-600">
            Make payments and track your payment history for consortium shares
          </p>
        </div>

        {/* Success Message */}
        {paymentSuccess && (
          <div className="bg-success-50 border border-success-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-success-600 mr-2" />
              <div className="text-sm text-success-700">
                Payment successful! Transaction hash: 
                <a 
                  href={getFlareExplorerUrl('tx', paymentSuccess)}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 underline font-medium"
                >
                  {paymentSuccess.slice(0, 10)}...
                </a>
              </div>
              <button 
                onClick={() => setPaymentSuccess(null)}
                className="ml-auto text-success-600 hover:text-success-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* NFT Selection & Payment */}
          <div className="lg:col-span-2 space-y-6">
            {/* NFT Selection */}
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Select NFT to Pay
              </h2>
              <div className="space-y-3">
                {userNfts.map((nft) => {
                  const group = groups[nft.groupId]
                  return (
                    <div
                      key={nft.tokenId}
                      onClick={() => setSelectedNft(nft)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedNft?.tokenId === nft.tokenId
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-secondary-200 hover:border-secondary-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-secondary-900">
                            {group?.name || `Group ${nft.groupId}`}
                          </div>
                          <div className="text-sm text-secondary-600">
                            NFT #{nft.tokenId} • {formatCurrency(nft.quotaValue)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`badge ${
                            nft.paymentStatus === 'current' ? 'badge-success' :
                            nft.paymentStatus === 'late' ? 'badge-warning' : 'badge-error'
                          }`}>
                            {nft.paymentStatus}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment Due */}
            {selectedNft && nextDue && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-secondary-900">
                    Next Payment Due
                  </h2>
                  <div className={`badge ${
                    paymentStatus === 'current' ? 'badge-success' :
                    paymentStatus === 'late' ? 'badge-warning' : 'badge-error'
                  }`}>
                    {paymentStatus}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="flex items-center text-secondary-600 mb-2">
                      <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">Amount Due</span>
                    </div>
                    <div className="text-2xl font-bold text-secondary-900">
                      {formatCurrency(nextDue.amount)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center text-secondary-600 mb-2">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">Due Date</span>
                    </div>
                    <div className="text-lg font-semibold text-secondary-900">
                      {formatDate(nextDue.dueDate)}
                    </div>
                    <div className={`text-sm ${
                      getDaysUntilDue(nextDue.dueDate) < 0 ? 'text-error-600' :
                      getDaysUntilDue(nextDue.dueDate) < 7 ? 'text-warning-600' : 'text-secondary-600'
                    }`}>
                      {getDaysUntilDue(nextDue.dueDate) < 0 
                        ? `${Math.abs(getDaysUntilDue(nextDue.dueDate))} days overdue`
                        : `${getDaysUntilDue(nextDue.dueDate)} days remaining`
                      }
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowPaymentModal(true)}
                  disabled={isLoading}
                  className="btn-primary w-full"
                >
                  {isLoading ? 'Processing...' : 'Make Payment'}
                </button>
              </div>
            )}

            {/* Payment History */}
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Payment History
              </h2>
              
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
                  <div className="text-secondary-600">No payments yet</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-secondary-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          payment.status === 'completed' ? 'bg-success-100' : 'bg-warning-100'
                        }`}>
                          <CheckCircleIcon className={`w-4 h-4 ${
                            payment.status === 'completed' ? 'text-success-600' : 'text-warning-600'
                          }`} />
                        </div>
                        <div>
                          <div className="font-semibold text-secondary-900">
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                          <div className="text-sm text-secondary-600">
                            {formatDateTime(payment.paidAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => generateReceipt(payment)}
                          className="btn-secondary p-2"
                          title="Download Receipt"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                        <a
                          href={getFlareExplorerUrl('tx', payment.transactionHash || '')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary p-2"
                          title="View on Explorer"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Balance */}
            <div className="card">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Wallet Balance
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-secondary-600">FLR Balance</span>
                  <span className="font-semibold text-secondary-900">
                    {parseFloat(balance.flr).toFixed(4)} FLR
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            {selectedNft && (
              <div className="card">
                <h3 className="font-semibold text-secondary-900 mb-4">
                  Payment Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Total Payments Made</span>
                    <span className="font-semibold text-secondary-900">{payments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Amount Paid (FLR)</span>
                    <span className="font-semibold text-secondary-900">
                      {formatCurrency(payments.reduce((sum, p) => sum + (p.currency === 'FLR' ? p.amount : 0), 0), 'FLR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Payment Status</span>
                    <span className={`font-semibold ${
                      paymentStatus === 'current' ? 'text-success-600' :
                      paymentStatus === 'late' ? 'text-warning-600' : 'text-error-600'
                    }`}>
                      {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="card">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Need Help?
              </h3>
              <div className="text-sm text-secondary-600 space-y-2">
                <p>• Payments are due monthly on the 1st</p>
                <p>• Late payments may incur additional fees</p>
                <p>• You can pay with FLR tokens only</p>
                <p>• Receipts are available for all payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && nextDue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-secondary-900 mb-4">
              Make Payment
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-secondary-600">Amount</span>
                <span className="font-semibold">{formatCurrency(nextDue.amount)}</span>
              </div>
              
              <div>
                <label className="form-label">Payment Method</label>
                <div className="form-input w-full bg-gray-50 cursor-not-allowed">
                  Pay with FLR (Native Token)
                </div>
                <p className="text-sm text-secondary-500 mt-1">
                  Payments are made using Flare (FLR) tokens only
                </p>
              </div>

              <div className="bg-secondary-50 rounded-lg p-3 text-sm text-secondary-600">
                <div className="flex justify-between">
                  <span>Network Fee</span>
                  <span>~$2.50</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                className="btn-primary flex-1"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : `Pay ${formatCurrency(nextDue.amount, paymentCurrency)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentsPage