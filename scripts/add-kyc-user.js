// Script to add a specific wallet address to KYC approved users
const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    // Get the wallet address to approve from command line or use default
    const walletToApprove = process.argv[2] || '0xB1486F7AB76222b60C54C651955c958b715035c8';
    
    console.log('Adding wallet to KYC approved users:', walletToApprove);
    
    // Connect to Flare testnet
    const provider = new ethers.JsonRpcProvider(process.env.FLARE_TESTNET_RPC || 'https://coston2-api.flare.network/ext/bc/C/rpc');
    
    // Use the deployer wallet (has admin permissions)
    const deployerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('Using deployer wallet:', deployerWallet.address);
    console.log('Balance:', ethers.formatEther(await provider.getBalance(deployerWallet.address)), 'FLR');
    
    // Load deployed contract addresses
    const deploymentInfo = require('../src/contracts/deployment.json');
    const groupManagerAddress = deploymentInfo.contracts.GroupManager;
    
    // GroupManager ABI for KYC function
    const groupManagerABI = [
        "function setKYCApproval(address user, bool approved) external",
        "function isKYCApproved(address user) external view returns (bool)"
    ];
    
    const groupManager = new ethers.Contract(groupManagerAddress, groupManagerABI, deployerWallet);
    
    try {
        // Check current KYC status
        const currentStatus = await groupManager.isKYCApproved(walletToApprove);
        console.log('Current KYC status:', currentStatus);
        
        if (currentStatus) {
            console.log('✅ Wallet is already KYC approved!');
            return;
        }
        
        // Approve KYC for the wallet
        console.log('Setting KYC approval...');
        const tx = await groupManager.setKYCApproval(walletToApprove, true);
        console.log('Transaction sent:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('Transaction confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Verify the approval
        const newStatus = await groupManager.isKYCApproved(walletToApprove);
        console.log('New KYC status:', newStatus);
        
        if (newStatus) {
            console.log('🎉 Wallet successfully added to KYC approved users!');
            console.log('💡 You can now:');
            console.log('   - Join consortium groups');
            console.log('   - Make payments');
            console.log('   - Participate in draws');
            console.log('   - Use the marketplace');
        } else {
            console.log('❌ Failed to approve KYC - please check the transaction');
        }
        
    } catch (error) {
        console.error('Error adding wallet to KYC:', error.message);
        if (error.message.includes('Ownable: caller is not the owner')) {
            console.log('💡 Note: Only the contract owner can approve KYC');
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });