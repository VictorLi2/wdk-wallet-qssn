# ML-DSA ERC-4337 Integration

## Overview

Successfully integrated **ML-DSA (FIPS 204)** post-quantum signatures into the ERC-4337 wallet system, replacing ECDSA with quantum-safe cryptography.

## Key Design Decisions

### 1. **Trusted Validator Model with One-Time EOAs** ✅
- **On-chain verification**: DISABLED
- **Off-chain verification**: ENABLED by validator nodes
- ML-DSA signatures are verified off-chain by trusted validator nodes
- **One-time EOA submission**: Each transaction uses a **fresh, never-before-used EOA address**
  - Validator generates a new ECDSA keypair for each transaction
  - Public key is **never exposed on-chain** (unused addresses don't reveal pubkeys)
  - After transaction is submitted, the EOA is discarded and never reused
  - This makes validator submissions **quantum-safe** (no public keys to attack)
- Safe contract executes without checking ML-DSA signatures

### 2. **Deterministic Safe Address** ✅
- Salt nonce = `keccak256(mldsaPublicKey)`
- Same ML-DSA key → Same Safe address
- Enables counterfactual wallets (address exists before deployment)
- No custom contracts needed for address generation

### 3. **BIP-44 Path Structure** ✅
```
Standard Ethereum: m/44'/60'/account'/change/address (5 levels)
QSSN ML-DSA:       m/44'/9000'/securityLevel'/account'/change/address (6 levels)

Example: m/44'/9000'/65'/0'/0/0
         └──────┘ └────┘ └─┘ └┘ └┘ └┘
            |       |     |   |  |  address index
            |       |     |   |  change (always 0)
            |       |     |   account index
            |       |     security level (44/65/87)
            |       QSSN coin type (9000)
            BIP-44 purpose
```

## Architecture

### Component Hierarchy

```
WalletManagerEvmErc4337
  └── WalletAccountEvmErc4337
        ├── WalletAccountMldsa (owner)
        │     ├── MLDSAKeyDerivation
        │     └── MLDSASigner
        └── Safe4337Pack (ERC-4337 integration)
```

### File Structure

```
wdk-wallet-qssn/
├── src/
│   ├── wallet-account-evm-erc-4337.js       ← Modified for ML-DSA
│   ├── wallet-account-read-only-evm-erc-4337.js  ← Modified for custom salt
│   ├── wallet-account-mldsa.js              ← NEW: ML-DSA wallet account
│   └── crypto/
│       ├── mldsa-key-derivation.js          ← NEW: BIP-44 HD derivation
│       ├── mldsa-signer.js                  ← NEW: ML-DSA signing/verification
│       └── index.js                         ← NEW: Crypto exports
└── examples/
    └── test-ml-dsa-erc4337.js               ← NEW: Integration test
```

## Implementation Details

### 1. WalletAccountEvmErc4337 Changes

**Before (ECDSA):**
```javascript
constructor(seed, path, config) {
  const ownerAccount = new WalletAccountEvm(seed, path, config)
  super(ownerAccount._address, config)  // Sync address access
  this._ownerAccount = ownerAccount
}
```

**After (ML-DSA):**
```javascript
constructor(seed, path, config) {
  const ownerAccount = new WalletAccountMldsa(seed, path, config)
  super('0x0000000000000000000000000000000000000000', config)  // Placeholder
  this._ownerAccount = ownerAccount
  this._initialized = false
  this._saltNonce = null
}

async _initialize() {
  await this._ownerAccount.getAddress()
  const mldsaPublicKey = await this._ownerAccount.getPublicKey()
  this._saltNonce = keccak256(mldsaPublicKey)  // Deterministic salt
  this._ownerAccountAddress = await this._ownerAccount.getAddress()
  this._initialized = true
}
```

### 2. Ethers-Compatible Signer Wrapper

Created `_createMLDSASigner()` to wrap ML-DSA account for Safe4337Pack:

```javascript
_createMLDSASigner() {
  return {
    getAddress: async () => await ownerAccount.getAddress(),
    signMessage: async (message) => await ownerAccount.sign(message),
    signTransaction: async (tx) => { /* ML-DSA signing */ },
    signTypedData: async (domain, types, value) => { /* EIP-712 */ },
    provider: this._config.provider
  }
}
```

### 3. Salt-Based Safe Address Derivation

**Safe4337Pack Initialization:**
```javascript
await Safe4337Pack.init({
  provider: this._config.provider,
  signer: mldsaSigner,
  bundlerUrl: this._config.bundlerUrl,
  options: {
    owners: [mldsaOwnerAddress],
    threshold: 1,
    saltNonce: keccak256(mldsaPublicKey)  // ← Deterministic from pubkey!
  },
  // ...
})
```

**Result:**
- Same ML-DSA public key → Same salt nonce → Same Safe address
- Works with CREATE2 deterministic deployment
- No custom contracts required

## Cryptographic Details

### ML-DSA Security Levels

| Level | Algorithm | Public Key | Private Key | Signature | Security |
|-------|-----------|------------|-------------|-----------|----------|
| 44    | ML-DSA-44 | 1312 bytes | 2560 bytes  | 2420 bytes| NIST 2   |
| **65**| **ML-DSA-65** | **1952 bytes** | **4032 bytes** | **3309 bytes** | **NIST 3** |
| 87    | ML-DSA-87 | 2592 bytes | 4896 bytes  | 4627 bytes| NIST 5   |

**Default:** ML-DSA-65 (NIST Security Level 3)

### Key Derivation

```javascript
// BIP-39 mnemonic → BIP-32 HD seed
const seed = await mnemonicToSeed(mnemonic)

// BIP-32 HD derivation
const path = "m/44'/9000'/65'/0'/0/0"
const derived = seed.derivePath(path)

// Extract 32-byte ML-DSA seed
const mldsaSeed = derived.privateKey.slice(0, 32)

// Generate ML-DSA keypair
const { publicKey, privateKey } = ml_dsa65.keygen(mldsaSeed)
```

### Address Derivation

```javascript
// ML-DSA public key (1952 bytes for level 65)
const mldsaPublicKey = await signer.getPublicKey()

// Hash to 20-byte Ethereum address
const hash = sha3_256(mldsaPublicKey)
const address = '0x' + Buffer.from(hash.slice(0, 20)).toString('hex')
```

## Security Model

### Trust Assumptions

1. **Validator Nodes**: Trusted to verify ML-DSA signatures correctly
2. **Bundler/Validator EOA**: Trusted to submit transactions honestly
3. **EntryPoint Contract**: Standard ERC-4337 contract (no modifications)
4. **Safe Contract**: Standard Safe contract (no ML-DSA verification needed)

### Threat Model

✅ **Protected Against:**
- Quantum computer attacks on ECDSA
- Private key compromise via quantum algorithms
- Future quantum threats to wallet security

❌ **NOT Protected Against:**
- Compromised validator nodes
- Malicious bundler
- Traditional smart contract vulnerabilities

### Why This Works

```
Traditional ERC-4337 (ECDSA):
User signs UserOp → Bundler → EntryPoint → Safe.isValidSignature() → Execute
                                                   ↑
                                          ECDSA verification

QSSN ERC-4337 (ML-DSA with One-Time EOAs):
User signs UserOp → Validator verifies ML-DSA → Fresh EOA (never used before) → EntryPoint → Safe → Execute
        ↑                      ↑                            ↑                                    ↑
    ML-DSA 3309B         Off-chain verify          One-time address                    No signature check!
                                                  (pubkey never revealed)
```

**Key Security Features:**
- The Safe contract **trusts the EntryPoint**
- The EntryPoint trusts the validator's one-time EOA
- ML-DSA verification happens **before** submission (off-chain)
- Each transaction uses a **brand new EOA** that's immediately discarded
- ECDSA public keys are **never revealed on-chain** (address unused = no pubkey exposure)
- This makes the entire flow **quantum-safe end-to-end**

## Example Usage

```javascript
import WalletAccountEvmErc4337 from './src/wallet-account-evm-erc-4337.js'

const config = {
  chainId: 11155111,
  provider: 'https://sepolia.infura.io/v3/YOUR_KEY',
  bundlerUrl: 'https://bundler.qssn.network',
  paymasterUrl: 'https://paymaster.qssn.network',
  paymasterAddress: '0x...',
  entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  safeModulesVersion: '1.4.1',
  securityLevel: 65,  // ML-DSA-65
  paymasterToken: { address: '0x...' }
}

const account = new WalletAccountEvmErc4337(seed, "0'/0/0", config)

// Get addresses
const ownerAddress = await account._ownerAccount.getAddress()  // ML-DSA owner
const safeAddress = await account.getAddress()                 // Safe contract

// Sign with ML-DSA
const signature = await account.sign('Hello World')  // 3309 bytes

// Transfer tokens via ERC-4337
const { hash, fee } = await account.transfer({
  token: '0x...',
  recipient: '0x...',
  amount: 1000000n
})
```

## Testing

Run the integration test:
```bash
node examples/test-ml-dsa-erc4337.js
```

Expected output:
```
✅ Account created with ML-DSA signing
📍 ML-DSA Owner Address: 0x8689...
🔑 ML-DSA Public Key: 0x4687...
🧂 Salt Nonce: 0x6b47... (deterministic)
📝 ML-DSA Signature length: 3308 bytes
✅ Signature verification: PASSED
```

## Performance Considerations

### Signature Sizes
- **ECDSA**: 65 bytes
- **ML-DSA-65**: 3309 bytes (51× larger)

### Gas Costs
- **No on-chain impact**: Signatures verified off-chain
- **UserOperation calldata**: Larger (3309 bytes vs 65 bytes)
- **Bundler fees**: May be slightly higher due to calldata size

### Initialization
- **Async required**: ML-DSA key derivation is async
- **Lazy initialization**: Keys generated on first use
- **Cached**: Once initialized, keys remain in memory

## Migration Path

### From ECDSA to ML-DSA

1. **Install dependencies:**
   ```bash
   npm install @noble/post-quantum @noble/hashes @scure/bip32 @scure/bip39
   ```

2. **Update imports:**
   ```javascript
   // Before
   import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'
   
   // After
   import { WalletAccountMldsa } from './wallet-account-mldsa.js'
   ```

3. **Add security level to config:**
   ```javascript
   const config = {
     // ... existing config
     securityLevel: 65  // 44, 65, or 87
   }
   ```

4. **Handle async initialization:**
   ```javascript
   // Before
   const address = account._address
   
   // After
   const address = await account.getAddress()
   ```

## Future Enhancements

### Potential Improvements

1. **Hybrid Signatures**: Support both ECDSA and ML-DSA for backward compatibility
2. **Signature Aggregation**: Combine multiple ML-DSA signatures for batch operations
3. **On-chain Verification**: Optional ML-DSA verification module for Safe
4. **Compressed Signatures**: Research signature compression techniques
5. **Hardware Wallet Support**: Integrate with quantum-safe hardware wallets

### Security Hardening

1. **Validator Network**: Decentralized network of ML-DSA validators
2. **Proof of Verification**: Validators provide cryptographic proofs
3. **Slashing Conditions**: Penalize validators for incorrect verification
4. **Multi-signature**: Require multiple validator signatures

## References

- **FIPS 204**: [ML-DSA Standard](https://csrc.nist.gov/pubs/fips/204/final)
- **ERC-4337**: [Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- **BIP-44**: [HD Wallets](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- **Safe**: [Smart Account Contracts](https://github.com/safe-global/safe-contracts)
- **CREATE2**: [Deterministic Deployment](https://eips.ethereum.org/EIPS/eip-1014)

## License

Copyright 2024 Tether Operations Limited

Licensed under the Apache License, Version 2.0
