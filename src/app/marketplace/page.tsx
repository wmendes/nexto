'use client'

import React, { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { useWallet } from '@/hooks/useWallet'
import { useKYC } from '@/hooks/useKYC'
import { useMarketplace } from '@/hooks/useContracts'
import { useConsortiumNFT } from '@/hooks/useContracts'
import { MarketplaceListing, ConsortiumGroup } from '@/types'
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UsersIcon,
  ClockIcon,
  HeartIcon,
  ArrowTopRightOnSquareIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatDate, getFlareExplorerUrl, shortenAddress } from '@/utils/flare'

const MarketplacePage: React.FC = () => {
  const { isConnected, address } = useWallet()
  const { kycData } = useKYC()
  const { getActiveListings, getListing } = useMarketplace()
  const { getConsortiumShare } = useConsortiumNFT()
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [priceFilter, setPriceFilter] = useState<'all' | 'under_2000' | '2000_3000' | 'over_3000'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'expiring'>('newest')
  const [isLoading, setIsLoading] = useState(true)

  // Fetch marketplace listings from blockchain
  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true)
      try {
        // Get active listing IDs from marketplace contract
        const listingIds = await getActiveListings()
        
        // Fetch details for each listing
        const listingPromises = listingIds.map(async (listingId: number) => {
          try {
            const listing = await getListing(listingId)
            
            // Get NFT details for the token
            const nftShare = await getConsortiumShare(listing.tokenId)
            
            // Convert contract data to MarketplaceListing format
            const marketplaceListing: MarketplaceListing = {
              id: listingId.toString(),
              tokenId: listing.tokenId.toString(),
              sellerAddress: listing.seller,
              price: listing.price,
              currency: 'FLR', // Marketplace uses FLR for now
              status: listing.isActive ? 'active' : 'sold',
              listedAt: listing.listedAt,
              expiresAt: listing.expiresAt,
              groupDetails: {
                id: nftShare.groupId,
                name: `Group ${nftShare.groupId}`,
                assetType: 'real_estate', // Default for now
                totalValue: nftShare.quotaValue * 100, // Estimate total value
                quotas: 100, // Default for now
                quotaValue: nftShare.quotaValue,
                duration: 60, // Default for now
                adminFee: 3, // Default for now
                reserveFund: 2, // Default for now
                startDate: nftShare.mintedAt,
                assemblyFrequency: 'monthly', // Default for now
                participants: 50, // Default for now
                maxParticipants: 100, // Default for now
                status: 'active', // Default for now
                organizerAddress: '0x' + Array.from({length: 40}, () => 
                  Math.floor(Math.random() * 16).toString(16)).join(''),
                ipfsHash: `QmGroup${nftShare.groupId}...`,
              },
              nftDetails: {
                tokenId: listing.tokenId.toString(),
                groupId: nftShare.groupId,
                ownerAddress: listing.seller,
                mintedAt: nftShare.mintedAt,
                quotaValue: nftShare.quotaValue,
                status: 'active',
                paymentStatus: nftShare.paymentStatus === 0 ? 'current' : 
                             nftShare.paymentStatus === 1 ? 'late' : 'defaulted',
                nextPaymentDue: nftShare.lastPaymentAt > 0 ? 
                  new Date(nftShare.lastPaymentAt * 1000 + 30 * 24 * 60 * 60 * 1000) : undefined,
                metadataUri: `ipfs://consortium-nft-${listing.tokenId}.json`,
                transactionHash: '0x' + Array.from({length: 64}, () => 
                  Math.floor(Math.random() * 16).toString(16)).join('')
              }
            }
            return marketplaceListing
          } catch (error) {
            console.error(`Error fetching listing ${listingId}:`, error)
            return null
          }
        })

        const fetchedListings = await Promise.all(listingPromises)
        const validListings = fetchedListings.filter((listing): listing is MarketplaceListing => listing !== null)
        
        setListings(validListings)
        setFilteredListings(validListings)
      } catch (error) {
        console.error('Error fetching marketplace listings:', error)
        setListings([])
        setFilteredListings([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchListings()
  }, [isConnected])

  // Filter and sort listings
  useEffect(() => {
    const filtered = listings.filter(listing => {
      const matchesSearch = searchTerm === '' || 
                          listing.groupDetails.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          listing.tokenId.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPrice = 
        priceFilter === 'all' ||
        (priceFilter === 'under_2000' && listing.price < 2000) ||
        (priceFilter === '2000_3000' && listing.price >= 2000 && listing.price <= 3000) ||
        (priceFilter === 'over_3000' && listing.price > 3000)
      
      return matchesSearch && matchesPrice && listing.status === 'active'
    })

    // Sort listings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price
        case 'price_desc':
          return b.price - a.price
        case 'expiring':
          return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
        case 'newest':
        default:
          return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
      }
    })

    setFilteredListings(filtered)
  }, [listings, searchTerm, priceFilter, sortBy])

  const handlePurchase = async (listing: MarketplaceListing) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    if (kycData?.status !== 'approved') {
      alert('Please complete KYC verification first')
      return
    }

    try {
      const confirmed = confirm(`Purchase NFT #${listing.tokenId} for ${formatCurrency(listing.price, listing.currency)}?`)
      if (confirmed) {
        // In production, this would call the marketplace smart contract
        // For now, we'll simulate the purchase
        alert('Purchase functionality will be implemented with smart contracts')
        
        // TODO: Implement actual purchase using marketplace.buyNFT(listingId)
        // const { buyNFT } = useMarketplace()
        // const txHash = await buyNFT(Number(listing.id))
        // console.log('Purchase transaction:', txHash)
      }
    } catch (error) {
      console.error('Purchase failed:', error)
      alert('Purchase failed. Please try again.')
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <ShoppingBagIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold text-secondary-900 mb-4">
              Connect Your Wallet
            </h1>
            <p className="text-secondary-600">
              Please connect your wallet to browse the NFT marketplace.
            </p>
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
            NFT Marketplace
          </h1>
          <p className="text-secondary-600">
            Buy and sell tokenized property shares from other participants
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-2xl font-bold text-primary-600 mb-1">
              {listings.filter(l => l.status === 'active').length}
            </div>
            <div className="text-sm text-secondary-600">Active Listings</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-secondary-900 mb-1">
              {formatCurrency(
                listings
                  .filter(l => l.status === 'active')
                  .reduce((sum, l) => sum + l.price, 0) / listings.filter(l => l.status === 'active').length || 0,
                'FLR'
              )}
            </div>
            <div className="text-sm text-secondary-600">Avg Price</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-success-600 mb-1">
              {formatCurrency(Math.min(...listings.filter(l => l.status === 'active').map(l => l.price)), 'FLR')}
            </div>
            <div className="text-sm text-secondary-600">Lowest Price</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-warning-600 mb-1">
              0
            </div>
            <div className="text-sm text-secondary-600">Sales Today</div>
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
                  placeholder="Search listings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Price Filter */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-4 h-4 text-secondary-500" />
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as any)}
                  className="form-input min-w-[160px]"
                >
                  <option value="all">All Prices</option>
                  <option value="under_2000">Under 2,000 FLR</option>
                  <option value="2000_3000">2,000 - 3,000 FLR</option>
                  <option value="over_3000">Over 3,000 FLR</option>
                </select>
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="form-input min-w-[140px]"
              >
                <option value="newest">Newest First</option>
                <option value="expiring">Expiring Soon</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* KYC Warning */}
        {kycData?.status !== 'approved' && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <TagIcon className="w-5 h-5 text-warning-600 mr-2" />
              <div className="text-sm text-warning-700">
                Complete KYC verification to purchase NFTs from the marketplace.
                <a href="/dashboard" className="ml-2 underline font-medium">Complete now</a>
              </div>
            </div>
          </div>
        )}

        {/* Listings Grid */}
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
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBagIcon className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              No listings found
            </h3>
            <p className="text-secondary-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="card hover:shadow-lg transition-shadow group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-secondary-900 group-hover:flare-text transition-colors mb-1">
                      {listing.groupDetails.name}
                    </h3>
                    <div className="text-sm text-secondary-600">
                      NFT #{listing.tokenId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600">
                      {formatCurrency(listing.price, listing.currency)}
                    </div>
                    <div className="text-xs text-secondary-500">
                      Listed {formatDate(listing.listedAt)}
                    </div>
                  </div>
                </div>

                {/* Key Info */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                      <span>Original Value</span>
                    </div>
                    <span className="font-semibold text-secondary-900">
                      {formatCurrency(listing.nftDetails.quotaValue)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <UsersIcon className="w-4 h-4 mr-1" />
                      <span>Group Progress</span>
                    </div>
                    <span className="font-semibold text-secondary-900">
                      {listing.groupDetails.participants}/{listing.groupDetails.maxParticipants}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-secondary-600">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      <span>Expires</span>
                    </div>
                    <span className={`font-semibold ${
                      new Date(listing.expiresAt).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
                        ? 'text-warning-600'
                        : 'text-secondary-900'
                    }`}>
                      {formatDate(listing.expiresAt)}
                    </span>
                  </div>
                </div>

                {/* Seller Info */}
                <div className="bg-secondary-50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-secondary-600 mb-1">Seller</div>
                  <div className="font-mono text-sm text-secondary-900">
                    {shortenAddress(listing.sellerAddress)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePurchase(listing)}
                    disabled={kycData?.status !== 'approved' || listing.sellerAddress === address}
                    className={`btn-primary flex-1 ${
                      kycData?.status !== 'approved' || listing.sellerAddress === address
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {listing.sellerAddress === address ? 'Your Listing' : 'Buy Now'}
                  </button>
                  <button className="btn-secondary p-2" title="Add to Favorites">
                    <HeartIcon className="w-4 h-4" />
                  </button>
                  <a
                    href={getFlareExplorerUrl('token', listing.tokenId)}
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
  )
}

export default MarketplacePage