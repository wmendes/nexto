# NexTo - Next Generation Tokenized Real Estate Platform

NexTo is a revolutionary blockchain-based platform for tokenized real estate investments built on the Flare Network. Experience transparent property acquisition through NFT shares with secure payments and verifiable draws.

## 🚀 Features

- **🏢 Tokenized Real Estate**: Property investments converted to tradeable NFT shares
- **🔒 Secure Wallet Integration**: MetaMask wallet integration with Flare Network
- **💳 FLR Payments**: Native Flare (FLR) token payments for all transactions  
- **🎯 Transparent Draws**: Provably fair draws using Flare's Secure Random Numbers
- **🛒 NFT Marketplace**: Buy and sell property shares from other investors
- **📊 Real-time Dashboard**: Track your investments and portfolio performance
- **🔐 KYC Verification**: Built-in identity verification system
- **⚡ Low Fees**: Cost-effective transactions on Flare Network

## 🏗️ Technology Stack

- **Frontend**: Next.js 15 with React 18, TypeScript, Tailwind CSS
- **Blockchain**: Flare Network (Layer 1)
- **Wallet Integration**: MetaMask with viem/wagmi
- **Smart Contracts**: Solidity contracts for NFT management and payments
- **Styling**: Tailwind CSS with custom Flare Network theme
- **Icons**: Heroicons for consistent UI elements

## 🔧 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0 or higher
- **npm**, **yarn**, or **pnpm** package manager
- **MetaMask** browser extension installed
- **Flare Network** added to your MetaMask

### Adding Flare Network to MetaMask

1. Open MetaMask → Add Network
2. Network Details:
   - **Network Name**: Flare Network
   - **RPC URL**: `https://flare-api.flare.network/ext/C/rpc`
   - **Chain ID**: `14`
   - **Symbol**: `FLR`
   - **Explorer**: `https://flare-explorer.flare.network/`

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd consorcios
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure your `.env.local`:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FLARE_RPC_URL=https://flare-api.flare.network/ext/C/rpc
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Usage

### For Investors

1. **Connect Wallet**: Connect your MetaMask wallet to the Flare Network
2. **Complete KYC**: Verify your identity to access investment features
3. **Browse Groups**: Explore available real estate investment groups
4. **Purchase Shares**: Buy NFT shares representing property ownership
5. **Track Portfolio**: Monitor your investments on the dashboard
6. **Trade on Marketplace**: Buy/sell shares with other investors

### For Group Organizers

1. **Create Groups**: Set up new real estate investment opportunities  
2. **Manage Properties**: Configure quotas, pricing, and participation rules
3. **Conduct Draws**: Use Flare's provably fair random numbers for selections
4. **Handle Payments**: Process investor payments and distributions

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Investor dashboard
│   ├── groups/           # Investment groups
│   ├── nfts/             # NFT portfolio management
│   ├── marketplace/      # NFT trading
│   └── payments/         # Payment management
├── components/           # Reusable React components
├── hooks/               # Custom React hooks
│   ├── useWallet.tsx    # Wallet connection
│   ├── useContracts.ts  # Smart contract interactions
│   └── useKYC.ts        # KYC verification
├── lib/                 # Configuration and utilities
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

## 🔧 Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler

## 🌐 Smart Contract Integration

NexTo integrates with custom smart contracts deployed on Flare Network:

- **ConsortiumNFT**: Manages tokenized property shares as NFTs
- **GroupManager**: Handles investment group creation and management
- **PaymentManager**: Processes FLR payments and distributions
- **Marketplace**: Enables peer-to-peer trading of NFT shares

## 🔒 Security

- **Private Key Safety**: Never commit wallet files or private keys
- **Environment Variables**: Keep sensitive data in `.env.local` 
- **KYC Verification**: Built-in identity verification for compliance
- **Smart Contract Audited**: Contracts follow security best practices

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on each commit

### Manual Deployment

```bash
npm run build
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Flare Network** for providing the blockchain infrastructure
- **Next.js** team for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework
- **MetaMask** for wallet integration capabilities

## 📞 Support

For support, email support@nexto.com or join our Discord community.

## 🔗 Links

- **Website**: [https://nexto.com](https://nexto.com)
- **Documentation**: [https://docs.nexto.com](https://docs.nexto.com)
- **Twitter**: [@NexToPlatform](https://twitter.com/NexToPlatform)
- **Discord**: [NexTo Community](https://discord.gg/nexto)

---

**Built with ❤️ on Flare Network** 🚀