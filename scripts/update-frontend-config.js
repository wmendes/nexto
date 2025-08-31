// Script to automatically update frontend contract addresses
// This script reads from deployment.json and updates the frontend configuration

const fs = require('fs');
const path = require('path');

async function main() {
    console.log('🔄 Updating frontend contract configuration...');
    
    // Read deployment info
    const deploymentPath = path.join(__dirname, '../src/contracts/deployment.json');
    if (!fs.existsSync(deploymentPath)) {
        console.error('❌ Deployment file not found:', deploymentPath);
        console.log('Run deployment first: npm run deploy:testnet');
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    console.log('📋 Reading deployment from:', deployment.network);
    console.log('Contract addresses:', deployment.contracts);

    // Read current frontend config
    const configPath = path.join(__dirname, '../src/lib/flare-config.ts');
    if (!fs.existsSync(configPath)) {
        console.error('❌ Frontend config file not found:', configPath);
        process.exit(1);
    }

    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Update contract addresses based on network
    const isTestnet = deployment.network === 'flare-testnet';
    const addressKey = isTestnet ? 'testnet' : 'mainnet';
    
    // Update CONTRACT_ADDRESSES section
    const contractAddressesRegex = /export const CONTRACT_ADDRESSES = \{[\s\S]*?\}/;
    
    const newContractAddresses = `export const CONTRACT_ADDRESSES = {
  CONSORTIUM_NFT: process.env.NODE_ENV === 'production' 
    ? '${isTestnet ? '' : deployment.contracts.ConsortiumNFT}' // Mainnet address
    : '${isTestnet ? deployment.contracts.ConsortiumNFT : ''}', // Testnet address
  GROUP_MANAGER: process.env.NODE_ENV === 'production'
    ? '${isTestnet ? '' : deployment.contracts.GroupManager}' // Mainnet address  
    : '${isTestnet ? deployment.contracts.GroupManager : ''}', // Testnet address
  MARKETPLACE: process.env.NODE_ENV === 'production'
    ? '${isTestnet ? '' : deployment.contracts.Marketplace}' // Mainnet address
    : '${isTestnet ? deployment.contracts.Marketplace : ''}', // Testnet address
}`;

    if (contractAddressesRegex.test(configContent)) {
        configContent = configContent.replace(contractAddressesRegex, newContractAddresses);
        console.log('✅ Updated CONTRACT_ADDRESSES section');
    } else {
        console.warn('⚠️  Could not find CONTRACT_ADDRESSES section to update');
    }

    // Write updated config
    fs.writeFileSync(configPath, configContent);
    console.log('💾 Updated frontend config:', configPath);
    
    // Log the updated addresses
    console.log('\n📝 Updated addresses:');
    console.log('===================');
    console.log('ConsortiumNFT:', deployment.contracts.ConsortiumNFT);
    console.log('GroupManager:', deployment.contracts.GroupManager);
    console.log('Marketplace:', deployment.contracts.Marketplace);
    console.log('Network:', deployment.network);
    
    console.log('\n🎉 Frontend configuration updated successfully!');
}

// Handle errors
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Frontend config update failed:', error);
        process.exit(1);
    });

module.exports = { main };