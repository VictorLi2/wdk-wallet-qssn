// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import { HDKey } from '@scure/bip32'
import { mnemonicToSeedSync } from '@scure/bip39'
// eslint-disable-next-line camelcase
import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'

/**
 * ML-DSA Security Levels and their configurations
 */
export const MLDSA_LEVELS = {
  44: {
    algorithm: 'ML-DSA-44',
    securityLevel: 2, // NIST Security Level 2 (128-bit)
    publicKeySize: 1312,
    privateKeySize: 2560,
    signatureSize: 2420
  },
  65: {
    algorithm: 'ML-DSA-65',
    securityLevel: 3, // NIST Security Level 3 (192-bit)
    publicKeySize: 1952,
    privateKeySize: 4032,
    signatureSize: 3309
  },
  87: {
    algorithm: 'ML-DSA-87',
    securityLevel: 5, // NIST Security Level 5 (256-bit)
    publicKeySize: 2592,
    privateKeySize: 4896,
    signatureSize: 4627
  }
}

/**
 * Constants for HD derivation paths
 */
const PATH_CONFIG = {
  PURPOSE: 44, // BIP-44
  COIN_TYPE: 9000, // Custom for ML-DSA (experimental range)
  PREFIX: "m/44'/9000'"
}

/**
 * MLDSAKeyDerivation class for managing ML-DSA key derivation at different security levels
 */
export class MLDSAKeyDerivation {
  /**
   * Creates a new ML-DSA key derivation instance.
   *
   * @param {string | Uint8Array} seed - BIP-39 mnemonic or seed bytes
   */
  constructor (seed) {
    // Convert mnemonic to seed synchronously
    let masterSeed

    if (typeof seed === 'string') {
      // Assume it's a BIP-39 mnemonic
      masterSeed = mnemonicToSeedSync(seed)
    } else if (seed instanceof Uint8Array) {
      masterSeed = seed
    } else {
      throw new Error('Seed must be a BIP-39 mnemonic string or Uint8Array')
    }

    // Create master key from seed
    this._masterKey = HDKey.fromMasterSeed(masterSeed)
    this._masterSeed = masterSeed
  }

  /**
   * Build HD derivation path for ML-DSA
   * @private
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87)
   * @param {number} accountIndex - Account index (default: 0)
   * @param {number} addressIndex - Address index (default: 0)
   * @returns {string} BIP-44 derivation path
   */
  _buildPath (securityLevel, accountIndex = 0, addressIndex = 0) {
    if (!MLDSA_LEVELS[securityLevel]) {
      throw new Error(`Invalid ML-DSA security level: ${securityLevel}`)
    }

    // BIP-44 path with security level as purpose modifier: m/44'/9000'/level'/account'/0/address
    return `${PATH_CONFIG.PREFIX}/${securityLevel}'/${accountIndex}'/0/${addressIndex}`
  }

