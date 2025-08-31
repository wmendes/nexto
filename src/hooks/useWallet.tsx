'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { createWalletClient, createPublicClient, custom, formatEther, getAddress, http } from 'viem'
import { defaultChain, flareTestnet } from '@/lib/flare-config'
import { switchToFlareNetwork, isMetaMaskInstalled } from '@/lib/web3-config'
import { WalletState } from '@/types'

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: {
      flr: '0',
    },
    isConnecting: false,
    error: null,
  })

  const [publicClient, setPublicClient] = useState<any>(null)

  // Initialize public client
  useEffect(() => {
    const client = createPublicClient({
      chain: defaultChain,
      transport: http(defaultChain.rpcUrls.default.http[0]),
    })
    setPublicClient(client)
    console.log('Initialized public client for', defaultChain.name, 'with RPC:', defaultChain.rpcUrls.default.http[0])
  }, [])

  const refreshBalance = useCallback(async () => {
    if (!wallet.address || !wallet.isConnected || !publicClient) {
      console.log('refreshBalance skipped:', { 
        hasAddress: !!wallet.address, 
        isConnected: wallet.isConnected, 
        hasPublicClient: !!publicClient 
      })
      return
    }

    try {
      console.log('Fetching balance for address:', wallet.address)
      
      // Get FLR balance
      const balance = await publicClient.getBalance({
        address: wallet.address as `0x${string}`,
      })

      const formattedBalance = formatEther(balance)
      console.log('Balance fetched successfully:', { raw: balance.toString(), formatted: formattedBalance })

      setWallet(prev => ({
        ...prev,
        balance: {
          ...prev.balance,
          flr: formattedBalance,
        },
      }))
    } catch (error) {
      console.error('Error fetching balance:', error)
      // Try to provide more specific error information
      if (error instanceof Error) {
        console.error('Error details:', error.message)
      }
    }
  }, [wallet.address, wallet.isConnected, publicClient])

  // Auto-refresh balance when wallet is connected and public client is ready
  useEffect(() => {
    if (wallet.isConnected && wallet.address && publicClient) {
      console.log('Auto-triggering balance refresh - wallet connected and client ready')
      refreshBalance()
    }
  }, [wallet.isConnected, wallet.address, publicClient, refreshBalance])

  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      setWallet(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to continue.',
      }))
      return
    }

    setWallet(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const address = getAddress(accounts[0])
      
      // Get current chain ID
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      })

      const chainIdNumber = parseInt(chainId, 16)

      // Check if we're on the correct network
      if (chainIdNumber !== defaultChain.id) {
        await switchToFlareNetwork()
      }

      setWallet(prev => ({
        ...prev,
        isConnected: true,
        address,
        chainId: chainIdNumber,
        isConnecting: false,
        error: null,
      }))

      // Balance will be refreshed automatically by useEffect
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }))
    }
  }

  const disconnect = () => {
    setWallet({
      isConnected: false,
      address: null,
      chainId: null,
      balance: {
        flr: '0',
      },
      isConnecting: false,
      error: null,
    })
  }

  const switchNetwork = async () => {
    try {
      await switchToFlareNetwork()
      setWallet(prev => ({
        ...prev,
        chainId: defaultChain.id,
        error: null,
      }))
    } catch (error: any) {
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to switch network',
      }))
    }
  }

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum || !isMetaMaskInstalled()) return

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect()
      } else {
        const address = getAddress(accounts[0])
        setWallet(prev => ({
          ...prev,
          address,
          error: null,
        }))
        // Balance will be refreshed automatically by useEffect
      }
    }

    const handleChainChanged = (chainId: string) => {
      const chainIdNumber = parseInt(chainId, 16)
      setWallet(prev => ({
        ...prev,
        chainId: chainIdNumber,
        error: chainIdNumber !== defaultChain.id ? 'Please switch to Flare Network' : null,
      }))
    }

    const handleConnect = () => {
      console.log('MetaMask connected')
    }

    const handleDisconnect = () => {
      disconnect()
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('connect', handleConnect)
    window.ethereum.on('disconnect', handleDisconnect)

    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('connect', handleConnect)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [])

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum || !isMetaMaskInstalled()) return

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        })

        if (accounts.length > 0) {
          const address = getAddress(accounts[0])
          const chainId = await window.ethereum.request({
            method: 'eth_chainId',
          })
          const chainIdNumber = parseInt(chainId, 16)

          setWallet(prev => ({
            ...prev,
            isConnected: true,
            address,
            chainId: chainIdNumber,
            error: chainIdNumber !== defaultChain.id ? 'Please switch to Flare Network' : null,
          }))

          // Balance will be refreshed automatically by useEffect
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }

    checkConnection()
  }, [])

  const contextValue: WalletContextType = {
    ...wallet,
    connect,
    disconnect,
    switchNetwork,
    refreshBalance,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}