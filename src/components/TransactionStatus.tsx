'use client'

import React from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import { TransactionStatus as TxStatus } from '@/utils/transaction-monitor'
import { getFlareExplorerUrl } from '@/utils/flare'

interface TransactionStatusProps {
  status: TxStatus
  showDetails?: boolean
  className?: string
  onDismiss?: () => void
}

const TransactionStatusComponent: React.FC<TransactionStatusProps> = ({
  status,
  showDetails = false,
  className = '',
  onDismiss
}) => {
  const getStatusIcon = () => {
    switch (status.status) {
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-warning-500 animate-pulse" />
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-success-500" />
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-error-500" />
      case 'timeout':
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-secondary-400" />
    }
  }

  const getStatusText = () => {
    switch (status.status) {
      case 'pending':
        return 'Transaction pending...'
      case 'success':
        return `Transaction confirmed (${status.confirmations} confirmations)`
      case 'failed':
        return `Transaction failed${status.error ? `: ${status.error}` : ''}`
      case 'timeout':
        return 'Transaction timeout - please check manually'
      default:
        return 'Unknown status'
    }
  }

  const getStatusBg = () => {
    switch (status.status) {
      case 'pending':
        return 'bg-warning-50 border-warning-200'
      case 'success':
        return 'bg-success-50 border-success-200'
      case 'failed':
        return 'bg-error-50 border-error-200'
      case 'timeout':
        return 'bg-warning-50 border-warning-200'
      default:
        return 'bg-secondary-50 border-secondary-200'
    }
  }

  const getStatusTextColor = () => {
    switch (status.status) {
      case 'pending':
        return 'text-warning-700'
      case 'success':
        return 'text-success-700'
      case 'failed':
        return 'text-error-700'
      case 'timeout':
        return 'text-warning-700'
      default:
        return 'text-secondary-700'
    }
  }

  const explorerUrl = getFlareExplorerUrl('tx', status.hash)

  return (
    <div className={`border rounded-lg p-4 ${getStatusBg()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${getStatusTextColor()}`}>
            {getStatusText()}
          </div>
          
          {showDetails && (
            <div className="mt-2 space-y-1 text-xs text-secondary-600">
              <div className="flex justify-between">
                <span>Transaction Hash:</span>
                <span className="font-mono">
                  {status.hash.slice(0, 10)}...{status.hash.slice(-8)}
                </span>
              </div>
              
              {status.confirmations > 0 && (
                <div className="flex justify-between">
                  <span>Confirmations:</span>
                  <span>{status.confirmations}</span>
                </div>
              )}
              
              {status.gasUsed && (
                <div className="flex justify-between">
                  <span>Gas Used:</span>
                  <span>{status.gasUsed.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Timestamp:</span>
                <span>{new Date(status.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-shrink-0 flex space-x-2">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary-400 hover:text-secondary-600 transition-colors"
            title="View on Flare Explorer"
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </a>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-secondary-400 hover:text-secondary-600 transition-colors"
              title="Dismiss"
            >
              <XCircleIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {status.status === 'pending' && (
        <div className="mt-3">
          <div className="w-full bg-secondary-200 rounded-full h-1">
            <div className="bg-warning-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <div className="text-xs text-secondary-500 mt-1">
            Waiting for network confirmation...
          </div>
        </div>
      )}
    </div>
  )
}

// Component for displaying multiple transactions
interface TransactionListProps {
  transactions: Map<string, TxStatus>
  maxItems?: number
  onDismiss?: (hash: string) => void
  className?: string
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  maxItems = 5,
  onDismiss,
  className = ''
}) => {
  const txArray = Array.from(transactions.entries())
    .sort(([, a], [, b]) => b.timestamp - a.timestamp)
    .slice(0, maxItems)

  if (txArray.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {txArray.map(([hash, status]) => (
        <TransactionStatusComponent
          key={hash}
          status={status}
          showDetails={false}
          onDismiss={onDismiss ? () => onDismiss(hash) : undefined}
        />
      ))}
    </div>
  )
}

// Toast notification component for transactions
interface TransactionToastProps {
  status: TxStatus
  onDismiss: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export const TransactionToast: React.FC<TransactionToastProps> = ({
  status,
  onDismiss,
  autoClose = true,
  autoCloseDelay = 5000
}) => {
  React.useEffect(() => {
    if (autoClose && (status.status === 'success' || status.status === 'failed')) {
      const timer = setTimeout(() => {
        onDismiss()
      }, autoCloseDelay)

      return () => clearTimeout(timer)
    }
  }, [status.status, autoClose, autoCloseDelay, onDismiss])

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
      <TransactionStatusComponent
        status={status}
        showDetails={true}
        onDismiss={onDismiss}
        className="shadow-lg"
      />
    </div>
  )
}

export default TransactionStatusComponent