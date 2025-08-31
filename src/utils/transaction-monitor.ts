import { ethers } from 'ethers'
import { getFlareExplorerUrl } from './flare'

export interface TransactionStatus {
  hash: string
  status: 'pending' | 'success' | 'failed' | 'timeout'
  confirmations: number
  error?: string
  timestamp: number
  gasUsed?: number
  effectiveGasPrice?: number
}

export interface TransactionMonitorOptions {
  timeout?: number // in milliseconds, default 5 minutes
  requiredConfirmations?: number // default 1
  pollingInterval?: number // in milliseconds, default 2 seconds
}

/**
 * Monitor a transaction and provide real-time status updates
 */
export class TransactionMonitor {
  private static activeMonitors = new Map<string, TransactionMonitor>()
  
  constructor(
    private hash: string,
    private provider: ethers.Provider,
    private options: TransactionMonitorOptions = {}
  ) {
    this.options = {
      timeout: 5 * 60 * 1000, // 5 minutes
      requiredConfirmations: 1,
      pollingInterval: 2000, // 2 seconds
      ...options
    }
  }

  static create(
    hash: string,
    provider: ethers.Provider,
    options?: TransactionMonitorOptions
  ): TransactionMonitor {
    // Prevent duplicate monitors for the same transaction
    if (this.activeMonitors.has(hash)) {
      return this.activeMonitors.get(hash)!
    }

    const monitor = new TransactionMonitor(hash, provider, options)
    this.activeMonitors.set(hash, monitor)
    return monitor
  }

  /**
   * Start monitoring the transaction with callback updates
   */
  async monitor(
    onUpdate: (status: TransactionStatus) => void
  ): Promise<TransactionStatus> {
    const startTime = Date.now()
    
    const updateStatus = (partial: Partial<TransactionStatus>) => {
      const status: TransactionStatus = {
        hash: this.hash,
        status: 'pending',
        confirmations: 0,
        timestamp: Date.now(),
        ...partial
      }
      onUpdate(status)
      return status
    }

    try {
      // Initial status
      updateStatus({ status: 'pending' })

      let attempts = 0
      const maxAttempts = Math.floor((this.options.timeout || 300000) / (this.options.pollingInterval || 2000))

      while (attempts < maxAttempts) {
        try {
          const receipt = await this.provider.getTransactionReceipt(this.hash)
          
          if (receipt) {
            // Transaction has been mined
            const currentBlock = await this.provider.getBlockNumber()
            const confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1)
            
            const status = receipt.status === 1 ? 'success' : 'failed'
            const finalStatus = updateStatus({
              status,
              confirmations,
              gasUsed: Number(receipt.gasUsed),
              error: status === 'failed' ? 'Transaction reverted' : undefined
            })

            if (confirmations >= (this.options.requiredConfirmations || 1)) {
              TransactionMonitor.activeMonitors.delete(this.hash)
              return finalStatus
            }
          }

          // Check for timeout
          if (Date.now() - startTime > (this.options.timeout || 300000)) {
            const timeoutStatus = updateStatus({
              status: 'timeout',
              error: 'Transaction timeout - not confirmed within expected time'
            })
            TransactionMonitor.activeMonitors.delete(this.hash)
            return timeoutStatus
          }

          attempts++
          await new Promise(resolve => 
            setTimeout(resolve, this.options.pollingInterval || 2000)
          )

        } catch (error) {
          console.warn('Error checking transaction status:', error)
          attempts++
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // If we get here, we've exceeded max attempts
      const timeoutStatus = updateStatus({
        status: 'timeout',
        error: 'Transaction monitoring timeout'
      })
      
      TransactionMonitor.activeMonitors.delete(this.hash)
      return timeoutStatus

    } catch (error) {
      const errorStatus = updateStatus({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown transaction error'
      })
      
      TransactionMonitor.activeMonitors.delete(this.hash)
      return errorStatus
    }
  }

  /**
   * Get current transaction status without monitoring
   */
  async getStatus(): Promise<TransactionStatus> {
    try {
      const receipt = await this.provider.getTransactionReceipt(this.hash)
      
      if (receipt) {
        const currentBlock = await this.provider.getBlockNumber()
        const confirmations = Math.max(0, currentBlock - receipt.blockNumber + 1)
        
        return {
          hash: this.hash,
          status: receipt.status === 1 ? 'success' : 'failed',
          confirmations,
          gasUsed: Number(receipt.gasUsed),
          timestamp: Date.now(),
          error: receipt.status !== 1 ? 'Transaction reverted' : undefined
        }
      }

      return {
        hash: this.hash,
        status: 'pending',
        confirmations: 0,
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        hash: this.hash,
        status: 'failed',
        confirmations: 0,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Failed to check transaction status'
      }
    }
  }

  /**
   * Get explorer URL for this transaction
   */
  getExplorerUrl(isTestnet: boolean = process.env.NODE_ENV !== 'production'): string {
    return getFlareExplorerUrl('tx', this.hash, isTestnet)
  }
}

/**
 * Enhanced error handling for blockchain interactions
 */
export class ContractError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly transactionHash?: string,
    public readonly underlyingError?: Error
  ) {
    super(message)
    this.name = 'ContractError'
  }

  static fromError(error: any, transactionHash?: string): ContractError {
    // Parse common error types
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      return new ContractError(
        'Transaction was rejected by user',
        'USER_REJECTED',
        transactionHash,
        error
      )
    }

    if (error.code === 'INSUFFICIENT_FUNDS' || error.code === -32000) {
      return new ContractError(
        'Insufficient funds for transaction',
        'INSUFFICIENT_FUNDS',
        transactionHash,
        error
      )
    }

    if (error.code === 'NETWORK_ERROR') {
      return new ContractError(
        'Network connection error',
        'NETWORK_ERROR',
        transactionHash,
        error
      )
    }

    if (error.reason) {
      // Contract revert reason
      return new ContractError(
        error.reason,
        'CONTRACT_REVERT',
        transactionHash,
        error
      )
    }

    if (error.message?.includes('execution reverted')) {
      return new ContractError(
        'Transaction reverted by contract',
        'EXECUTION_REVERTED',
        transactionHash,
        error
      )
    }

    // Generic error
    return new ContractError(
      error.message || 'Unknown contract error',
      'UNKNOWN',
      transactionHash,
      error
    )
  }

  getUserFriendlyMessage(): string {
    switch (this.code) {
      case 'USER_REJECTED':
        return 'Transaction was cancelled by user'
      case 'INSUFFICIENT_FUNDS':
        return 'Insufficient FLR balance for transaction fees'
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection.'
      case 'CONTRACT_REVERT':
        return this.message
      case 'EXECUTION_REVERTED':
        return 'Transaction failed - please try again'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }
}

