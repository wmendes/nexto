'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useWallet } from '@/hooks/useWallet'
import { useKYC } from '@/hooks/useKYC'
import { useConsortiumNFT, useGroupManager } from '@/hooks/useContracts'
import { ConsortiumNFT, ConsortiumGroup } from '@/types'
import {
  CubeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatDate, getFlareExplorerUrl } from '@/utils/flare'

const NFTsPage: React.FC = () => {
  const { isConnected, address } = useWallet()
  const { kycData } = useKYC()
  const { getOwnerTokens, getConsortiumShare } = useConsortiumNFT()
  const { getGroup } = useGroupManager()
  const [nfts, setNfts] = useState<ConsortiumNFT[]>([])
  const [filteredNfts, setFilteredNfts] = useState<ConsortiumNFT[]>([])
  const [groups, setGroups] = useState<Record<string, ConsortiumGroup>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'contemplated' | 'transferred'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'value_asc' | 'value_desc'>('newest')
  const [isLoading, setIsLoading] = useState(true)

  // Fetch NFT data from blockchain
  useEffect(() => {
    const fetchNFTs = async () => {
      if (!address || kycData?.status !== 'approved') {
        setNfts([])
        setFilteredNfts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        console.log('Fetching NFTs for address:', address)
        // Get token IDs owned by the user
        const tokenIds = await getOwnerTokens(address)
        console.log('Found token IDs:', tokenIds)
        
        // Remove duplicates and ensure unique token IDs
        const uniqueTokenIds = [...new Set(tokenIds)]
        console.log('Unique token IDs:', uniqueTokenIds)
        
        // Fetch details for each token and its group
        const nftPromises = uniqueTokenIds.map(async (tokenId: number) => {
          try {
            const share = await getConsortiumShare(tokenId)
            
            // Fetch group data for this NFT
            let groupData = null
            try {
              groupData = await getGroup(share.groupId)
            } catch (error) {
              console.error(`Error fetching group ${share.groupId}:`, error)
            }
            
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
              metadataUri: `ipfs://consortium-nft-${tokenId}.json`,
              transactionHash: '0x' + Array.from({length: 64}, () => 
                Math.floor(Math.random() * 16).toString(16)).join('')
            }
            
            // Return both NFT and group data
            return { nft, groupData }
          } catch (error) {
            console.error(`Error fetching NFT ${tokenId}:`, error)
            return null
          }
        })

        const fetchedResults = await Promise.all(nftPromises)
        const validResults = fetchedResults.filter(result => result !== null)
        
        // Separate NFTs and groups
        const validNfts = validResults.map(result => result.nft)
        const groupsMap: Record<string, ConsortiumGroup> = {}
        
        validResults.forEach(result => {
          if (result.groupData) {
            groupsMap[result.nft.groupId] = {
              id: result.nft.groupId,
              name: result.groupData.name,
              assetType: 'real_estate',
              totalValue: result.groupData.totalValue,
              quotas: result.groupData.quotas,
              quotaValue: result.groupData.quotaValue,
              duration: result.groupData.duration,
              adminFee: result.groupData.adminFee,
              reserveFund: result.groupData.reserveFund,
              startDate: result.groupData.startDate,
              assemblyFrequency: 'monthly',
              participants: result.groupData.participants,
              maxParticipants: result.groupData.maxParticipants,
              status: result.groupData.isActive ? 'active' : 'completed',
              organizerAddress: result.groupData.organizer,
              ipfsHash: result.groupData.ipfsHash || '',
            }
          }
        })
        
        setNfts(validNfts)
        setFilteredNfts(validNfts)
        setGroups(groupsMap)
      } catch (error) {
        console.error('Error fetching NFTs:', error)
        setNfts([])
        setFilteredNfts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchNFTs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, kycData?.status])


  // Filter and sort NFTs
  useEffect(() => {
    const filtered = nfts.filter(nft => {
      const group = groups[nft.groupId]
      const matchesSearch = searchTerm === '' || 
                          (group && group.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          nft.tokenId.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || nft.status === statusFilter
      return matchesSearch && matchesStatus
    })

    // Sort NFTs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.mintedAt).getTime() - new Date(b.mintedAt).getTime()
        case 'value_asc':
          return a.quotaValue - b.quotaValue
        case 'value_desc':
          return b.quotaValue - a.quotaValue
        case 'newest':
        default:
          return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime()
      }
    })

    setFilteredNfts(filtered)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nfts, searchTerm, statusFilter, sortBy])

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <CubeIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-secondary-600">
              Please connect your wallet to view your NFT portfolio.
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
            <CubeIcon className="w-16 h-16 text-warning-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              KYC Verification Required
            </h1>
            <p className="text-secondary-600 mb-6">
              Complete your identity verification to view and manage your NFT shares.
            </p>
            <a href="/dashboard" className="btn-primary">
              Complete Verification
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">
              My NFT Portfolio
            </h1>
            <p className="text-secondary-600">
              Manage your tokenized property shares and track payments
            </p>
          </div>
          <Link
            href="/groups"
            className="btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Join Groups</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-secondary-900 mb-1">
              {nfts.length}
            </div>
            <div className="text-sm text-secondary-600">Total NFTs</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-success-600 mb-1">
              {nfts.filter(nft => nft.status === 'active').length}
            </div>
            <div className="text-sm text-secondary-600">Active</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {formatCurrency(nfts.reduce((sum, nft) => sum + nft.quotaValue, 0))}
            </div>
            <div className="text-sm text-secondary-600">Total Value</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-warning-600 mb-1">
              {nfts.filter(nft => nft.paymentStatus === 'current').length}
            </div>
            <div className="text-sm text-secondary-600">Payments Current</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  placeholder="Search NFTs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-4 h-4 text-secondary-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'contemplated' | 'transferred')}
                  className="form-input min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="contemplated">Contemplated</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'value_desc' | 'value_asc')}
                className="form-input min-w-[140px]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="value_desc">Highest Value</option>
                <option value="value_asc">Lowest Value</option>
              </select>
            </div>
          </div>
        </div>

        {/* NFTs Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="card animate-pulse">
                <div className="h-4 bg-secondary-200 rounded mb-4"></div>
                <div className="h-3 bg-secondary-200 rounded mb-2"></div>
                <div className="h-3 bg-secondary-200 rounded mb-6"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-secondary-200 rounded"></div>
                  <div className="h-3 bg-secondary-200 rounded"></div>
                  <div className="h-3 bg-secondary-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNfts.length === 0 ? (
          <div className="text-center py-12">
            {nfts.length === 0 ? (
              <>
                <CubeIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  No NFTs Yet
                </h3>
                <p className="text-secondary-600 mb-6">
                  Join investment groups to receive your first NFT shares.
                </p>
                <Link href="/groups" className="btn-primary">
                  Browse Groups
                </Link>
              </>
            ) : (
              <>
                <ExclamationCircleIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  No matches found
                </h3>
                <p className="text-secondary-600">
                  Try adjusting your search or filter criteria.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNfts.map((nft) => {
              const group = groups[nft.groupId]
              return (
                <div key={nft.tokenId} className="card hover:shadow-lg transition-shadow group cursor-pointer">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <CubeIcon className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900">#{nft.tokenId}</div>
                        <div className="text-xs text-secondary-500">Token ID</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`badge text-xs ${
                        nft.status === 'active' ? 'badge-success' :
                        nft.status === 'contemplated' ? 'badge-primary' : 'badge-secondary'
                      }`}>
                        {nft.status}
                      </span>
                      <span className={`badge text-xs ${
                        nft.paymentStatus === 'current' ? 'badge-success' :
                        nft.paymentStatus === 'late' ? 'badge-warning' : 'badge-error'
                      }`}>
                        {nft.paymentStatus}
                      </span>
                    </div>
                  </div>

                  {/* Group Info */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-secondary-900 group-hover:flare-text transition-colors mb-1">
                      {group ? group.name : `Group ${nft.groupId}`}
                    </h3>
                    {group && (
                      <div className="text-sm text-secondary-600">
                        {group.assetType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    )}
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-secondary-600">
                        <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                        <span>Quota Value</span>
                      </div>
                      <span className="font-semibold text-secondary-900">
                        {formatCurrency(nft.quotaValue)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-secondary-600">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        <span>Minted</span>
                      </div>
                      <span className="font-semibold text-secondary-900">
                        {formatDate(nft.mintedAt)}
                      </span>
                    </div>

                    {nft.nextPaymentDue && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-secondary-600">
                          <CalendarIcon className="w-4 h-4 mr-1" />
                          <span>Next Payment</span>
                        </div>
                        <span className={`font-semibold ${
                          new Date(nft.nextPaymentDue) < new Date() 
                            ? 'text-error-600' 
                            : 'text-secondary-900'
                        }`}>
                          {formatDate(nft.nextPaymentDue)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <button className="btn-secondary flex-1 text-sm">
                      View Details
                    </button>
                    <a
                      href={getFlareExplorerUrl('tx', nft.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary p-2"
                      title="View on Explorer"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default NFTsPage