'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useWallet } from '@/hooks/useWallet'
import { useKYC } from '@/hooks/useKYC'
import { useConsortiumNFT } from '@/hooks/useContracts'
import Header from '@/components/Header'
import KYCForm from '@/components/KYCForm'
import KYCStatus from '@/components/KYCStatus'
import { 
  CubeIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ShoppingBagIcon 
} from '@heroicons/react/24/outline'

const DashboardPage: React.FC = () => {
  const { isConnected, address, balance } = useWallet()
  const { kycData, submitKYC, retryKYC } = useKYC()
  const { getOwnerTokens, getConsortiumShare } = useConsortiumNFT()
  const [showKYCForm, setShowKYCForm] = useState(false)
  const [userStats, setUserStats] = useState({
    nftsOwned: 0,
    activeGroups: 0,
    totalInvested: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!address || kycData?.status !== 'approved') {
        setUserStats({
          nftsOwned: 0,
          activeGroups: 0,
          totalInvested: 0
        })
        setIsLoadingStats(false)
        return
      }

      setIsLoadingStats(true)
      try {
        console.log('Fetching user NFTs for dashboard stats...')
        
        // Get all NFTs owned by the user
        const tokenIds = await getOwnerTokens(address)
        const nftsOwned = tokenIds.length
        
        console.log(`Found ${nftsOwned} NFTs for user:`, tokenIds)
        
        // Fetch NFT details to calculate stats
        const nftPromises = tokenIds.map(async (tokenId: number) => {
          try {
            const share = await getConsortiumShare(tokenId)
            return {
              tokenId,
              groupId: share.groupId,
              quotaValue: share.quotaValue,
              isContemplated: share.isContemplated
            }
          } catch (error) {
            console.error(`Error fetching NFT ${tokenId}:`, error)
            return null
          }
        })

        const nftDetails = await Promise.all(nftPromises)
        const validNfts = nftDetails.filter(nft => nft !== null)
        
        // Calculate stats from actual NFT data
        const totalInvested = validNfts.reduce((sum, nft) => sum + nft.quotaValue, 0)
        const uniqueGroups = new Set(validNfts.map(nft => nft.groupId))
        const activeGroups = uniqueGroups.size
        
        console.log('Dashboard stats calculated:', {
          nftsOwned,
          activeGroups,
          totalInvested,
          uniqueGroups: Array.from(uniqueGroups)
        })
        
        setUserStats({
          nftsOwned,
          activeGroups,
          totalInvested
        })
      } catch (error) {
        console.error('Error fetching user data:', error)
        setUserStats({
          nftsOwned: 0,
          activeGroups: 0,
          totalInvested: 0
        })
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchUserData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, kycData?.status])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-secondary-600">
              Please connect your wallet to access the dashboard.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleKYCSubmit = async (data: unknown) => {
    try {
      await submitKYC(data)
      setShowKYCForm(false)
    } catch (error) {
      console.error('KYC submission failed:', error)
    }
  }

  const handleRetryKYC = () => {
    retryKYC()
    setShowKYCForm(true)
  }

  const showKYCFormModal = () => {
    setShowKYCForm(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Welcome to your Dashboard
          </h1>
          <p className="text-secondary-600">
            Manage your real estate investments and NFT portfolio
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CurrencyDollarIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div className="text-2xl font-bold text-secondary-900 mb-1">
              {parseFloat(balance.flr).toFixed(2)}
            </div>
            <div className="text-sm text-secondary-600">FLR Balance</div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CubeIcon className="w-6 h-6 text-secondary-600" />
            </div>
            <div className="text-2xl font-bold text-secondary-900 mb-1">
              {isLoadingStats ? '...' : userStats.nftsOwned}
            </div>
            <div className="text-sm text-secondary-600">NFTs Owned</div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BuildingOfficeIcon className="w-6 h-6 text-success-600" />
            </div>
            <div className="text-2xl font-bold text-secondary-900 mb-1">
              {isLoadingStats ? '...' : userStats.activeGroups}
            </div>
            <div className="text-sm text-secondary-600">Active Groups</div>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-6 h-6 text-warning-600" />
            </div>
            <div className="text-2xl font-bold text-secondary-900 mb-1">
              ${isLoadingStats ? '...' : userStats.totalInvested.toLocaleString()}
            </div>
            <div className="text-sm text-secondary-600">Total Invested</div>
          </div>
        </div>

        {/* KYC Section */}
        <div className="mb-8">
          {!showKYCForm ? (
            <KYCStatus 
              kyc={kycData} 
              onRetry={handleRetryKYC}
            />
          ) : (
            <KYCForm onSubmit={handleKYCSubmit} />
          )}

          {!kycData && !showKYCForm && (
            <div className="mt-4 text-center">
              <button 
                onClick={showKYCFormModal}
                className="btn-primary"
              >
                Start Verification
              </button>
            </div>
          )}
        </div>

        {/* Action Cards */}
        {kycData?.status === 'approved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/groups">
              <div className="card group hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 flare-gradient rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:flare-text transition-colors">
                      Browse Groups
                    </h3>
                    <p className="text-sm text-secondary-600">
                      Explore available investment groups
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/nfts">
              <div className="card group hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 flare-gradient rounded-lg flex items-center justify-center">
                    <CubeIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:flare-text transition-colors">
                      My NFTs
                    </h3>
                    <p className="text-sm text-secondary-600">
                      View and manage your NFT shares
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/marketplace">
              <div className="card group hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 flare-gradient rounded-lg flex items-center justify-center">
                    <ShoppingBagIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:flare-text transition-colors">
                      Marketplace
                    </h3>
                    <p className="text-sm text-secondary-600">
                      Trade NFT shares with other users
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Wallet Info */}
        <div className="mt-8 card">
          <h3 className="font-semibold text-secondary-900 mb-4">
            Connected Wallet
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary-600">Address:</span>
              <span className="font-mono text-secondary-900">{address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Network:</span>
              <span className="text-secondary-900">Flare Network</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary-600">Balance:</span>
              <span className="text-secondary-900">{parseFloat(balance.flr).toFixed(4)} FLR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage