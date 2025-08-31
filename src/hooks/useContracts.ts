'use client'

import { useState, useEffect, useMemo } from 'react'
import { Contract, ethers } from 'ethers'
import { useWallet } from './useWallet'
import { CONTRACT_ADDRESSES } from '@/lib/flare-config'
import { formatEther, parseEther } from 'viem'

// Helper function for retrying contract calls
const retryContractCall = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry for certain types of errors
      if (error instanceof Error && (
        error.message.includes('could not decode result data') ||
        error.message.includes('execution reverted') ||
        error.message.includes('call revert exception')
      )) {
        // These errors indicate contract state issues, not network problems
        console.log(`Contract call failed with non-retryable error: ${error.message}`)
        break
      }

      if (i < maxRetries) {
        console.log(`Contract call attempt ${i + 1} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= 2 // Exponential backoff
      }
    }
  }

  throw lastError
}

// Import ABIs from compiled artifacts
const ConsortiumNFTABI = [
  "function mintConsortiumShare(address to, string groupId, uint256 quotaValue, string tokenURI) external returns (uint256)",
  "function getConsortiumShare(uint256 tokenId) external view returns (tuple(string groupId, uint256 quotaValue, uint256 mintedAt, address originalOwner, bool isContemplated, uint256 totalPaid, uint256 lastPaymentAt, uint8 paymentStatus))",
  "function getOwnerTokens(address owner) external view returns (uint256[])",
  "function getGroupTokens(string groupId) external view returns (uint256[])",
  "function isEligibleForDraw(uint256 tokenId) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "event NFTMinted(uint256 indexed tokenId, address indexed owner, string indexed groupId, uint256 quotaValue)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]

const GroupManagerABI = [
  "function createGroup(string groupId, string name, uint256 totalValue, uint256 quotas, uint256 duration, uint256 adminFee, uint256 reserveFund, string ipfsHash) external",
  "function joinGroup(string groupId, string tokenURI) external",
  "function makePayment(string groupId, uint256 amount) external",
  "function executeDraw(string groupId) external",
  "function getGroup(string groupId) external view returns (tuple(string groupId, string name, address organizer, uint256 totalValue, uint256 quotas, uint256 quotaValue, uint256 duration, uint256 adminFee, uint256 reserveFund, uint256 startDate, uint256 participants, uint256 maxParticipants, bool isActive, string ipfsHash, uint256 nextDrawDate, uint256 drawCount))",
  "function getAllGroups() external view returns (string[])",
  "function getGroupMembers(string groupId) external view returns (address[])",
  "function isMemberOfGroup(string groupId, address user) external view returns (bool)",
  "function getUserPaymentInfo(string groupId, address user) external view returns (uint256 lastPayment, uint256 totalPaid)",
  "function setKYCApproval(address user, bool approved) external",
  "event GroupCreated(string indexed groupId, address indexed organizer, uint256 totalValue, uint256 quotas)",
  "event UserJoinedGroup(string indexed groupId, address indexed user, uint256 tokenId)",
  "event PaymentProcessed(string indexed groupId, address indexed user, uint256 amount, uint256 tokenId)",
  "event DrawCompleted(string indexed groupId, uint256 indexed winnerTokenId, address indexed winner, bytes32 randomSeed)"
]

const MarketplaceABI = [
  "function listNFT(uint256 tokenId, uint256 price, uint256 duration) external",
  "function buyNFT(uint256 listingId) external",
  "function makeOffer(uint256 listingId, uint256 price, uint256 duration) external", 
  "function acceptOffer(uint256 offerId) external",
  "function cancelListing(uint256 listingId) external",
  "function cancelOffer(uint256 offerId) external",
  "function getActiveListings() external view returns (uint256[])",
  "function getUserListings(address user) external view returns (uint256[])",
  "function getUserOffers(address user) external view returns (uint256[])",
  "function getListingOffers(uint256 listingId) external view returns (uint256[])",
  "function listings(uint256 listingId) external view returns (tuple(uint256 listingId, uint256 tokenId, address seller, uint256 price, bool isActive, uint256 listedAt, uint256 expiresAt))",
  "function offers(uint256 offerId) external view returns (tuple(uint256 offerId, uint256 listingId, address buyer, uint256 price, bool isActive, uint256 expiresAt))",
  "event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price, uint256 listingId)",
  "event NFTSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price, uint256 listingId)"
]

interface UseContractsReturn {
  nftContract: Contract | null
  groupManagerContract: Contract | null
  marketplaceContract: Contract | null
  isConnected: boolean
  signer: ethers.Signer | null
}

export const useContracts = (): UseContractsReturn => {
  const { isConnected } = useWallet()
  const [signer, setSigner] = useState<ethers.Signer | null>(null)

  // Initialize read-only provider on mount, upgrade to signer when connected
  useEffect(() => {
    const initReadOnlyProvider = () => {
      const provider = new ethers.JsonRpcProvider(
        process.env.NODE_ENV === 'production' 
          ? 'https://flare-api.flare.network/ext/bc/C/rpc'
          : 'https://coston2-api.flare.network/ext/bc/C/rpc'
      )
      setSigner(provider as any)
      console.log('Initialized read-only provider on mount')
    }

    // Always initialize with read-only provider first
    initReadOnlyProvider()
  }, [])

  // Upgrade to wallet signer when connected
  useEffect(() => {
    const initWalletSigner = async () => {
      if (typeof window !== 'undefined' && window.ethereum && isConnected) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const ethSigner = await provider.getSigner()
          setSigner(ethSigner)
          console.log('Upgraded to wallet signer')
        } catch (error) {
          console.error('Failed to initialize wallet signer:', error)
        }
      }
    }

    if (isConnected) {
      initWalletSigner()
    }
  }, [isConnected])

  // Initialize contracts with signer or provider
  const contracts = useMemo(() => {
    if (!signer) {
      console.log('No signer/provider available - contracts will be null')
      return {
        nftContract: null,
        groupManagerContract: null,
        marketplaceContract: null,
      }
    }

    let nftContract: Contract | null = null
    let groupManagerContract: Contract | null = null
    let marketplaceContract: Contract | null = null

    try {
      // Initialize NFT contract
      if (CONTRACT_ADDRESSES.CONSORTIUM_NFT && CONTRACT_ADDRESSES.CONSORTIUM_NFT !== '') {
        console.log('Initializing NFT contract at:', CONTRACT_ADDRESSES.CONSORTIUM_NFT)
        nftContract = new Contract(
          CONTRACT_ADDRESSES.CONSORTIUM_NFT,
          ConsortiumNFTABI,
          signer
        )
      } else {
        console.warn('NFT contract address not available')
      }

      // Initialize Group Manager contract
      if (CONTRACT_ADDRESSES.GROUP_MANAGER && CONTRACT_ADDRESSES.GROUP_MANAGER !== '') {
        console.log('Initializing Group Manager contract at:', CONTRACT_ADDRESSES.GROUP_MANAGER)
        groupManagerContract = new Contract(
          CONTRACT_ADDRESSES.GROUP_MANAGER,
          GroupManagerABI,
          signer
        )
      } else {
        console.warn('Group Manager contract address not available')
      }

      // Initialize Marketplace contract
      if (CONTRACT_ADDRESSES.MARKETPLACE && CONTRACT_ADDRESSES.MARKETPLACE !== '') {
        console.log('Initializing Marketplace contract at:', CONTRACT_ADDRESSES.MARKETPLACE)
        marketplaceContract = new Contract(
          CONTRACT_ADDRESSES.MARKETPLACE,
          MarketplaceABI,
          signer
        )
      } else {
        console.warn('Marketplace contract address not available')
      }
    } catch (error) {
      console.error('Failed to initialize contracts:', error)
    }

    // Validate at least one contract is available
    const availableContracts = [nftContract, groupManagerContract, marketplaceContract].filter(Boolean)
    console.log(`Initialized ${availableContracts.length} out of 3 contracts`)

    return {
      nftContract,
      groupManagerContract,
      marketplaceContract,
    }
  }, [signer])

  return {
    nftContract: contracts.nftContract,
    groupManagerContract: contracts.groupManagerContract,
    marketplaceContract: contracts.marketplaceContract,
    isConnected: !!signer, // True if we have either signer or provider
    signer,
  }
}

// Hook for NFT-specific operations
export const useConsortiumNFT = () => {
  const { nftContract, isConnected } = useContracts()

  const getOwnerTokens = async (userAddress: string) => {
    if (!nftContract) {
      console.warn('NFT contract not available - returning empty array')
      return []
    }

    if (!userAddress || userAddress === '') {
      console.warn('Invalid user address provided')
      return []
    }

    try {
      const tokenIds = await retryContractCall(
        () => nftContract.getOwnerTokens(userAddress),
        2,
        500
      )
      
      if (!tokenIds || tokenIds.length === 0) {
        console.log(`No tokens found for user ${userAddress}`)
        return []
      }
      
      return tokenIds.map((id: string | number) => Number(id))
    } catch (error) {
      console.error('Error getting owner tokens:', error)
      if (error instanceof Error && error.message.includes('could not decode result data')) {
        console.log(`No tokens exist for user ${userAddress}`)
      }
      return []
    }
  }

  const getConsortiumShare = async (tokenId: number) => {
    if (!nftContract) {
      throw new Error('NFT contract not available')
    }

    try {
      const share = await nftContract.getConsortiumShare(tokenId)
      return {
        groupId: share.groupId,
        quotaValue: parseFloat(formatEther(share.quotaValue)),
        mintedAt: new Date(Number(share.mintedAt) * 1000),
        originalOwner: share.originalOwner,
        isContemplated: share.isContemplated,
        totalPaid: parseFloat(formatEther(share.totalPaid)),
        lastPaymentAt: Number(share.lastPaymentAt),
        paymentStatus: Number(share.paymentStatus),
      }
    } catch (error) {
      console.error('Error getting consortium share:', error)
      throw error
    }
  }

  const isEligibleForDraw = async (tokenId: number) => {
    if (!nftContract) {
      throw new Error('NFT contract not available')
    }

    try {
      return await nftContract.isEligibleForDraw(tokenId)
    } catch (error) {
      console.error('Error checking draw eligibility:', error)
      throw error
    }
  }

  const approve = async (to: string, tokenId: number) => {
    if (!nftContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await nftContract.approve(to, tokenId)
      await tx.wait()
      return tx
    } catch (error) {
      console.error('Error approving NFT:', error)
      throw error
    }
  }

  const setApprovalForAll = async (operator: string, approved: boolean) => {
    if (!nftContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await nftContract.setApprovalForAll(operator, approved)
      await tx.wait()
      return tx
    } catch (error) {
      console.error('Error setting approval for all:', error)
      throw error
    }
  }

  return {
    getOwnerTokens,
    getConsortiumShare,
    isEligibleForDraw,
    approve,
    setApprovalForAll,
    contract: nftContract,
    isConnected,
  }
}

// Hook for Group Manager operations
export const useGroupManager = () => {
  const { groupManagerContract, isConnected } = useContracts()

  const createGroup = async (groupData: {
    groupId: string
    name: string
    totalValue: number
    quotas: number
    duration: number
    adminFee: number
    reserveFund: number
    ipfsHash: string
  }) => {
    if (!groupManagerContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await groupManagerContract.createGroup(
        groupData.groupId,
        groupData.name,
        parseEther(groupData.totalValue.toString()),
        groupData.quotas,
        groupData.duration,
        Math.floor(groupData.adminFee * 100), // Convert percentage to basis points
        Math.floor(groupData.reserveFund * 100),
        groupData.ipfsHash
      )
      
      const receipt = await tx.wait()
      return { tx, receipt }
    } catch (error) {
      console.error('Error creating group:', error)
      throw error
    }
  }

  const joinGroup = async (groupId: string, tokenURI: string) => {
    if (!groupManagerContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await groupManagerContract.joinGroup(groupId, tokenURI)
      const receipt = await tx.wait()
      
      // Extract tokenId from event logs if needed
      const event = receipt.logs?.find((log: { topics?: string[] }) =>
        log.topics?.[0] === ethers.id('UserJoinedGroup(string,address,uint256)')
      )
      
      return { tx, receipt, event }
    } catch (error) {
      console.error('Error joining group:', error)
      throw error
    }
  }

  const makePayment = async (groupId: string, amount: number) => {
    if (!groupManagerContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await groupManagerContract.makePayment(groupId, parseEther(amount.toString()))
      const receipt = await tx.wait()
      return { tx, receipt }
    } catch (error) {
      console.error('Error making payment:', error)
      throw error
    }
  }

  const getGroup = async (groupId: string) => {
    if (!groupManagerContract) {
      console.warn('Group Manager contract not available')
      return null
    }

    if (!groupId || groupId.trim() === '') {
      console.warn('Invalid groupId provided')
      return null
    }

    try {
      const result = await groupManagerContract.getGroup(groupId)
      
      // Check if group exists (empty groupId indicates non-existent group)
      if (!result || result.groupId === '' || result.groupId !== groupId) {
        console.log(`Group with ID ${groupId} not found`)
        return null
      }
      
      return {
        groupId: result.groupId,
        name: result.name || `Group ${groupId}`,
        organizer: result.organizer,
        totalValue: parseFloat(formatEther(result.totalValue)),
        quotas: Number(result.quotas),
        quotaValue: parseFloat(formatEther(result.quotaValue)),
        duration: Number(result.duration),
        adminFee: Number(result.adminFee) / 100, // Convert from basis points
        reserveFund: Number(result.reserveFund) / 100,
        startDate: new Date(Number(result.startDate) * 1000),
        participants: Number(result.participants),
        maxParticipants: Number(result.maxParticipants),
        isActive: result.isActive,
        ipfsHash: result.ipfsHash,
        nextDrawDate: new Date(Number(result.nextDrawDate) * 1000),
        drawCount: Number(result.drawCount),
      }
    } catch (error) {
      console.error(`Error getting group ${groupId} (returning null):`, error)
      // Handle specific decoding errors
      if (error instanceof Error && error.message.includes('could not decode result data')) {
        console.log(`Contract returned empty data for group ${groupId} - group likely doesn't exist`)
      }
      return null
    }
  }

  const getAllGroups = async () => {
    if (!groupManagerContract) {
      console.warn('Group Manager contract not available - returning empty array')
      return []
    }

    try {
      const groupIds = await retryContractCall(
        () => groupManagerContract.getAllGroups(),
        2, // Only 2 retries for view functions
        500 // Shorter delay for view functions
      )
      
      // Handle case where contract returns empty data (0x)
      if (!groupIds || groupIds.length === 0) {
        console.log('No groups found in contract - returning empty array')
        return []
      }
      return groupIds
    } catch (error) {
      console.error('Error getting all groups (returning empty array):', error)
      // Check if error is due to empty contract state
      if (error instanceof Error && error.message.includes('could not decode result data')) {
        console.log('Contract returned empty data - likely no groups exist yet')
        return []
      }
      return []
    }
  }

  const isMemberOfGroup = async (groupId: string, userAddress: string) => {
    if (!groupManagerContract) {
      console.warn('Group Manager contract not available')
      return false
    }

    try {
      return await groupManagerContract.isMemberOfGroup(groupId, userAddress)
    } catch (error) {
      console.error('Error checking group membership (returning false):', error)
      return false
    }
  }

  const getUserPaymentInfo = async (groupId: string, userAddress: string) => {
    if (!groupManagerContract) {
      console.warn('Group Manager contract not available')
      return {
        lastPayment: new Date(0),
        totalPaid: 0,
      }
    }

    try {
      const [lastPayment, totalPaid] = await groupManagerContract.getUserPaymentInfo(groupId, userAddress)
      return {
        lastPayment: new Date(Number(lastPayment) * 1000),
        totalPaid: Number(totalPaid),
      }
    } catch (error) {
      console.error('Error getting user payment info (returning defaults):', error)
      return {
        lastPayment: new Date(0),
        totalPaid: 0,
      }
    }
  }

  return {
    createGroup,
    joinGroup,
    makePayment,
    getGroup,
    getAllGroups,
    isMemberOfGroup,
    getUserPaymentInfo,
    contract: groupManagerContract,
    isConnected,
  }
}

