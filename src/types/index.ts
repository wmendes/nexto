// User and Authentication Types
export interface User {
  address: string
  kycStatus: 'pending' | 'approved' | 'rejected'
  email?: string
  fullName?: string
  createdAt: Date
}

export interface KYCData {
  fullName: string
  email: string
  documentId: string
  documentImage: File | string
  selfieImage: File | string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: Date
  approvedAt?: Date
}

// Consortium Group Types
export interface ConsortiumGroup {
  id: string
  name: string
  assetType: 'real_estate' | 'vehicle' | 'equipment'
  totalValue: number // in USD
  quotas: number
  quotaValue: number // calculated: totalValue / quotas
  duration: number // in months
  adminFee: number // percentage 2-10%
  reserveFund: number // percentage 1-5%
  startDate: Date
  assemblyFrequency: 'monthly' | 'bimonthly'
  participants: number
  maxParticipants: number
  status: 'active' | 'full' | 'completed'
  organizerAddress: string
  contractAddress?: string
  ipfsHash?: string
}

// NFT Types
export interface ConsortiumNFT {
  tokenId: string
  groupId: string
  ownerAddress: string
  mintedAt: Date
  quotaValue: number
  status: 'active' | 'contemplated' | 'transferred'
  paymentStatus: 'current' | 'late' | 'defaulted'
  nextPaymentDue?: Date
  metadataUri: string
  transactionHash: string
}

export interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes: Array<{
    trait_type: string
    value: string | number
  }>
  groupDetails: ConsortiumGroup
}

// Payment Types
export interface Payment {
  id: string
  nftTokenId: string
  groupId: string
  amount: number
  currency: 'FLR'
  status: 'pending' | 'completed' | 'failed'
  transactionHash?: string
  paidAt?: Date
  dueDate: Date
  paymentType: 'quota' | 'late_fee' | 'admin_fee'
}

export interface PaymentHistory {
  payments: Payment[]
  totalPaid: number
  pendingAmount: number
  nextPaymentDue?: Date
}

// Draw/Lottery Types
export interface Draw {
  id: string
  groupId: string
  drawDate: Date
  participantCount: number
  winnerTokenId: string
  winnerAddress: string
  randomSeed: string // From Flare Secure Random Numbers
  flareTransactionHash: string
  blockNumber: number
  verified: boolean
}

export interface DrawParticipant {
  tokenId: string
  ownerAddress: string
  isEligible: boolean
  paymentStatus: 'current' | 'late' | 'defaulted'
}

// Marketplace Types
export interface MarketplaceListing {
  id: string
  tokenId: string
  sellerAddress: string
  price: number
  currency: 'FLR'
  status: 'active' | 'sold' | 'cancelled'
  listedAt: Date
  expiresAt: Date
  groupDetails: ConsortiumGroup
  nftDetails: ConsortiumNFT
}

export interface MarketplaceOffer {
  id: string
  listingId: string
  buyerAddress: string
  price: number
  currency: 'FLR'
  expiresAt: Date
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
}

// Wallet Types
export interface WalletState {
  isConnected: boolean
  address: string | null
  chainId: number | null
  balance: {
    flr: string
  }
  isConnecting: boolean
  error: string | null
}

// Analytics Types
export interface GroupAnalytics {
  groupId: string
  totalParticipants: number
  completedPayments: number
  missedPayments: number
  totalValueLocked: number
  drawsCompleted: number
  averagePaymentTime: number
  participantRetention: number
}

// Contract Event Types
export interface ContractEvent {
  eventName: string
  transactionHash: string
  blockNumber: number
  timestamp: Date
  args: Record<string, any>
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrevious: boolean
}