  /**
   * Generate ML-DSA key pair from seed using specified security level
   * @private
   * @param {Uint8Array} seed - 32-byte seed
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level
   * @returns {{privateKey: Uint8Array, publicKey: Uint8Array, seed: Uint8Array, algorithm: string, securityLevel: number}}
   */
  _generateMLDSAFromSeed (seed, securityLevel) {
    const config = MLDSA_LEVELS[securityLevel]

    try {
      let mldsaImpl

      // Select the appropriate ML-DSA implementation
      switch (securityLevel) {
        case 44:
          // eslint-disable-next-line camelcase
          mldsaImpl = ml_dsa44
          break
        case 65:
          // eslint-disable-next-line camelcase
          mldsaImpl = ml_dsa65
          break
        case 87:
          // eslint-disable-next-line camelcase
          mldsaImpl = ml_dsa87
          break
        default:
          throw new Error(`Unsupported ML-DSA security level: ${securityLevel}`)
      }

      // Ensure seed is exactly 32 bytes
      const mldsaSeed = seed.length === 32 ? seed : seed.slice(0, 32)

      // Generate ML-DSA key pair
      const keyPair = mldsaImpl.keygen(mldsaSeed)

      return {
        privateKey: keyPair.secretKey,
        publicKey: keyPair.publicKey,
        seed: mldsaSeed,
        algorithm: config.algorithm,
        securityLevel: config.securityLevel
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to generate ${config.algorithm} key pair: ${errorMessage}`)
    }
  }

  /**
   * Derive ML-DSA key pair at specified security level
   *
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87)
   * @param {number} accountIndex - Account index (default: 0)
   * @param {number} addressIndex - Address index (default: 0)
   * @returns {{privateKey: Uint8Array, publicKey: Uint8Array, seed: Uint8Array, algorithm: string, securityLevel: number, path: string, accountIndex: number, addressIndex: number}}
   */
  deriveMLDSAKey (securityLevel, accountIndex = 0, addressIndex = 0) {
    if (!MLDSA_LEVELS[securityLevel]) {
      throw new Error(`Invalid ML-DSA security level: ${securityLevel}`)
    }

    if (!this._masterKey) {
      throw new Error('Master key not initialized')
    }

    const path = this._buildPath(securityLevel, accountIndex, addressIndex)
    const derived = this._masterKey.derive(path)

    if (!derived.privateKey) {
      throw new Error('Failed to derive ML-DSA seed')
    }

    // Use the first 32 bytes of the derived private key as seed for ML-DSA
    const mldsaSeed = derived.privateKey.slice(0, 32)

    // Generate ML-DSA key pair from seed
    const mldsaKeyPair = this._generateMLDSAFromSeed(mldsaSeed, securityLevel)

    return {
      ...mldsaKeyPair,
      path,
      accountIndex,
      addressIndex
    }
  }

  /**
   * Derive ML-DSA-44 key pair (Security Level 2)
   *
   * @param {number} accountIndex - Account index (default: 0)
   * @param {number} addressIndex - Address index (default: 0)
   * @returns {{privateKey: Uint8Array, publicKey: Uint8Array, seed: Uint8Array, algorithm: string, securityLevel: number, path: string, accountIndex: number, addressIndex: number}}
   */
  deriveMLDSA44 (accountIndex = 0, addressIndex = 0) {
    return this.deriveMLDSAKey(44, accountIndex, addressIndex)
  }

  /**
   * Derive ML-DSA-65 key pair (Security Level 3, recommended)
   *
   * @param {number} accountIndex - Account index (default: 0)
   * @param {number} addressIndex - Address index (default: 0)
   * @returns {{privateKey: Uint8Array, publicKey: Uint8Array, seed: Uint8Array, algorithm: string, securityLevel: number, path: string, accountIndex: number, addressIndex: number}}
   */
  deriveMLDSA65 (accountIndex = 0, addressIndex = 0) {
    return this.deriveMLDSAKey(65, accountIndex, addressIndex)
  }

  /**
   * Derive ML-DSA-87 key pair (Security Level 5)
   *
   * @param {number} accountIndex - Account index (default: 0)
   * @param {number} addressIndex - Address index (default: 0)
   * @returns {{privateKey: Uint8Array, publicKey: Uint8Array, seed: Uint8Array, algorithm: string, securityLevel: number, path: string, accountIndex: number, addressIndex: number}}
   */
  deriveMLDSA87 (accountIndex = 0, addressIndex = 0) {
    return this.deriveMLDSAKey(87, accountIndex, addressIndex)
  }

  /**
   * Get derivation path for a specific security level
   *
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level
   * @param {number} accountIndex - Account index (default: 0)
   * @param {number} addressIndex - Address index (default: 0)
   * @returns {string} BIP-44 derivation path
   */
  getDerivationPath (securityLevel, accountIndex = 0, addressIndex = 0) {
    return this._buildPath(securityLevel, accountIndex, addressIndex)
  }

  /**
   * Securely dispose of sensitive key material
   */
  dispose () {
    // Clear master key
    if (this._masterKey) {
      this._masterKey = null
    }

    // Clear master seed
    if (this._masterSeed && this._masterSeed instanceof Uint8Array) {
      this._masterSeed.fill(0)
      this._masterSeed = null
    }

    // Clear seed
    if (this._seed && this._seed instanceof Uint8Array) {
      this._seed.fill(0)
    }
    this._seed = ''

    this._initialized = false
  }
}

export default MLDSAKeyDerivation
