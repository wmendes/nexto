// Seeder script for Consortium Platform Demo Data
// Creates groups, users, NFTs, payments, and marketplace listings for demonstration

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// Demo data configuration
const DEMO_GROUPS = [
  {
    groupId: 'apartment-palermo-001',
    name: 'Apartamento Palermo Premium',
    totalValue: hre.ethers.parseEther('250000'), // 250,000 FLR
    quotas: 100,
    duration: 60, // 60 months
    adminFee: 300, // 3% (300 basis points)
    reserveFund: 200, // 2% (200 basis points)
    ipfsHash: 'QmPalermoApt001...'
  },
  {
    groupId: 'house-villacrespo-002', 
    name: 'Casa Villa Crespo',
    totalValue: hre.ethers.parseEther('180000'), // 180,000 FLR
    quotas: 80,
    duration: 48, // 48 months
    adminFee: 250, // 2.5%
    reserveFund: 150, // 1.5%
    ipfsHash: 'QmVillaCrespo002...'
  },
  {
    groupId: 'office-microcentro-003',
    name: 'Oficina Microcentro',
    totalValue: hre.ethers.parseEther('120000'), // 120,000 FLR
    quotas: 60,
    duration: 36, // 36 months
    adminFee: 200, // 2%
    reserveFund: 100, // 1%
    ipfsHash: 'QmMicrocentro003...'
  }
];