/**
 * Utility functions for transaction monitoring
 */
export const txUtils = {
  /**
   * Wait for transaction confirmation with progress updates
   */
  waitForConfirmation: async (
    hash: string,
    provider: ethers.Provider,
    onUpdate: (status: TransactionStatus) => void,
    options?: TransactionMonitorOptions
  ): Promise<TransactionStatus> => {
    const monitor = TransactionMonitor.create(hash, provider, options)
    return monitor.monitor(onUpdate)
  },

  /**
   * Format transaction status for display
   */
  formatStatus: (status: TransactionStatus): string => {
    switch (status.status) {
      case 'pending':
        return 'Confirming transaction...'
      case 'success':
        return `Confirmed with ${status.confirmations} confirmations`
      case 'failed':
        return `Failed: ${status.error || 'Unknown error'}`
      case 'timeout':
        return 'Transaction timeout - please check manually'
      default:
        return 'Unknown status'
    }
  },

  /**
   * Get status color for UI
   */
  getStatusColor: (status: TransactionStatus['status']): string => {
    switch (status) {
      case 'pending':
        return 'text-warning-600'
      case 'success':
        return 'text-success-600'
      case 'failed':
      case 'timeout':
        return 'text-error-600'
      default:
        return 'text-secondary-600'
    }
  },

  /**
   * Estimate gas price with safety margin
   */
  getRecommendedGasPrice: async (provider: ethers.Provider): Promise<bigint> => {
    try {
      const gasPrice = await provider.getGasPrice()
      // Add 10% safety margin
      return (gasPrice * 110n) / 100n
    } catch (error) {
      console.error('Error getting gas price:', error)
      // Fallback to 25 gwei (typical for Flare)
      return ethers.parseUnits('25', 'gwei')
    }
  }
}