'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { useWallet } from '@/hooks/useWallet'
import { useGroups } from '@/hooks/useGroups'
import { 
  BuildingOfficeIcon, 
  CubeIcon, 
  ShieldCheckIcon,
  BoltIcon,
  GlobeAltIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline'

export default function Home() {
  const { isConnected } = useWallet()
  const { groups, isLoading } = useGroups()
  const [stats, setStats] = useState({
    activeGroups: 0,
    totalParticipants: 0,
    totalValue: 0,
    completedDraws: 0
  })

  useEffect(() => {
    if (groups.length > 0) {
      const activeGroups = groups.filter(g => g.status === 'active').length
      const totalParticipants = groups.reduce((sum, g) => sum + g.participants, 0)
      const totalValue = groups.reduce((sum, g) => sum + g.totalValue, 0)
      
      setStats({
        activeGroups,
        totalParticipants,
        totalValue,
        completedDraws: 0 // This would need to come from contract data
      })
    }
  }, [groups])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-4xl sm:text-6xl font-bold text-secondary-900 mb-6">
              Next Generation
              <span className="flare-text block">Tokenized Real Estate</span>
            </h1>
            <p className="text-xl text-secondary-600 max-w-3xl mx-auto mb-8">
              Experience the future of real estate investment with NexTo&apos;s blockchain-based platform. 
              Own NFT shares, make secure payments, and participate in transparent property acquisition.
            </p>
          </div>

          {!isConnected ? (
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="text-sm text-secondary-600">
                Connect your wallet to get started
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link 
                href="/groups"
                className="btn-primary flex items-center space-x-2 text-lg px-8 py-3"
              >
                <span>Explore Groups</span>
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              <Link 
                href="/dashboard"
                className="btn-secondary text-lg px-8 py-3"
              >
                View Dashboard
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              Why Choose NexTo?
            </h2>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Built on Flare Network for maximum transparency, security, and cost-effectiveness
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 flare-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                <CubeIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                NFT Shares
              </h3>
              <p className="text-secondary-600">
                Your consortium participation is tokenized as an NFT, enabling transparent ownership and marketplace trading.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 flare-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Verifiable Draws
              </h3>
              <p className="text-secondary-600">
                Draws use Flare's Secure Random Numbers for complete transparency and auditability by anyone.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 flare-gradient rounded-lg flex items-center justify-center mx-auto mb-4">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                Low Fees
              </h3>
              <p className="text-secondary-600">
                Built on Flare Network for fast transactions and minimal fees, making participation accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-secondary-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-secondary-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-secondary-600">
              Simple steps to start building your real estate portfolio
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Connect Wallet</h3>
              <p className="text-sm text-secondary-600">Connect your MetaMask wallet and complete KYC verification</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Join Group</h3>
              <p className="text-sm text-secondary-600">Browse available groups and join one that matches your budget</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Receive NFT</h3>
              <p className="text-sm text-secondary-600">Get your consortium share as a tradeable NFT in your wallet</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                4
              </div>
              <h3 className="font-semibold text-secondary-900 mb-2">Pay & Win</h3>
              <p className="text-sm text-secondary-600">Make monthly payments and participate in transparent draws</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {isConnected && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold flare-text mb-2">
                    {isLoading ? '...' : stats.activeGroups}
                  </div>
                <div className="text-secondary-600">Active Groups</div>
              </div>
              <div>
                <div className="text-3xl font-bold flare-text mb-2">
                    {isLoading ? '...' : stats.totalParticipants}
                  </div>
                <div className="text-secondary-600">Total Participants</div>
              </div>
              <div>
                <div className="text-3xl font-bold flare-text mb-2">
                    {isLoading ? '...' : `$${stats.totalValue.toLocaleString()}`}
                  </div>
                <div className="text-secondary-600">Total Value Locked</div>
              </div>
              <div>
                <div className="text-3xl font-bold flare-text mb-2">
                    {isLoading ? '...' : stats.completedDraws}
                  </div>
                <div className="text-secondary-600">Completed Draws</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 flare-gradient rounded-lg flex items-center justify-center">
                  <BuildingOfficeIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">NexTo</span>
              </div>
              <p className="text-secondary-400 text-sm">
                Next generation tokenized real estate on Flare Network
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li>Groups</li>
                <li>Marketplace</li>
                <li>Dashboard</li>
                <li>Analytics</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-secondary-400">
                <li>Documentation</li>
                <li>Support</li>
                <li>Terms</li>
                <li>Privacy</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Network</h3>
              <div className="flex items-center space-x-2 text-sm text-secondary-400">
                <GlobeAltIcon className="w-4 h-4" />
                <span>Powered by Flare Network</span>
              </div>
            </div>
          </div>

          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-sm text-secondary-400">
            <p>&copy; 2024 NexTo Platform. Built with ❤️ on Flare Network.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
