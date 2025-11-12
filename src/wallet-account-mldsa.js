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

import { MLDSAKeyDerivation } from './crypto/mldsa-key-derivation.js'
import { MLDSASigner } from './crypto/mldsa-signer.js'

/** @typedef {import('./crypto/mldsa-key-derivation.js').MLDSAKeyPair} MLDSAKeyPair */

/**
 * @typedef {Object} MLDSAKeyPair
 * @property {Uint8Array} privateKey - The ML-DSA private key
 * @property {Uint8Array} publicKey - The ML-DSA public key
 */

/**
 * ML-DSA wallet account that provides signing and verification using post-quantum ML-DSA signatures.
 * This replaces ECDSA signing with quantum-safe ML-DSA (FIPS 204) signatures.
 */
export class WalletAccountMldsa {
  /**
   * Creates a new ML-DSA wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's BIP-39 seed phrase or seed bytes
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0")
   * @param {Object} config - Configuration object
   * @param {number} [config.securityLevel=65] - ML-DSA security level (44, 65, or 87)
   * @param {string | import('ethers').Eip1193Provider} [config.provider] - Ethers provider
   */
  constructor (seed, path, config = {}) {
    this._seed = seed
    this._path = path
    this._config = config

    // Parse the path to extract account and address indices
    // Path format: "account'/change/address" (e.g., "0'/0/5")
    const pathParts = path.split('/')
    if (pathParts.length !== 3) {
      throw new Error(`Invalid path format: ${path}. Expected format: "account'/change/address"`)
    }

    this._accountIndex = parseInt(pathParts[0].replace("'", ''))
    this._addressIndex = parseInt(pathParts[2])

    // Get security level from config (default to ML-DSA-65)
    this._securityLevel = config.securityLevel || 65

    if (![44, 65, 87].includes(this._securityLevel)) {
      throw new Error(`Invalid security level: ${this._securityLevel}. Must be 44, 65, or 87.`)
    }

    // Store provider if provided
    this._provider = config.provider

    // Initialize ML-DSA keys synchronously
    const keyDerivation = new MLDSAKeyDerivation(this._seed)

    // Derive ML-DSA key pair
    this._keyPair = keyDerivation.deriveMLDSAKey(
      this._securityLevel,
      this._accountIndex,
      this._addressIndex
    )

    // Create ML-DSA signer
    this._signer = new MLDSASigner(this._keyPair)

    // Get Ethereum address derived from ML-DSA public key
    this._address = this._signer.getAddress()

    // Clean up key derivation
    keyDerivation.dispose()
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return this._addressIndex
  }

  /**
   * The derivation path of this account.
   * Full path: m/44'/9000'/[securityLevel]'/[account]'/0/[addressIndex]
   *
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The account's ML-DSA key pair.
   * ⚠️ Warning: Contains sensitive cryptographic material!
   *
   * @type {MLDSAKeyPair}
   */
  get keyPair () {
    return {
      privateKey: this._keyPair.privateKey,
      publicKey: this._keyPair.publicKey
    }
  }

  /**
   * Returns the Ethereum address derived from the ML-DSA public key.
   *
   * @returns {string} The Ethereum address (0x...)
   */
  getAddress () {
    return this._address
  }

  /**
   * Signs a message using ML-DSA post-quantum signature algorithm.
   *
   * @param {string} message - The message to sign
   * @returns {Promise<string>} The ML-DSA signature as hex string
   */
  async sign (message) {
    const result = await this._signer.sign(message)

    // Return signature in hex format
    return result.signature
  }

  /**
   * Verifies a message signature using ML-DSA.
   *
   * @param {string} message - The original message
   * @param {string} signature - The ML-DSA signature as hex string
   * @returns {Promise<boolean>} True if the signature is valid
   */
  async verify (message, signature) {
    return await this._signer.verify(message, signature)
  }

  /**
   * Returns the ML-DSA public key.
   *
   * @returns {Uint8Array} The ML-DSA public key
   */
  getPublicKey () {
    return this._signer.getPublicKey()
  }

  /**
   * Returns the ML-DSA public key as hex string.
   *
   * @returns {string} The ML-DSA public key (0x...)
   */
  getPublicKeyHex () {
    const pubKey = this._signer.getPublicKey()
    return '0x' + Buffer.from(pubKey).toString('hex')
  }

  /**
   * Disposes the wallet account, securely erasing sensitive key material from memory.
   */
  dispose () {
    if (this._signer) {
      this._signer.dispose()
      this._signer = null
    }

    if (this._keyPair) {
      // Securely wipe private key
      if (this._keyPair.privateKey) {
        this._keyPair.privateKey.fill(0)
      }
      if (this._keyPair.publicKey) {
        this._keyPair.publicKey.fill(0)
      }
      this._keyPair = null
    }

    // Clear other sensitive data
    this._address = null

    // Note: We don't clear this._seed as it might be managed by the parent WalletManager
  }

  /**
   * Get ML-DSA algorithm information for this account.
   *
   * @returns {Object} Algorithm information
   */
  getAlgorithmInfo () {
    const levels = {
      44: { algorithm: 'ML-DSA-44', securityLevel: 2, signatureSize: 2420 },
      65: { algorithm: 'ML-DSA-65', securityLevel: 3, signatureSize: 3309 },
      87: { algorithm: 'ML-DSA-87', securityLevel: 5, signatureSize: 4627 }
    }

    return {
      ...levels[this._securityLevel],
      derivationPath: `m/44'/9000'/${this._securityLevel}'/${this._accountIndex}'/0/${this._addressIndex}`
    }
  }
}

export default WalletAccountMldsa
