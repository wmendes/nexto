import { createConfig } from '@wagmi/core'
import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { flareTestnet, flareMainnet, defaultChain } from './flare-config'

declare global {
  interface Window {
    ethereum?: any
  }
}

export const publicClient = createPublicClient({
  chain: defaultChain,
  transport: http()
})

export const getWalletClient = () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: defaultChain,
      transport: custom(window.ethereum)
    })
  }
  return null
}

export const wagmiConfig = createConfig({
  chains: [flareTestnet, flareMainnet],
  transports: {
    [flareTestnet.id]: http(),
    [flareMainnet.id]: http(),
  },
})

export const isMetaMaskInstalled = (): boolean => {
  if (typeof window === 'undefined') return false
  return Boolean(window.ethereum && window.ethereum.isMetaMask)
}

export const switchToFlareNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed')
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${defaultChain.id.toString(16)}` }],
    })
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${defaultChain.id.toString(16)}`,
            chainName: defaultChain.name,
            nativeCurrency: defaultChain.nativeCurrency,
            rpcUrls: [defaultChain.rpcUrls.default.http[0]],
            blockExplorerUrls: [defaultChain.blockExplorers?.default.url],
          }],
        })
      } catch (addError) {
        throw new Error('Failed to add Flare network to MetaMask')
      }
    } else {
      throw switchError
    }
  }
}