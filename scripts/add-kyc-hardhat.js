// Script to add KYC approval using hardhat
const hre = require('hardhat');

async function main() {
    const walletToApprove = '0xB1486F7AB76222b60C54C651955c958b715035c8';
    
    console.log('🔑 Adding wallet to KYC approved users:', walletToApprove);
    
    // Get deployer (has admin permissions)
    const [deployer] = await hre.ethers.getSigners();
    console.log('Using deployer:', deployer.address);
    console.log('Balance:', hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'FLR');
    
    // Load deployment info
    const deploymentInfo = require('../src/contracts/deployment.json');
    const groupManagerAddress = deploymentInfo.contracts.GroupManager;
    console.log('GroupManager address:', groupManagerAddress);
    
    // Get contract instance
    const groupManager = await hre.ethers.getContractAt('GroupManager', groupManagerAddress);
    
    try {
        // Check current KYC status using the mapping
        console.log('Checking current KYC status...');
        const currentStatus = await groupManager.kycApproved(walletToApprove);
        console.log('Current KYC status:', currentStatus);
        
        if (currentStatus) {
            console.log('✅ Wallet is already KYC approved!');
            return;
        }
        
        // Approve KYC
        console.log('Setting KYC approval...');
        const tx = await groupManager.setKYCApproval(walletToApprove, true);
        console.log('Transaction sent:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());
        
        // Verify the approval
        const newStatus = await groupManager.kycApproved(walletToApprove);
        console.log('New KYC status:', newStatus);
        
        if (newStatus) {
            console.log('🎉 Wallet successfully added to KYC approved users!');
            console.log('\n💡 You can now:');
            console.log('   - View and join consortium groups');
            console.log('   - Make payments with FLR');
            console.log('   - Participate in monthly draws');
            console.log('   - Use the NFT marketplace');
            console.log('\n🌐 Connect your wallet to the frontend to get started!');
        }
        
    } catch (error) {
        console.error('❌ Error adding wallet to KYC:', error.message);
        
        if (error.message.includes('Ownable: caller is not the owner')) {
            console.log('💡 Note: Only the contract owner can approve KYC');
        } else if (error.message.includes('execution reverted')) {
            console.log('💡 Transaction was reverted - check contract state');
        }
        
        // Try to get more details about the error
        if (error.data) {
            console.log('Error data:', error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });