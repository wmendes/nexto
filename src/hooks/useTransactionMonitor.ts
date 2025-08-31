'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWallet } from './useWallet'
import { 
  TransactionStatus, 
  TransactionMonitor, 
  ContractError,
  TransactionMonitorOptions 
} from '@/utils/transaction-monitor'

interface UseTransactionMonitorReturn {
  status: TransactionStatus | null
  isMonitoring: boolean
  error: ContractError | null
  startMonitoring: (hash: string, options?: TransactionMonitorOptions) => void
  stopMonitoring: () => void
  clearError: () => void
}

export const useTransactionMonitor = (): UseTransactionMonitorReturn => {
  const { isConnected } = useWallet()
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<ContractError | null>(null)
  const [currentMonitor, setCurrentMonitor] = useState<TransactionMonitor | null>(null)

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
    setCurrentMonitor(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const startMonitoring = useCallback(async (
    hash: string, 
    options?: TransactionMonitorOptions
  ) => {
    if (!isConnected || !window.ethereum) {
      setError(new ContractError('Wallet not connected', 'WALLET_NOT_CONNECTED'))
      return
    }

    try {
      setIsMonitoring(true)
      setError(null)
      setStatus(null)

      const provider = new ethers.BrowserProvider(window.ethereum)
      const monitor = TransactionMonitor.create(hash, provider, options)
      setCurrentMonitor(monitor)

      const finalStatus = await monitor.monitor((status: TransactionStatus) => {
        setStatus(status)
      })

      setIsMonitoring(false)
      
      if (finalStatus.status === 'failed') {
        setError(new ContractError(
          finalStatus.error || 'Transaction failed',
          'TRANSACTION_FAILED',
          hash
        ))
      }

    } catch (err) {
      setIsMonitoring(false)
      setError(ContractError.fromError(err, hash))
    }
  }, [isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentMonitor) {
        stopMonitoring()
      }
    }
  }, [currentMonitor, stopMonitoring])

  return {
    status,
    isMonitoring,
    error,
    startMonitoring,
    stopMonitoring,
    clearError
  }
}

// Hook for executing transactions with automatic monitoring
interface UseTransactionExecutorReturn {
  execute: <T>(
    txFunction: () => Promise<ethers.TransactionResponse>,
    options?: TransactionMonitorOptions & {
      onSuccess?: (result: TransactionStatus) => void
      onError?: (error: ContractError) => void
    }
  ) => Promise<TransactionStatus | null>
  status: TransactionStatus | null
  isExecuting: boolean
  error: ContractError | null
  clearError: () => void
}

export const useTransactionExecutor = (): UseTransactionExecutorReturn => {
  const [status, setStatus] = useState<TransactionStatus | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<ContractError | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const execute = useCallback(async <T>(
    txFunction: () => Promise<ethers.TransactionResponse>,
    options?: TransactionMonitorOptions & {
      onSuccess?: (result: TransactionStatus) => void
      onError?: (error: ContractError) => void
    }
  ): Promise<TransactionStatus | null> => {
    if (!window.ethereum) {
      const error = new ContractError('Wallet not connected', 'WALLET_NOT_CONNECTED')
      setError(error)
      options?.onError?.(error)
      return null
    }

    setIsExecuting(true)
    setError(null)
    setStatus(null)

    try {
      // Execute the transaction
      const tx = await txFunction()
      
      // Start monitoring
      const provider = new ethers.BrowserProvider(window.ethereum)
      const monitor = TransactionMonitor.create(tx.hash, provider, options)

      const finalStatus = await monitor.monitor((status: TransactionStatus) => {
        setStatus(status)
      })

      setIsExecuting(false)

      if (finalStatus.status === 'success') {
        options?.onSuccess?.(finalStatus)
      } else {
        const error = new ContractError(
          finalStatus.error || 'Transaction failed',
          'TRANSACTION_FAILED',
          tx.hash
        )
        setError(error)
        options?.onError?.(error)
      }

      return finalStatus

    } catch (err) {
      setIsExecuting(false)
      const error = ContractError.fromError(err)
      setError(error)
      options?.onError?.(error)
      return null
    }
  }, [])

  return {
    execute,
    status,
    isExecuting,
    error,
    clearError
  }
}

// Hook for batch transaction monitoring
interface UseBatchTransactionMonitorReturn {
  transactions: Map<string, TransactionStatus>
  addTransaction: (hash: string, options?: TransactionMonitorOptions) => void
  removeTransaction: (hash: string) => void
  clearAll: () => void
  getTransaction: (hash: string) => TransactionStatus | undefined
}

export const useBatchTransactionMonitor = (): UseBatchTransactionMonitorReturn => {
  const [transactions, setTransactions] = useState<Map<string, TransactionStatus>>(new Map())
  const { isConnected } = useWallet()

  const addTransaction = useCallback(async (
    hash: string, 
    options?: TransactionMonitorOptions
  ) => {
    if (!isConnected || !window.ethereum) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const monitor = TransactionMonitor.create(hash, provider, options)

      // Add initial pending status
      setTransactions(prev => new Map(prev.set(hash, {
        hash,
        status: 'pending',
        confirmations: 0,
        timestamp: Date.now()
      })))

      // Start monitoring
      await monitor.monitor((status: TransactionStatus) => {
        setTransactions(prev => new Map(prev.set(hash, status)))
      })

    } catch (error) {
      console.error('Error monitoring transaction:', error)
      setTransactions(prev => new Map(prev.set(hash, {
        hash,
        status: 'failed',
        confirmations: 0,
        timestamp: Date.now(),
        error: 'Monitoring failed'
      })))
    }
  }, [isConnected])

  const removeTransaction = useCallback((hash: string) => {
    setTransactions(prev => {
      const next = new Map(prev)
      next.delete(hash)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setTransactions(new Map())
  }, [])

  const getTransaction = useCallback((hash: string) => {
    return transactions.get(hash)
  }, [transactions])

  return {
    transactions,
    addTransaction,
    removeTransaction,
    clearAll,
    getTransaction
  }
}