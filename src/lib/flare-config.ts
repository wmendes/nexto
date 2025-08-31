import { Chain } from 'viem'

export const flareTestnet: Chain = {
  id: 114,
  name: 'Flare Testnet Coston2',
  network: 'flare-coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Coston2 Flare',
    symbol: 'C2FLR',
  },
  rpcUrls: {
    public: { http: ['https://coston2-api.flare.network/ext/bc/C/rpc'] },
    default: { http: ['https://coston2-api.flare.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    etherscan: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
    default: {
      name: 'Flare Explorer',
      url: 'https://coston2-explorer.flare.network',
    },
  },
  testnet: true,
}

export const flareMainnet: Chain = {
  id: 14,
  name: 'Flare',
  network: 'flare',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    public: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] },
    default: { http: ['https://flare-api.flare.network/ext/bc/C/rpc'] },
  },
  blockExplorers: {
    etherscan: {
      name: 'Flare Explorer',
      url: 'https://flare-explorer.flare.network',
    },
    default: {
      name: 'Flare Explorer',
      url: 'https://flare-explorer.flare.network',
    },
  },
  testnet: false,
}

export const supportedChains = [flareTestnet, flareMainnet]

export const defaultChain = process.env.NODE_ENV === 'production' ? flareMainnet : flareTestnet

// Contract addresses (to be updated when contracts are deployed)
export const CONTRACT_ADDRESSES = {
  CONSORTIUM_NFT: process.env.NODE_ENV === 'production' 
    ? '' // Mainnet address
    : '0x1024F0078f7c37AC0cB604FE339452654bf3Fd77', // Testnet address
  GROUP_MANAGER: process.env.NODE_ENV === 'production'
    ? '' // Mainnet address  
    : '0xE386e60C0C9dd232353953b77Fa410625BBaE6Cb', // Testnet address
  MARKETPLACE: process.env.NODE_ENV === 'production'
    ? '' // Mainnet address
    : '0xcdd9E33835edbc2acCBdb37F255a448239f71e74', // Testnet address
}

// Flare-specific configuration
export const FLARE_CONFIG = {
  SECURE_RANDOM_API: 'https://api.flare.network/secure-random',
  FTSO_API: 'https://api.flare.network/ftso',
}