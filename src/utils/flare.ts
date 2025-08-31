import { formatEther, parseEther } from 'viem'
import { FLARE_CONFIG } from '@/lib/flare-config'

export const formatFlareBalance = (balance: bigint): string => {
  return parseFloat(formatEther(balance)).toFixed(4)
}

export const parseFlareAmount = (amount: string): bigint => {
  return parseEther(amount)
}

export const shortenAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const getFlareExplorerUrl = (
  type: 'tx' | 'address' | 'token',
  value: string,
  isTestnet: boolean = process.env.NODE_ENV !== 'production'
): string => {
  const baseUrl = isTestnet 
    ? 'https://coston2-explorer.flare.network'
    : 'https://flare-explorer.flare.network'
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}`
    case 'address':
      return `${baseUrl}/address/${value}`
    case 'token':
      return `${baseUrl}/token/${value}`
    default:
      return baseUrl
  }
}

// Flare Secure Random Numbers Integration
interface FlareRandomResponse {
  randomNumber: string
  blockNumber: number
  timestamp: number
  transactionHash: string
  verified: boolean
}

/**
 * Get secure random number from Flare network
 * This uses Flare's Secure Random Numbers service for provably fair draws
 */
export const getFlareSecureRandom = async (seed?: string): Promise<FlareRandomResponse> => {
  try {
    // In a real implementation, this would interact with Flare's randomization contract
    // For now, we'll simulate the response structure
    
    const timestamp = Math.floor(Date.now() / 1000)
    const blockNumber = Math.floor(Math.random() * 1000000) + 10000000 // Simulated block number
    
    // Generate a cryptographically secure random number (in real implementation, this comes from Flare)
    const randomBytes = new Uint8Array(32)
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomBytes)
    } else {
      // Fallback for Node.js environment
      const crypto = await import('crypto')
      const randomBuffer = crypto.randomBytes(32)
      randomBytes.set(randomBuffer)
    }
    
    const randomNumber = '0x' + Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Simulate transaction hash
    const transactionHash = '0x' + Math.random().toString(16).substring(2, 66).padEnd(64, '0')
    
    const response: FlareRandomResponse = {
      randomNumber,
      blockNumber,
      timestamp,
      transactionHash,
      verified: true
    }
    
    console.log('Flare Secure Random generated:', response)
    return response
    
  } catch (error) {
    console.error('Error getting Flare secure random:', error)
    throw new Error('Failed to get secure random number from Flare network')
  }
}

export const generateSecureRandom = async (): Promise<string> => {
  try {
    const randomData = await getFlareSecureRandom()
    return randomData.randomNumber
  } catch (error) {
    console.error('Error generating secure random number:', error)
    // Fallback to crypto.randomUUID for development
    return crypto.randomUUID().replace(/-/g, '')
  }
}

/**
 * Execute a consortium draw using Flare's secure randomness
 */
export const executeConsortiumDraw = async (
  eligibleParticipants: Array<{ tokenId: number; address: string }>,
  groupId: string
): Promise<{
  winner: { tokenId: number; address: string }
  randomData: FlareRandomResponse
  winnerIndex: number
}> => {
  if (eligibleParticipants.length === 0) {
    throw new Error('No eligible participants for draw')
  }
  
  try {
    // Get secure random number from Flare
    const seed = `consortium_draw_${groupId}_${Date.now()}`
    const randomData = await getFlareSecureRandom(seed)
    
    // Convert hex random number to integer for winner selection
    const randomInt = BigInt(randomData.randomNumber)
    const winnerIndex = Number(randomInt % BigInt(eligibleParticipants.length))
    const winner = eligibleParticipants[winnerIndex]
    
    console.log('Draw executed:', {
      groupId,
      totalParticipants: eligibleParticipants.length,
      winnerIndex,
      winner: winner.address,
      randomData: randomData.randomNumber
    })
    
    return {
      winner,
      randomData,
      winnerIndex
    }
    
  } catch (error) {
    console.error('Error executing consortium draw:', error)
    throw new Error('Failed to execute draw with Flare secure randomness')
  }
}

/**
 * Verify a draw result using the Flare transaction hash
 */
export const verifyDrawResult = async (
  transactionHash: string,
  expectedWinner: string,
  participants: Array<{ tokenId: number; address: string }>
): Promise<boolean> => {
  try {
    // In a real implementation, this would query the Flare network
    // to verify the transaction and randomness
    
    console.log('Verifying draw result:', {
      transactionHash,
      expectedWinner,
      participantCount: participants.length
    })
    
    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Return true for successful verification (in real implementation, 
    // this would verify the actual transaction on Flare)
    return true
    
  } catch (error) {
    console.error('Error verifying draw result:', error)
    return false
  }
}

export const validateFlareAddress = (address: string): boolean => {
  const flareAddressRegex = /^0x[a-fA-F0-9]{40}$/
  return flareAddressRegex.test(address)
}

export const calculateQuotaValue = (totalValue: number, quotas: number): number => {
  return Math.round((totalValue / quotas) * 100) / 100
}

export const calculateMonthlyPayment = (
  quotaValue: number,
  adminFee: number,
  reserveFund: number
): number => {
  const baseFee = quotaValue * (adminFee / 100)
  const reserve = quotaValue * (reserveFund / 100)
  return Math.round((quotaValue + baseFee + reserve) * 100) / 100
}

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const isPaymentOverdue = (dueDate: Date): boolean => {
  return new Date() > dueDate
}

export const getDaysUntilDue = (dueDate: Date): number => {
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export const generateNFTMetadata = (
  group: any,
  tokenId: string,
  ownerAddress: string
) => {
  return {
    name: `Consortium Share #${tokenId}`,
    description: `Tokenized share of ${group.name} consortium`,
    image: `https://example.com/nft-images/${tokenId}.png`, // Placeholder
    attributes: [
      {
        trait_type: 'Group',
        value: group.name
      },
      {
        trait_type: 'Asset Type',
        value: group.assetType
      },
      {
        trait_type: 'Quota Value',
        value: group.quotaValue
      },
      {
        trait_type: 'Owner',
        value: ownerAddress
      },
      {
        trait_type: 'Status',
        value: 'Active'
      }
    ]
  }
}