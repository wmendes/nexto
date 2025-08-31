# 🌱 Consortium Platform Seeder

This document explains how to set up demo data for the Consortium Platform using the blockchain seeder script.

## Overview

The seeder script creates realistic demo data directly on the blockchain, including:
- **Consortium Groups**: Multiple real estate consortium groups with different properties
- **KYC Approvals**: Automatic KYC approval for demo users  
- **NFT Memberships**: Minted NFTs representing group participations
- **Payment History**: Sample payments to demonstrate the payment system
- **Marketplace Listings**: NFTs listed for sale in the marketplace

## Prerequisites

1. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your private key
   ```

2. **Contracts Deployed**: Ensure contracts are deployed first
   ```bash
   npm run compile
   npm run deploy:testnet  # or deploy:mainnet
   ```

3. **Wallet Setup**: Your wallet should have sufficient FLR tokens for:
   - Contract deployment gas fees
   - Seeding transactions (group creation, NFT minting, payments)
   - Multiple user accounts (deployer + 3 demo users)

## Quick Start

### Option 1: Deploy + Seed in One Command
```bash
npm run setup:testnet
```

### Option 2: Seed Existing Deployment
```bash
npm run seed:testnet
```

### Option 3: Local Development
```bash
# Start local Hardhat network in another terminal
npx hardhat node

# Deploy and seed to localhost
npm run deploy:localhost
npm run seed:localhost
```

## What Gets Created

### 📊 Consortium Groups
1. **Apartamento Palermo Premium**
   - Value: 250,000 FLR
   - Quotas: 100 (2,500 FLR each)
   - Duration: 60 months
   - Admin Fee: 3%

2. **Casa Villa Crespo**
   - Value: 180,000 FLR  
   - Quotas: 80 (2,250 FLR each)
   - Duration: 48 months
   - Admin Fee: 2.5%

3. **Oficina Microcentro**
   - Value: 120,000 FLR
   - Quotas: 60 (2,000 FLR each)
   - Duration: 36 months
   - Admin Fee: 2%

### 👥 Demo Users
- **Deployer**: Your wallet address (participates in all groups)
- **Demo Users**: 3 generated addresses with KYC approval (for frontend testing)

### 🏷️ NFT Memberships
- 3 NFTs minted (deployer joins each group once)
- Each NFT represents a quota membership
- Metadata includes group and ownership details

### 💳 Payment History
- Sample payments for each group the deployer joined
- Demonstrates payment tracking system
- Shows different payment amounts per group

### 🛒 Marketplace Listings
- 2 NFTs listed for sale (1,500 FLR each)
- 30-day listing duration
- Ready for marketplace testing

## Verification

After seeding, verify the setup:

1. **Check Groups**:
   ```bash
   # Frontend: Visit /groups to see created groups
   # Should show 3 groups with participants
   ```

2. **Check NFTs**: 
   ```bash
   # Frontend: Visit /nfts (connect with demo wallet)
   # Should show owned NFTs with payment history
   ```

3. **Check Marketplace**:
   ```bash
   # Frontend: Visit /marketplace  
   # Should show 2 listed NFTs available for purchase
   ```

4. **Check Payments**:
   ```bash
   # Frontend: Visit /payments (connect with demo wallet)
   # Should show NFTs with payment history and next due dates
   ```

## Troubleshooting

### Common Issues

**"Deployment file not found"**
```bash
# Run deployment first
npm run deploy:testnet
```

**"Group already exists"**
```bash
# Normal if seeding again - existing groups are preserved
# Script continues with remaining operations
```

**"Insufficient funds"**
```bash
# Ensure wallet has enough FLR tokens
# Testnet: Get tokens from Coston2 faucet
# Mainnet: Ensure sufficient balance
```

**"KYC already set"**
```bash
# Normal if seeding again - KYC approvals are preserved  
# Script continues with remaining operations
```

### Reset Demo Data

To start fresh:

1. **Deploy New Contracts** (generates new addresses):
   ```bash
   npm run deploy:testnet
   npm run seed:testnet
   ```

2. **Or Clear Local Chain** (localhost only):
   ```bash
   # Stop hardhat node (Ctrl+C)
   # Restart hardhat node
   npx hardhat node
   
   # Deploy and seed fresh
   npm run deploy:localhost
   npm run seed:localhost  
   ```

## Script Output

Successful seeding produces output like:
```
🌱 Starting Consortium Platform Seeder...

📋 Using deployment: { ConsortiumNFT: '0x...', GroupManager: '0x...' }
🔑 Setting up KYC approvals...
✅ KYC approved for: 0x1234...

🏢 Creating consortium groups...
✅ Created group: apartment-palermo-001

👥 Adding users to groups and minting NFTs...
✅ User joined group, NFT minted: Token #1

💳 Making sample payments...
✅ Payment processed: 2500 FLR

🛒 Creating marketplace listings...
✅ NFT #1 listed for 1500 FLR

📊 Seeding Summary:
✅ Groups created: 3
✅ Demo users with KYC: 4  
✅ NFTs minted: 6
✅ Marketplace listings: 2

🎉 Seeding completed successfully!
```

## Files Generated

- `src/contracts/deployment.json`: Contract addresses
- `src/contracts/seed-info.json`: Seeding summary and user addresses

## Next Steps

After successful seeding:
1. Start the frontend: `npm run dev`
2. Connect wallets using the demo addresses from the seeder output
3. Explore all features with real blockchain data
4. Test group joining, payments, and marketplace functionality

## Network Costs

Approximate gas costs for seeding:
- **Testnet**: ~0.1-0.2 FLR (very low cost)
- **Mainnet**: ~10-20 FLR (depending on gas prices)

The seeder optimizes gas usage by batching operations where possible.