async function main() {
  console.log('🌱 Starting Consortium Platform Seeder...\n');

  // Get signers - on testnets/mainnet we only have deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);
  
  // Generate demo user addresses (these will be used for KYC but won't transact)
  const demoUsers = [];
  for (let i = 0; i < 3; i++) {
    const wallet = hre.ethers.Wallet.createRandom();
    demoUsers.push(wallet.address);
    console.log(`Demo User ${i + 1}:`, wallet.address);
  }

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../src/contracts/deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ Deployment file not found. Please run deployment first.');
    console.log('Run: npm run deploy:testnet');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log('📋 Using deployment:', deployment.contracts);

  // Get contract instances
  const consortiumNFT = await hre.ethers.getContractAt('ConsortiumNFT', deployment.contracts.ConsortiumNFT);
  const groupManager = await hre.ethers.getContractAt('GroupManager', deployment.contracts.GroupManager);
  const marketplace = await hre.ethers.getContractAt('Marketplace', deployment.contracts.Marketplace);

  console.log('\n🔑 Setting up KYC approvals...');
  
  // Approve KYC for deployer and demo users
  const kycUsers = [deployer.address, ...demoUsers];
  for (const userAddr of kycUsers) {
    try {
      await groupManager.setKYCApproval(userAddr, true);
      console.log(`✅ KYC approved for: ${userAddr}`);
    } catch (error) {
      console.log(`⚠️  KYC already set for: ${userAddr}`);
    }
  }

  console.log('\n🏢 Creating consortium groups...');
  
  // Create demo groups
  for (let i = 0; i < DEMO_GROUPS.length; i++) {
    const group = DEMO_GROUPS[i];
    try {
      console.log(`Creating group: ${group.name}`);
      
      const tx = await groupManager.createGroup(
        group.groupId,
        group.name,
        group.totalValue,
        group.quotas,
        group.duration,
        group.adminFee,
        group.reserveFund,
        group.ipfsHash
      );
      
      await tx.wait();
      console.log(`✅ Created group: ${group.groupId}`);
    } catch (error) {
      if (error.message.includes('Group already exists')) {
        console.log(`⚠️  Group already exists: ${group.groupId}`);
      } else {
        console.error(`❌ Error creating group ${group.groupId}:`, error.message);
      }
    }
  }

  console.log('\n👥 Adding deployer to groups and minting NFTs...');
  
  // For testnet/mainnet, only deployer can make transactions
  // Define deployer participation in groups
  const participations = [
    { groupId: DEMO_GROUPS[0].groupId, tokenURI: 'https://consortium.app/metadata/palermo/deployer.json' },
    { groupId: DEMO_GROUPS[1].groupId, tokenURI: 'https://consortium.app/metadata/villacrespo/deployer.json' },
    { groupId: DEMO_GROUPS[2].groupId, tokenURI: 'https://consortium.app/metadata/microcentro/deployer.json' }
  ];

  const mintedTokens = [];
  for (const participation of participations) {
    try {
      console.log(`Adding deployer to ${participation.groupId}`);
      
      const tx = await groupManager.connect(deployer).joinGroup(
        participation.groupId,
        participation.tokenURI
      );
      
      const receipt = await tx.wait();
      
      // Extract tokenId from events
      let tokenId = null;
      for (const log of receipt.logs) {
        if (log.topics[0] === hre.ethers.id('UserJoinedGroup(string,address,uint256)')) {
          tokenId = parseInt(log.topics[3], 16);
          break;
        }
      }
      
      if (tokenId) {
        mintedTokens.push({ 
          tokenId, 
          owner: deployer.address, 
          groupId: participation.groupId 
        });
        console.log(`✅ Deployer joined group, NFT minted: Token #${tokenId}`);
      } else {
        console.log('✅ Deployer joined group');
      }
    } catch (error) {
      if (error.message.includes('Already in group')) {
        console.log(`⚠️  Deployer already in group: ${participation.groupId}`);
      } else {
        console.error(`❌ Error adding deployer to group:`, error.message);
      }
    }
  }

  console.log('\n💳 Sample payments...');
  
  // Note: Payments are now made with FLR (native token) directly
  // No token contract approval needed for native FLR payments
  
  console.log('💰 Using FLR for payments (native token)')
  console.log('   Payments will be made directly with FLR')
  console.log('   No token approvals required for native FLR')
  
  const payments = [
    { groupId: DEMO_GROUPS[0].groupId, amount: '2500' },
    { groupId: DEMO_GROUPS[1].groupId, amount: '2250' },
    { groupId: DEMO_GROUPS[2].groupId, amount: '2000' }
  ];

  console.log(`📝 Would process ${payments.length} payments (${payments.map(p => p.amount).join(', ')} FLR)`)

  console.log('\n🛒 Creating marketplace listings...');
  
  // Create some marketplace listings for demo (only deployer-owned NFTs)
  if (mintedTokens.length > 0) {
    const listingsToCreate = mintedTokens.slice(0, 2); // List first 2 NFTs
    
    for (const token of listingsToCreate) {
      try {
        // First approve marketplace to handle the NFT
        await consortiumNFT.connect(deployer).approve(deployment.contracts.Marketplace, token.tokenId);
        
        // List the NFT
        const listPrice = hre.ethers.parseEther('1500'); // 1500 FLR
        const duration = 30 * 24 * 60 * 60; // 30 days
        
        const tx = await marketplace.connect(deployer).listNFT(
          token.tokenId,
          listPrice,
          duration
        );
        
        await tx.wait();
        console.log(`✅ NFT #${token.tokenId} listed for 1500 FLR`);
      } catch (error) {
        console.error(`❌ Failed to list NFT #${token.tokenId}:`, error.message);
      }
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log('===================');
  
  // Get final state
  try {
    const allGroups = await groupManager.getAllGroups();
    console.log(`✅ Groups created: ${allGroups.length}`);
    
    for (const groupId of allGroups) {
      const group = await groupManager.getGroup(groupId);
      console.log(`   - ${group.name}: ${group.participants}/${group.quotas} participants`);
    }

    const activeListings = await marketplace.getActiveListings();
    console.log(`✅ Marketplace listings: ${activeListings.length}`);
    
    console.log(`✅ Demo users with KYC: ${kycUsers.length}`);
    console.log(`✅ NFTs minted: ${mintedTokens.length}`);
    
  } catch (error) {
    console.error('❌ Error getting final state:', error.message);
  }

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Open the frontend application');
  console.log('2. Connect with one of the demo wallets');
  console.log('3. Explore groups, NFTs, payments, and marketplace');
  
  // Save seeding info
  const seedInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    groups: DEMO_GROUPS.map(g => g.groupId),
    kycUsers: kycUsers,
    demoUsers: demoUsers,
    mintedTokens,
    deployer: deployer.address
  };

  const seedPath = path.join(__dirname, '../src/contracts/seed-info.json');
  fs.writeFileSync(seedPath, JSON.stringify(seedInfo, null, 2));
  console.log(`\n💾 Seed info saved to: ${seedPath}`);
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });

module.exports = { main };