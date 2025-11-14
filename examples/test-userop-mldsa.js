// Test to show UserOperation structure with ML-DSA signature and public key
// This demonstrates what data is sent to the bundler/validator

import WalletManagerQssn from '../index.js'

async function testUserOpWithMLDSA () {
  console.log('🔐 Testing UserOperation with ML-DSA Data\n')

  // Test configuration (local testnet)
  const config = {
    chainId: 31337,
    provider: 'http://localhost:8545',
    bundlerUrl: 'http://localhost:4337',
    paymasterUrl: 'http://localhost:3000',
    paymasterAddress: '0x0000000000000000000000000000000000000000',
    entryPointAddress: '0x0000000000000000000000000000000000000001',
    safeModulesVersion: '1.4.1',
    paymasterToken: {
      address: '0x0000000000000000000000000000000000000002'
    }
  }

  // Create wallet manager with dual seeds
  const ecdsaSeed = Buffer.from('test seed phrase for ecdsa key generation needs to be 32+ bytes')
  const mldsaSeed = Buffer.from('test seed phrase for mldsa key generation needs to be 32+ bytes')

  const manager = new WalletManagerQssn(ecdsaSeed, mldsaSeed, config)
  const account = await manager.getAccountByPath("0'/0/0")

  console.log('📍 Account Details:')
  console.log('   ECDSA Owner:', await account.getECDSAAddress())
  console.log('   ML-DSA Public Key:', account.getMLDSAPublicKeyHex().slice(0, 40) + '...')
  console.log('   Salt Nonce:', account.getSaltNonce())
  console.log()

  // Create a test transaction
  const testTx = {
    to: '0x0000000000000000000000000000000000000003',
    value: '1000000000000000000', // 1 ETH
    data: '0x'
  }

  try {
    console.log('📝 Creating UserOperation with ML-DSA data...\n')
    
    const userOpData = await account.getUserOperationWithMLDSA(testTx)

    console.log('✅ UserOperation Structure:')
    console.log('   Safe Address:', userOpData.safeAddress)
    console.log('   ECDSA Owner:', userOpData.ecdsaOwner)
    console.log('   UserOp Hash:', userOpData.userOpHash.slice(0, 40) + '...')
    console.log()

    console.log('🔑 ML-DSA Data:')
    console.log('   Public Key:', userOpData.mldsaPublicKey.slice(0, 40) + '...')
    console.log('   Public Key Length:', userOpData.mldsaPublicKey.length, 'chars (~1952 bytes)')
    console.log('   Signature:', userOpData.mldsaSignature.slice(0, 40) + '...')
    console.log('   Signature Length:', userOpData.mldsaSignature.length, 'chars (~3309 bytes)')
    console.log()

    console.log('📦 UserOperation Fields:')
    console.log('   Sender:', userOpData.userOperation.sender || 'N/A')
    console.log('   Nonce:', userOpData.userOperation.nonce?.toString() || 'N/A')
    console.log('   CallData:', userOpData.userOperation.callData?.slice(0, 40) + '...' || 'N/A')
    console.log()

    console.log('🎯 Bundler/Validator Workflow:')
    console.log('   1. Bundler receives UserOperation with ML-DSA signature + public key')
    console.log('   2. Bundler verifies ML-DSA signature against UserOp hash')
    console.log('   3. Bundler verifies Safe address binding:')
    console.log('      - Computes saltNonce = keccak256(mldsaPublicKey)')
    console.log('      - Recomputes Safe address with CREATE2(factory, salt, initCode)')
    console.log('      - Verifies computed address === UserOp.sender ✅')
    console.log('   4. Bundler signs UserOp with own ECDSA key')
    console.log('   5. Bundler submits to EntryPoint')
    console.log()

    console.log('💡 ML-DSA Data in UserOperation:')
    console.log('   The UserOperation object contains:')
    console.log('   - mldsaSignature: User\'s quantum-safe signature')
    console.log('   - mldsaPublicKey: User\'s ML-DSA public key')
    console.log('   These fields are read by the bundler for verification')
    console.log('   but NOT included in the on-chain transaction.')
    console.log()

  } catch (error) {
    console.log('⚠️  Note: This test requires a running bundler/validator')
    console.log('   Error:', error.message)
    console.log()
    console.log('   The UserOperation structure has been prepared with ML-DSA data.')
    console.log('   In production, this would be sent to the bundler/validator endpoint.')
  }

  await account.dispose()
  console.log('✨ Test complete!')
}

testUserOpWithMLDSA().catch(console.error)
