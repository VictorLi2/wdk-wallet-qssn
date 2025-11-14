/**
 * Dual-Key ERC-4337 Integration Test
 * 
 * Demonstrates:
 * - Separate ECDSA and ML-DSA seeds
 * - ECDSA as Safe owner (on-chain)
 * - ML-DSA for off-chain validator verification
 * - Deterministic Safe address binding via saltNonce
 */

import WalletManagerQssn from '../src/wallet-manager-qssn.js'

console.log('🔐 Testing Dual-Key ERC-4337 Integration\n')

// Two separate seed phrases (in production, use proper BIP-39 mnemonics)
const ecdsaSeed = 'test test test test test test test test test test test junk'
const mldsaSeed = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const config = {
  chainId: 11155111, // Sepolia testnet
  provider: 'https://eth-sepolia.g.alchemy.com/v2/demo',
  bundlerUrl: 'https://bundler.example.com',
  paymasterUrl: 'https://paymaster.example.com',
  paymasterAddress: '0x0000000000000000000000000000000000000000',
  entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  safeModulesVersion: '1.4.1',
  paymasterToken: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
  },
  mldsaSecurityLevel: 65 // ML-DSA-65 (NIST Level 3)
}

try {
  // Create wallet manager with dual seeds
  const wallet = new WalletManagerQssn(ecdsaSeed, mldsaSeed, config)
  
  // Get account (index 0)
  const account = await wallet.getAccount(0)
  
  console.log('✅ Account created with dual-key signing')
  console.log(`   Derivation path: 0'/0/0\n`)
  
  // Display addresses
  const ecdsaAddress = account.getECDSAAddress()
  
  console.log('📍 ECDSA Owner Address:', ecdsaAddress)
  console.log('   (Safe owner - signs UserOperations for EntryPoint)\n')
  
  // Note: Safe address requires bundler connection, so we skip it in this demo
  console.log('🏦 Safe Contract Address: (requires bundler connection)')
  console.log('   Would be deterministically computed from:')
  console.log('   - ECDSA owner:', ecdsaAddress)
  console.log('   - Salt nonce: keccak256(mldsaPublicKey)\n')
  
  // Display ML-DSA binding
  const mldsaPublicKey = account.getMLDSAPublicKeyHex()
  const saltNonce = account.getSaltNonce()
  
  console.log('🔑 ML-DSA Public Key (truncated):', mldsaPublicKey.slice(0, 66) + '...')
  console.log('   (Used for off-chain validator verification)\n')
  
  console.log('🧂 Salt Nonce:', saltNonce)
  console.log('   (keccak256 of ML-DSA public key - binds ML-DSA to Safe address)\n')
  
  // Demonstrate dual signing
  console.log('💡 Safe Address Binding:')
  console.log('   The Safe address would be deterministically computed using:')
  console.log('   - ECDSA owner address:', ecdsaAddress)
  console.log('   - Salt nonce:', saltNonce.slice(0, 20) + '...')
  console.log('   Result: Same ECDSA + ML-DSA keys → same Safe address!\n')
  
  // Test dual signing
  const testMessage = 'Test dual-key signing for ERC-4337'
  console.log('✍️  Signing test message with both keys...')
  
  const signatures = await account.sign(testMessage)
  
  console.log('\n📝 ECDSA Signature:', signatures.ecdsa.slice(0, 20) + '...')
  console.log('   Length:', signatures.ecdsa.length, 'chars (~65 bytes)')
  console.log('   Purpose: Submit to EntryPoint for on-chain execution\n')
  
  console.log('📝 ML-DSA Signature:', signatures.mldsa.slice(0, 20) + '...')
  console.log('   Length:', signatures.mldsa.length, 'chars (~3309 bytes)')
  console.log('   Purpose: Submit to validators for off-chain verification\n')
  
  // Verify ML-DSA signature
  const isValid = await account.verifyMLDSA(testMessage, signatures.mldsa)
  console.log('✅ ML-DSA Signature verification:', isValid ? 'PASSED' : 'FAILED')
  
  // Display architecture
  console.log('\n🎯 Dual-Key Architecture:')
  console.log('   1. User signs UserOp with ML-DSA → Sent to validators')
  console.log('   2. Validators verify ML-DSA signature off-chain')
  console.log('   3. Validators verify Safe address binding:')
  console.log('      - Query Safe.owners[0] → get ECDSA address')
  console.log('      - Recompute saltNonce = keccak256(mldsaPublicKey)')
  console.log('      - Recompute Safe address with ECDSA + saltNonce')
  console.log('      - Verify computed address === UserOp.sender ✅')
  console.log('   4. Validators sign with one-time ECDSA → Submit to EntryPoint')
  console.log('   5. EntryPoint → Safe validates ECDSA signature')
  console.log('   6. Transaction executes on-chain\n')
  
  console.log('🔒 Security Properties:')
  console.log('   ✅ Separate seeds → CRQC breaking ECDSA ≠ breaking ML-DSA')
  console.log('   ✅ Deterministic binding → No validator database needed')
  console.log('   ✅ On-chain verifiable → Anyone can verify the binding')
  console.log('   ✅ Quantum-safe authorization → ML-DSA proves user intent')
  console.log('   ✅ Standard ERC-4337 → Works with existing infrastructure\n')
  
  // Clean up
  console.log('🧹 Disposing accounts (erasing keys from memory)')
  account.dispose()
  
  console.log('\n✨ Dual-key integration test complete!')
  
} catch (error) {
  console.error('❌ Error:', error.message)
  console.error(error.stack)
  process.exit(1)
}
