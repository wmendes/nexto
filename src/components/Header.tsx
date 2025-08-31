'use client'

import React from 'react'
import Link from 'next/link'
import WalletConnect from './WalletConnect'
import { HomeIcon, BuildingOfficeIcon, CubeIcon, ShoppingBagIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { useWallet } from '@/hooks/useWallet'

const Header: React.FC = () => {
  const { isConnected } = useWallet()

  return (
    <header className="bg-white border-b border-secondary-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 flare-gradient rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-secondary-900 group-hover:flare-text transition-colors">
                NexTo
              </span>
            </Link>
          </div>

          {/* Navigation */}
          {isConnected && (
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/dashboard" 
                className="flex items-center space-x-1 text-secondary-600 hover:text-primary-600 transition-colors"
              >
                <HomeIcon className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/groups" 
                className="flex items-center space-x-1 text-secondary-600 hover:text-primary-600 transition-colors"
              >
                <BuildingOfficeIcon className="w-4 h-4" />
                <span>Groups</span>
              </Link>
              <Link 
                href="/nfts" 
                className="flex items-center space-x-1 text-secondary-600 hover:text-primary-600 transition-colors"
              >
                <CubeIcon className="w-4 h-4" />
                <span>My NFTs</span>
              </Link>
              <Link 
                href="/marketplace" 
                className="flex items-center space-x-1 text-secondary-600 hover:text-primary-600 transition-colors"
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span>Marketplace</span>
              </Link>
              <Link 
                href="/payments" 
                className="flex items-center space-x-1 text-secondary-600 hover:text-primary-600 transition-colors"
              >
                <CreditCardIcon className="w-4 h-4" />
                <span>Payments</span>
              </Link>
            </nav>
          )}

          {/* Wallet Connection */}
          <div className="flex items-center">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header