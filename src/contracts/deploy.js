// Deploy script for Flare network consortium contracts
// This script deploys all contracts and sets up initial configuration

const hre = require('hardhat');

async function main() {
    console.log('Deploying Consortium Platform contracts to Flare...');
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deploying contracts with account:', deployer.address);
    console.log('Account balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'FLR');
    
    // Deploy ConsortiumNFT contract
    console.log('\n1. Deploying ConsortiumNFT...');
    const ConsortiumNFT = await hre.ethers.getContractFactory('ConsortiumNFT');
    const consortiumNFT = await ConsortiumNFT.deploy();
    await consortiumNFT.waitForDeployment();
    const consortiumNFTAddress = await consortiumNFT.getAddress();
    console.log('ConsortiumNFT deployed to:', consortiumNFTAddress);
    
    // Using Flare (FLR) as the primary payment token - no USDC needed
    console.log('Using FLR as primary payment token');
    
    // Deploy GroupManager contract
    console.log('\n2. Deploying GroupManager...');
    const GroupManager = await hre.ethers.getContractFactory('GroupManager');
    const groupManager = await GroupManager.deploy(
        consortiumNFTAddress,
        '0x0000000000000000000000000000000000000000' // Zero address since we're using FLR only
    );
    await groupManager.waitForDeployment();
    const groupManagerAddress = await groupManager.getAddress();
    console.log('GroupManager deployed to:', groupManagerAddress);
    
    // Deploy Marketplace contract
    console.log('\n3. Deploying Marketplace...');
    const Marketplace = await hre.ethers.getContractFactory('Marketplace');
    const marketplace = await Marketplace.deploy(
        consortiumNFTAddress,
        '0x0000000000000000000000000000000000000000' // Zero address since we're using FLR only
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log('Marketplace deployed to:', marketplaceAddress);
    
    // Set up contract permissions
    console.log('\n4. Setting up contract permissions...');
    
    // Set GroupManager as authorized to mint NFTs
    await consortiumNFT.setGroupManager(groupManagerAddress);
    console.log('✓ GroupManager authorized to mint NFTs');
    
    // Approve marketplace to handle NFTs
    // Note: Users will need to approve individually when listing
    console.log('✓ Marketplace ready to handle NFT transfers');
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\nContract Addresses:');
    console.log('==================');
    console.log('ConsortiumNFT:', consortiumNFTAddress);
    console.log('GroupManager:', groupManagerAddress);
    console.log('Marketplace:', marketplaceAddress);
    
    console.log('\nNext Steps:');
    console.log('1. Update frontend configuration with contract addresses');
    console.log('2. Verify contracts on Flare Explorer');
    console.log('3. Set up initial KYC approvals');
    console.log('4. Create test consortium groups');
    
    // Save deployment info to file for frontend integration
    const deploymentInfo = {
        network: 'flare-testnet', // or 'flare-mainnet'
        timestamp: new Date().toISOString(),
        contracts: {
            ConsortiumNFT: consortiumNFTAddress,
            GroupManager: groupManagerAddress,
            Marketplace: marketplaceAddress
        },
        tokens: {
            FLR: 'native' // FLR is the native token
        },
        deployer: deployer.address
    };
    
    // Write deployment info to a JSON file
    const fs = require('fs');
    const path = require('path');
    
    const deploymentPath = path.join(__dirname, 'deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\nDeployment info saved to:', deploymentPath);
    
    return deploymentInfo;
}

// Handle deployment errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Deployment failed:', error);
        process.exit(1);
    });

module.exports = { main };