// Hook for Marketplace operations
export const useMarketplace = () => {
  const { marketplaceContract, isConnected } = useContracts()

  const listNFT = async (tokenId: number, price: number, duration: number) => {
    if (!marketplaceContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await marketplaceContract.listNFT(tokenId, price, duration)
      const receipt = await tx.wait()
      return { tx, receipt }
    } catch (error) {
      console.error('Error listing NFT:', error)
      throw error
    }
  }

  const buyNFT = async (listingId: number) => {
    if (!marketplaceContract || !isConnected) {
      throw new Error('Contract not available or wallet not connected')
    }

    try {
      const tx = await marketplaceContract.buyNFT(listingId)
      const receipt = await tx.wait()
      return { tx, receipt }
    } catch (error) {
      console.error('Error buying NFT:', error)
      throw error
    }
  }

  const getActiveListings = async () => {
    if (!marketplaceContract) {
      console.warn('Marketplace contract not available - returning empty array')
      return []
    }

    try {
      const listingIds = await retryContractCall(
        () => marketplaceContract.getActiveListings(),
        2,
        500
      )
      
      if (!listingIds || listingIds.length === 0) {
        console.log('No active listings found')
        return []
      }
      
      return listingIds.map((id: string | number) => Number(id))
    } catch (error) {
      console.error('Error getting active listings (returning empty array):', error)
      if (error instanceof Error && error.message.includes('could not decode result data')) {
        console.log('No active listings exist in marketplace')
      }
      return []
    }
  }

  const getListing = async (listingId: number) => {
    if (!marketplaceContract) {
      console.warn('Marketplace contract not available')
      return null
    }

    try {
      const listing = await marketplaceContract.listings(listingId)
      
      // Check if listing exists (listingId 0 indicates non-existent listing)
      if (Number(listing.listingId) === 0) {
        return null
      }
      
      return {
        listingId: Number(listing.listingId),
        tokenId: Number(listing.tokenId),
        seller: listing.seller,
        price: Number(listing.price),
        isActive: listing.isActive,
        listedAt: new Date(Number(listing.listedAt) * 1000),
        expiresAt: new Date(Number(listing.expiresAt) * 1000),
      }
    } catch (error) {
      console.error('Error getting listing (returning null):', error)
      return null
    }
  }

  return {
    listNFT,
    buyNFT,
    getActiveListings,
    getListing,
    contract: marketplaceContract,
    isConnected,
  }
}