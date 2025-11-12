// Example: ML-DSA ERC-4337 Account Integration Test
// This demonstrates how the ML-DSA signatures work with ERC-4337 account abstraction

import WalletAccountEvmErc4337 from '../src/wallet-account-evm-erc-4337.js'

async function testMLDSAIntegration () {
  console.log('🔐 Testing ML-DSA ERC-4337 Integration\n')

  // Example configuration (these would be real values in production)
  const config = {
    chainId: 11155111, // Sepolia testnet
    provider: 'https://sepolia.infura.io/v3/YOUR_API_KEY',
    bundlerUrl: 'https://bundler.example.com',
    paymasterUrl: 'https://paymaster.example.com',
    paymasterAddress: '0x0000000000000000000000000000000000000000',
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    safeModulesVersion: '1.4.1',
    securityLevel: 65, // ML-DSA-65 (recommended)
    paymasterToken: {
      address: '0x0000000000000000000000000000000000000000'
    }
  }

  // Example seed (NEVER use this in production!)
  const testSeed = 'test test test test test test test test test test test junk'

  // Create account with ML-DSA signatures
  const account = new WalletAccountEvmErc4337(testSeed, "0'/0/0", config)

  console.log('✅ Account created with ML-DSA signing')
  console.log('   Derivation path:', account.path)

  // Get ML-DSA owner address
  const ownerAddress = account._ownerAccount.getAddress()
  console.log('\n📍 ML-DSA Owner Address:', ownerAddress)

  // Get ML-DSA public key
  const publicKey = account._ownerAccount.getPublicKeyHex()
  console.log('🔑 ML-DSA Public Key (truncated):', publicKey.substring(0, 66) + '...')

  // Get salt nonce (computed from ML-DSA public key hash)
  console.log('\n⏳ Computing deterministic salt from ML-DSA public key...')
  console.log('🧂 Salt Nonce:', account._saltNonce)
  console.log('   (This salt ensures the same ML-DSA key → same Safe address)')

  // Note: Getting the actual Safe address requires network calls to bundler/provider
  // In production, this would return the deterministic Safe smart contract address
  console.log('\n💡 Safe Address Derivation:')
  console.log('   The Safe address is deterministically computed using:')
  console.log('   - ML-DSA owner address:', ownerAddress)
  console.log('   - Salt nonce:', account._saltNonce)
  console.log('   - Factory contract and init code')
  console.log('   Result: Same ML-DSA key always generates the same Safe address!')

  // Sign a test message with ML-DSA
  console.log('\n✍️  Signing test message with ML-DSA...')
  const testMessage = 'Hello, quantum-safe ERC-4337!'
  const signature = await account.sign(testMessage)
  console.log('📝 ML-DSA Signature length:', signature.length / 2 - 1, 'bytes')
  console.log('   (ML-DSA-65 signatures are 3309 bytes vs ECDSA ~65 bytes)')

  // Verify signature
  const isValid = await account.verify(testMessage, signature)
  console.log('\n✅ Signature verification:', isValid ? 'PASSED' : 'FAILED')

  // Get algorithm info
  const algoInfo = account._ownerAccount.getAlgorithmInfo()
  console.log('\n🔬 ML-DSA Algorithm Details:')
  console.log('   Algorithm:', algoInfo.algorithm)
  console.log('   Security Level:', algoInfo.securityLevel)
  console.log('   Signature Size:', algoInfo.signatureSize, 'bytes')
  console.log('   Full Path:', algoInfo.derivationPath)

  console.log('\n🎯 Key Points:')
  console.log('   • Same ML-DSA key always generates same Safe address (deterministic)')
  console.log('   • ML-DSA signatures verified OFF-CHAIN by validator nodes')
  console.log('   • Validator nodes submit transactions using trusted EOA')
  console.log('   • Safe contract executes without checking ML-DSA signature')
  console.log('   • Quantum-safe security at the wallet level!')

  // Clean up
  account.dispose()
  console.log('\n🧹 Account disposed (keys erased from memory)')
}

// Run test
testMLDSAIntegration().catch(console.error)
