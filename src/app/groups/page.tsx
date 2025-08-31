'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useWallet } from '@/hooks/useWallet'
import { useKYC } from '@/hooks/useKYC'
import { useGroupManager } from '@/hooks/useContracts'
import { ConsortiumGroup } from '@/types'
import { 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatDate } from '@/utils/flare'

const GroupsPage: React.FC = () => {
  const { isConnected } = useWallet()
  const { kycData } = useKYC()
  const { getAllGroups, getGroup, isConnected: contractsConnected } = useGroupManager()
  const [groups, setGroups] = useState<ConsortiumGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<ConsortiumGroup[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'quota_asc' | 'quota_desc' | 'participants'>('newest')
  const [filterAssetType, setFilterAssetType] = useState<'all' | 'real_estate' | 'vehicle' | 'equipment'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch groups from blockchain
  useEffect(() => {
    const fetchGroups = async () => {
      if (!contractsConnected) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        console.log('Fetching groups from blockchain...')
        const groupIds = await getAllGroups()
        console.log(`Found ${groupIds.length} group IDs:`, groupIds)
        
        const fetchedGroups: ConsortiumGroup[] = []
        
        for (const groupId of groupIds) {
          try {
            console.log(`Fetching data for group: ${groupId}`)
            const groupData = await getGroup(groupId)
            
            if (!groupData) {
              console.warn(`Group data is null for ${groupId}, skipping`)
              continue
            }
            
            // Convert blockchain data to ConsortiumGroup format
            const group: ConsortiumGroup = {
              id: groupId,
              name: groupData.name || `Group ${groupId}`,
              assetType: 'real_estate', // Default for now, could be stored in metadata
              totalValue: groupData.totalValue,
              quotas: groupData.quotas,
              quotaValue: groupData.quotaValue,
              duration: groupData.duration,
              adminFee: groupData.adminFee,
              reserveFund: groupData.reserveFund,
              startDate: groupData.startDate,
              assemblyFrequency: 'monthly', // Default
              participants: groupData.participants,
              maxParticipants: groupData.maxParticipants || groupData.quotas,
              status: groupData.isActive ? 
                (groupData.participants >= groupData.maxParticipants ? 'full' : 'active') : 'inactive',
              organizerAddress: groupData.organizer,
              ipfsHash: groupData.ipfsHash || '',
            }
            
            fetchedGroups.push(group)
            console.log(`Successfully loaded group: ${group.name}`)
          } catch (error) {
            console.warn(`Failed to fetch group ${groupId}:`, error)
          }
        }
        
        console.log(`Successfully loaded ${fetchedGroups.length} groups`)
        setGroups(fetchedGroups)
        setFilteredGroups(fetchedGroups)
      } catch (error) {
        console.error('Error fetching groups:', error)
        let errorMessage = 'Failed to load groups from blockchain'
        
        if (error instanceof Error) {
          if (error.message.includes('could not decode result data')) {
            errorMessage = 'No groups available yet. Groups will appear here once they are created.'
          } else if (error.message.includes('network')) {
            errorMessage = 'Network connection error. Please check your connection and try again.'
          }
        }
        
        setError(errorMessage)
        setGroups([])
        setFilteredGroups([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractsConnected])

  // Filter and sort groups
  useEffect(() => {
    const filtered = groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesAssetType = filterAssetType === 'all' || group.assetType === filterAssetType
      return matchesSearch && matchesAssetType
    })

    // Sort groups
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'quota_asc':
          return a.quotaValue - b.quotaValue
        case 'quota_desc':
          return b.quotaValue - a.quotaValue
        case 'participants':
          return b.participants - a.participants
        case 'newest':
        default:
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      }
    })

    setFilteredGroups(filtered)
  }, [groups, searchTerm, sortBy, filterAssetType])

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
              Please connect your wallet to browse investment groups.
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
            <BuildingOfficeIcon className="w-16 h-16 text-warning-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              KYC Verification Required
            </h1>
            <p className="text-secondary-600 mb-6">
              Complete your identity verification to browse and join investment groups.
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
Investment Groups
          </h1>
          <p className="text-secondary-600">
            Explore and join real estate investment groups that match your goals
          </p>
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
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Asset Type Filter */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-4 h-4 text-secondary-500" />
                <select
                  value={filterAssetType}
                  onChange={(e) => setFilterAssetType(e.target.value as 'all' | 'real_estate' | 'vehicle' | 'equipment')}
                  className="form-input min-w-[140px]"
                >
                  <option value="all">All Types</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="equipment">Equipment</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'quota_asc' | 'quota_desc' | 'participants')}
                className="form-input min-w-[140px]"
              >
                <option value="newest">Newest First</option>
                <option value="quota_asc">Lowest Quota</option>
                <option value="quota_desc">Highest Quota</option>
                <option value="participants">Most Popular</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="card bg-red-50 border border-red-200 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Unable to Load Groups</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
                <div className="mt-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded-md transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Groups Grid */}
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
        ) : error ? (
          // Show empty state when there's an error
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              Connection Issue
            </h3>
            <p className="text-secondary-600">
              Unable to connect to the blockchain network. Please check your connection.
            </p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No groups found
            </h3>
            <p className="text-secondary-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <div className="card hover:shadow-lg transition-shadow cursor-pointer group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:flare-text transition-colors mb-1">
                      {group.name}
                    </h3>
                    <div className="flex items-center text-sm text-secondary-500">
                      <MapPinIcon className="w-4 h-4 mr-1" />
                      <span>Buenos Aires, Argentina</span>
                    </div>
                  </div>
                  <span className={`badge ${
                    group.status === 'active' ? 'badge-success' :
                    group.status === 'full' ? 'badge-warning' : 'badge-primary'
                  }`}>
                    {group.status}
                  </span>
                </div>

                {/* Key Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                      <span>Quota Value</span>
                    </div>
                    <span className="font-semibold text-secondary-900">
                      {formatCurrency(group.quotaValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <UsersIcon className="w-4 h-4 mr-1" />
                      <span>Participants</span>
                    </div>
                    <span className="font-semibold text-secondary-900">
                      {group.participants}/{group.maxParticipants}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      <span>Duration</span>
                    </div>
                    <span className="font-semibold text-secondary-900">
                      {group.duration} months
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span>Starts</span>
                    </div>
                    <span className="font-semibold text-secondary-900">
                      {formatDate(group.startDate)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-secondary-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round((group.participants / group.maxParticipants) * 100)}%</span>
                  </div>
                  <div className="w-full bg-secondary-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((group.participants / group.maxParticipants) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Action */}
                <button
                  disabled={group.status === 'full'}
                  className={`w-full ${group.status === 'full' ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}`}
                >
                  {group.status === 'full' ? 'Group Full' : 'View Details'}
                </button>
              </div>
            </Link>
            ))}
          </div>
        )}

        {/* Stats Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold flare-text mb-1">
              {groups.filter(g => g.status === 'active').length}
            </div>
            <div className="text-sm text-secondary-600">Active Groups</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold flare-text mb-1">
              {groups.reduce((sum, g) => sum + g.participants, 0)}
            </div>
            <div className="text-sm text-secondary-600">Total Participants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold flare-text mb-1">
              ${groups.reduce((sum, g) => sum + g.totalValue, 0).toLocaleString()}
            </div>
            <div className="text-sm text-secondary-600">Total Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold flare-text mb-1">
              {Math.round(groups.reduce((sum, g) => sum + (g.participants / g.maxParticipants), 0) / groups.length * 100)}%
            </div>
            <div className="text-sm text-secondary-600">Avg Fill Rate</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GroupsPage