'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useWallet } from '@/hooks/useWallet'
import { useKYC } from '@/hooks/useKYC'
import { useGroups } from '@/hooks/useGroups'
import { ConsortiumGroup } from '@/types'
import {
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  MapPinIcon,
  ChartBarIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatDate, calculateMonthlyPayment } from '@/utils/flare'

const GroupDetailPage: React.FC = () => {
  const params = useParams()
  const router = useRouter()
  const { isConnected, address } = useWallet()
  const { kycData } = useKYC()
  const { getGroup, joinGroup: joinGroupContract, isLoading: groupsLoading } = useGroups()
  const [group, setGroup] = useState<ConsortiumGroup | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractsInitialized, setContractsInitialized] = useState(false)

  // Wait for contracts to initialize
  useEffect(() => {
    if (!groupsLoading) {
      setContractsInitialized(true)
    }
  }, [groupsLoading])

  // Load group data from contract
  useEffect(() => {
    const loadGroup = async () => {
      if (!params.id) return

      // Wait for contracts to initialize before attempting to load
      if (!contractsInitialized && !isConnected) {
        console.log('Waiting for contracts to initialize...')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        console.log('Loading group:', params.id)
        const groupData = await getGroup(params.id as string)
        if (groupData) {
          console.log('Group loaded successfully:', groupData)
          setGroup(groupData)
          
          // Check if user has already joined by checking participants
          if (address) {
            // In a real implementation, you'd check if the user's address is in the group
            // For now, we'll use the mock data approach
            setHasJoined(false) // Will be updated when we have the membership check
          }
        } else {
          console.log('Group not found:', params.id)
          setGroup(null)
        }
      } catch (err) {
        console.error('Error loading group:', err)
        setError('Failed to load group data from blockchain')
        setGroup(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadGroup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, address, contractsInitialized, isConnected])

  const handleJoinGroup = async () => {
    if (!group || !isConnected || kycData?.status !== 'approved') return

    setIsJoining(true)
    setError(null)

    try {
      // Create a simple token URI for the NFT
      const tokenURI = `https://consortium.app/metadata/${group.id}/${address}`
      
      await joinGroupContract(group.id, tokenURI)
      
      setHasJoined(true)
      setGroup(prev => prev ? {...prev, participants: prev.participants + 1} : null)
      
    } catch (error: unknown) {
      console.error('Error joining group:', error)
      setError((error as Error)?.message || 'Failed to join group. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <BuildingOfficeIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-secondary-600">
              Please connect your wallet to view group details.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || (!contractsInitialized && !isConnected)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="card">
                  <div className="h-6 bg-secondary-200 rounded mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(n => (
                      <div key={n} className="h-4 bg-secondary-200 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="h-6 bg-secondary-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map(n => (
                    <div key={n} className="h-4 bg-secondary-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-warning-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              Group Not Found
            </h1>
            <p className="text-secondary-600 mb-6">
              The consortium group you&apos;re looking for doesn&apos;t exist.
            </p>
            <button 
              onClick={() => router.push('/groups')}
              className="btn-primary"
            >
              Browse All Groups
            </button>
          </div>
        </div>
      </div>
    )
  }

  const monthlyPayment = calculateMonthlyPayment(group.quotaValue, group.adminFee, group.reserveFund)
  const canJoin = isConnected && kycData?.status === 'approved' && group.status === 'active' && !hasJoined

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => router.push('/groups')}
          className="flex items-center text-secondary-600 hover:text-primary-600 mb-6 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Groups
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                {group.name}
              </h1>
              <div className="flex items-center text-secondary-600">
                <MapPinIcon className="w-4 h-4 mr-1" />
                <span>Buenos Aires, Argentina</span>
              </div>
            </div>
            <span className={`badge text-sm px-3 py-1 ${
              group.status === 'active' ? 'badge-success' :
              group.status === 'full' ? 'badge-warning' : 'badge-primary'
            }`}>
              {group.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Group Overview
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center text-secondary-600 mb-2">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm">Total Property Value</span>
                  </div>
                  <div className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(group.totalValue)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-secondary-600 mb-2">
                    <CurrencyDollarIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm">Monthly Payment</span>
                  </div>
                  <div className="text-2xl font-bold text-secondary-900">
                    {formatCurrency(monthlyPayment)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-secondary-600 mb-2">
                    <ClockIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm">Duration</span>
                  </div>
                  <div className="text-lg font-semibold text-secondary-900">
                    {group.duration} months
                  </div>
                </div>

                <div>
                  <div className="flex items-center text-secondary-600 mb-2">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span className="text-sm">Start Date</span>
                  </div>
                  <div className="text-lg font-semibold text-secondary-900">
                    {formatDate(group.startDate)}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Financial Details
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-secondary-600">Base Quota Value</span>
                  <span className="font-semibold text-secondary-900">
                    {formatCurrency(group.quotaValue)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary-600">Administration Fee ({group.adminFee}%)</span>
                  <span className="font-semibold text-secondary-900">
                    {formatCurrency(group.quotaValue * (group.adminFee / 100))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary-600">Reserve Fund ({group.reserveFund}%)</span>
                  <span className="font-semibold text-secondary-900">
                    {formatCurrency(group.quotaValue * (group.reserveFund / 100))}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-semibold text-secondary-900">Total Monthly Payment</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(monthlyPayment)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="card">
              <h2 className="text-xl font-semibold text-secondary-900 mb-4">
                Terms & Conditions
              </h2>
              <div className="space-y-3 text-sm text-secondary-600">
                <div className="flex items-start">
                  <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 text-primary-500" />
                  <span>Monthly payments are due on the 1st of each month</span>
                </div>
                <div className="flex items-start">
                  <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 text-primary-500" />
                  <span>Assemblies are held {group.assemblyFrequency} to vote on group matters</span>
                </div>
                <div className="flex items-start">
                  <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 text-primary-500" />
                  <span>NFT shares can be traded on the marketplace</span>
                </div>
                <div className="flex items-start">
                  <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 text-primary-500" />
                  <span>Drawings are conducted monthly using Flare&apos;s Secure Random Numbers</span>
                </div>
                <div className="flex items-start">
                  <InformationCircleIcon className="w-4 h-4 mr-2 mt-0.5 text-primary-500" />
                  <span>All transactions are transparent and recorded on Flare blockchain</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Join Action */}
            <div className="card">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Join This Group
              </h3>

              {hasJoined ? (
                <div className="text-center py-4">
                  <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto mb-3" />
                  <div className="text-success-700 font-semibold mb-2">
                    Successfully Joined!
                  </div>
                  <div className="text-sm text-secondary-600 mb-4">
                    Your NFT share has been minted and is now in your wallet.
                  </div>
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="btn-primary w-full"
                  >
                    View Dashboard
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-error-50 border border-error-200 rounded-lg p-3 mb-4">
                      <div className="text-sm text-error-700">
                        {error}
                      </div>
                    </div>
                  )}

                  {kycData?.status !== 'approved' && (
                    <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-4">
                      <div className="text-sm text-warning-700">
                        Complete KYC verification to join groups
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Entry Cost</span>
                      <span className="font-semibold">{formatCurrency(monthlyPayment)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Network Fee</span>
                      <span className="font-semibold">~$2.50</span>
                    </div>
                  </div>

                  <button
                    onClick={handleJoinGroup}
                    disabled={!canJoin || isJoining}
                    className={`w-full ${canJoin ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                  >
                    {isJoining ? (
                      <div className="flex items-center justify-center">
                        <div className="loading-spinner w-4 h-4 mr-2"></div>
                        Joining...
                      </div>
                    ) : !canJoin && group.status === 'full' ? (
                      'Group Full'
                    ) : !canJoin && kycData?.status !== 'approved' ? (
                      'KYC Required'
                    ) : (
                      `Join for ${formatCurrency(monthlyPayment)}`
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Group Stats */}
            <div className="card">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Group Statistics
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-secondary-600">
                      <UsersIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">Participants</span>
                    </div>
                    <span className="font-semibold">
                      {group.participants}/{group.maxParticipants}
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${(group.participants / group.maxParticipants) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-secondary-500 mt-1">
                    {Math.round((group.participants / group.maxParticipants) * 100)}% filled
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-secondary-600">
                      <ChartBarIcon className="w-4 h-4 mr-2" />
                      <span className="text-sm">Available Spots</span>
                    </div>
                    <span className="font-semibold text-primary-600">
                      {group.maxParticipants - group.participants}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Organizer Info */}
            <div className="card">
              <h3 className="font-semibold text-secondary-900 mb-4">
                Organizer
              </h3>
              <div className="text-sm">
                <div className="text-secondary-600 mb-1">Address</div>
                <div className="font-mono text-xs text-secondary-900 break-all">
                  {group.organizerAddress}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupDetailPage