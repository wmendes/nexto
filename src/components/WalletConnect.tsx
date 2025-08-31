'use client'

import React from 'react'
import { useWallet } from '@/hooks/useWallet'
import { shortenAddress, formatFlareBalance } from '@/utils/flare'
import { defaultChain } from '@/lib/flare-config'
import { WalletIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

const WalletConnect: React.FC = () => {
  const { 
    isConnected, 
    address, 
    balance, 
    chainId, 
    isConnecting, 
    error, 
    connect, 
    disconnect, 
    switchNetwork,
    refreshBalance 
  } = useWallet()

  if (isConnected && address) {
    const isWrongNetwork = chainId !== defaultChain.id
    
    return (
      <div className="flex items-center space-x-4">
        {/* Balance Display */}
        <div className="hidden md:flex items-center space-x-2 text-sm text-secondary-600">
          <span className="flare-text font-medium">
            {parseFloat(balance.flr).toFixed(4)} FLR
          </span>
          <button
            onClick={refreshBalance}
            className="p-1 hover:bg-secondary-100 rounded transition-colors"
            title="Refresh Balance"
          >
            <ArrowPathIcon className="w-3 h-3 text-secondary-400" />
          </button>
        </div>

        {/* Network Warning */}
        {isWrongNetwork && (
          <button
            onClick={switchNetwork}
            className="flex items-center space-x-1 px-3 py-1 bg-warning-100 text-warning-800 rounded-full text-xs font-medium hover:bg-warning-200 transition-colors"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Wrong Network</span>
          </button>
        )}

        {/* Wallet Address */}
        <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-secondary-200 shadow-sm">
          <div className="w-2 h-2 bg-success-500 rounded-full"></div>
          <span className="text-sm font-medium text-secondary-900">
            {shortenAddress(address)}
          </span>
          <button
            onClick={disconnect}
            className="text-xs text-secondary-500 hover:text-secondary-700 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-2">
      {error && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <button
        onClick={connect}
        disabled={isConnecting}
        className="btn-primary flex items-center space-x-2 min-w-[140px]"
      >
        {isConnecting ? (
          <>
            <div className="loading-spinner w-4 h-4"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <WalletIcon className="w-4 h-4" />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
    </div>
  )
}

export default WalletConnect