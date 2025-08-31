const { ethers } = require('ethers');

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('🔐 New Deployment Wallet Generated');
console.log('==================================');
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
console.log('');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('- This is a TEST wallet for deployment only');
console.log('- Never use this wallet for mainnet funds');
console.log('- Keep the private key secure');
console.log('- The private key will be added to .env (which is gitignored)');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Copy the private key to your .env file');
console.log('2. Get testnet FLR from: https://faucet.flare.network/');
console.log('3. Use this address to request testnet funds:', wallet.address);
console.log('4. Run: npm run deploy:testnet');
console.log('');

// Also save to a temporary file for easy copying
const fs = require('fs');
const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
    network: 'flare-testnet',
    purpose: 'deployment-only',
    created: new Date().toISOString()
};

fs.writeFileSync('wallet-info.json', JSON.stringify(walletInfo, null, 2));
console.log('💾 Wallet info saved to wallet-info.json');
console.log('   (Delete this file after copying the private key)');