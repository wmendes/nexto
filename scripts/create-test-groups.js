const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    console.log('Creating test consortium groups...');
    
    // Connect to Flare testnet
    const provider = new ethers.JsonRpcProvider(process.env.FLARE_TESTNET_RPC || 'https://coston2-api.flare.network/ext/bc/C/rpc');
    
    // Use the deployer wallet
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('Using wallet:', wallet.address);
    console.log('Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'FLR');
    
    // Load deployed contract addresses
    const deploymentInfo = require('../src/contracts/deployment.json');
    const groupManagerAddress = deploymentInfo.contracts.GroupManager;
    
    console.log('Using FLR as payment currency (native token)');
    
    // GroupManager ABI (simplified for createGroup function)
    const groupManagerABI = [
        "function createGroup(string groupId, string name, uint256 totalValue, uint256 quotas, uint256 duration, uint256 adminFee, uint256 reserveFund, string ipfsHash) external"
    ];
    
    const groupManager = new ethers.Contract(groupManagerAddress, groupManagerABI, wallet);
    
    // Test groups data
    const testGroups = [
        {
            groupId: 'palermo-premium-001',
            name: 'Apartamento Palermo Premium',
            totalValue: ethers.parseUnits('250000', 18), // 250,000 FLR
            quotas: 100,
            duration: 60, // 60 months
            adminFee: 300, // 3% in basis points (300 = 3%)
            reserveFund: 200, // 2% in basis points
            ipfsHash: 'QmX1234567890abcdef'
        },
        {
            groupId: 'villa-crespo-001',
            name: 'Casa Villa Crespo',
            totalValue: ethers.parseUnits('180000', 18), // 180,000 FLR
            quotas: 80,
            duration: 48, // 48 months
            adminFee: 250, // 2.5%
            reserveFund: 150, // 1.5%
            ipfsHash: 'QmY5678901234abcdef'
        },
        {
            groupId: 'san-telmo-001',
            name: 'Apartamento San Telmo',
            totalValue: ethers.parseUnits('150000', 18), // 150,000 FLR
            quotas: 60,
            duration: 36, // 36 months
            adminFee: 400, // 4%
            reserveFund: 200, // 2%
            ipfsHash: 'QmZ91011121314abcdef'
        }
    ];
    
    // Create test groups
    for (const group of testGroups) {
        try {
            console.log(`\nCreating group: ${group.name}`);
            
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
            
            console.log('Transaction sent:', tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('Group created successfully!');
            console.log('Block:', receipt.blockNumber);
            console.log('Gas used:', receipt.gasUsed.toString());
            
        } catch (error) {
            console.error('Error creating group:', error.message);
            if (error.message.includes('Group already exists')) {
                console.log('Group already exists, skipping...');
            }
        }
    }
    
    console.log('\n🎉 Test groups creation completed!');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });