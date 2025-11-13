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
import { sha3_256 } from '@noble/hashes/sha3'
// eslint-disable-next-line camelcase
import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'

/**
 * ML-DSA wallet account for post-quantum signatures
 */
export class WalletAccountMldsa {
  /**
   * Creates a new ML-DSA wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's BIP-39 seed phrase or seed bytes
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0")
   * @param {Object} config - Configuration object
   * @param {number} [config.securityLevel=65] - ML-DSA security level (44, 65, or 87)
   */
  constructor (seed, path, config = {}) {
    this._seed = seed
    this._path = path
    this._config = config

    // Parse the path to extract account and address indices
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

    // Convert mnemonic to seed if necessary
    let masterSeed
    if (typeof seed === 'string') {
      masterSeed = mnemonicToSeedSync(seed)
    } else if (seed instanceof Uint8Array) {
      masterSeed = seed
    } else {
      throw new Error('Seed must be a BIP-39 mnemonic string or Uint8Array')
    }

    // Derive ML-DSA key pair
    // Path: m/44'/9000'/securityLevel'/account'/0/address
    const fullPath = `m/44'/9000'/${this._securityLevel}'/${this._accountIndex}'/0/${this._addressIndex}`
    const hdKey = HDKey.fromMasterSeed(masterSeed)
    const derived = hdKey.derive(fullPath)

    if (!derived.privateKey) {
      throw new Error('Failed to derive ML-DSA seed')
    }

    // Use first 32 bytes as ML-DSA seed
    const mldsaSeed = derived.privateKey.slice(0, 32)

    // Generate ML-DSA key pair
    this._keyPair = this._generateMLDSAFromSeed(mldsaSeed, this._securityLevel)

    // Derive Ethereum-compatible address from public key
    this._address = this._deriveAddress(this._keyPair.publicKey)
  }

  /**
   * Generate ML-DSA key pair from seed
   * @private
   */
  _generateMLDSAFromSeed (seed, securityLevel) {
    let mldsaImpl

    switch (securityLevel) {
      case 44:
        mldsaImpl = ml_dsa44
        break
      case 65:
        mldsaImpl = ml_dsa65
        break
      case 87:
        mldsaImpl = ml_dsa87
        break
      default:
        throw new Error(`Unsupported ML-DSA security level: ${securityLevel}`)
    }

    // Ensure seed is exactly 32 bytes
    const mldsaSeed = seed.length === 32 ? seed : seed.slice(0, 32)
    
    // Generate ML-DSA key pair from 32-byte seed
    const keyPair = mldsaImpl.keygen(mldsaSeed)

    return {
      privateKey: keyPair.secretKey,  // Full ML-DSA private key
      publicKey: keyPair.publicKey     // ML-DSA public key
    }
  }

  /**
   * Derive Ethereum address from ML-DSA public key
   * @private
   */
  _deriveAddress (publicKey) {
    const hash = sha3_256(publicKey)
    const addressBytes = hash.slice(0, 20)
    return '0x' + Buffer.from(addressBytes).toString('hex')
  }

  /**
   * The derivation path's index of this account.
   * @type {number}
   */
  get index () {
    return this._addressIndex
  }

  /**
   * The derivation path of this account.
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * Returns the ML-DSA public key.
   * @returns {Uint8Array} The ML-DSA public key
   */
  getPublicKey () {
    return this._keyPair.publicKey
  }

  /**
   * Returns the ML-DSA public key as hex string.
   * @returns {string} The ML-DSA public key (0x...)
   */
  getPublicKeyHex () {
    const pubKey = this._keyPair.publicKey
    return '0x' + Buffer.from(pubKey).toString('hex')
  }

  /**
   * Returns the Ethereum address derived from ML-DSA public key.
   * @returns {string} The Ethereum address (0x...)
   */
  getAddress () {
    return this._address
  }

  /**
   * Signs a message using ML-DSA.
   * @param {string} message - The message to sign
   * @returns {Promise<string>} The ML-DSA signature as hex string
   */
  async sign (message) {
    let mldsaImpl

    switch (this._securityLevel) {
      case 44:
        mldsaImpl = ml_dsa44
        break
      case 65:
        mldsaImpl = ml_dsa65
        break
      case 87:
        mldsaImpl = ml_dsa87
        break
    }

    // Convert message to bytes
    const messageBytes = Buffer.from(message, 'utf8')

    // Sign with ML-DSA (API: sign(message, secretKey))
    const signature = mldsaImpl.sign(messageBytes, this._keyPair.privateKey)

    // Return as hex
    return '0x' + Buffer.from(signature).toString('hex')
  }

  /**
   * Verifies a message signature using ML-DSA.
   * @param {string} message - The original message
   * @param {string} signature - The ML-DSA signature as hex string
   * @returns {Promise<boolean>} True if the signature is valid
   */
  async verify (message, signature) {
    let mldsaImpl

    switch (this._securityLevel) {
      case 44:
        mldsaImpl = ml_dsa44
        break
      case 65:
        mldsaImpl = ml_dsa65
        break
      case 87:
        mldsaImpl = ml_dsa87
        break
    }

    // Convert message to bytes
    const messageBytes = Buffer.from(message, 'utf8')

    // Convert signature from hex
    const signatureBytes = Buffer.from(signature.slice(2), 'hex')

    // Verify with ML-DSA (API: verify(signature, message, publicKey))
    return mldsaImpl.verify(signatureBytes, messageBytes, this._keyPair.publicKey)
  }

  /**
   * Disposes the wallet account, securely erasing sensitive key material.
   */
  dispose () {
    if (this._keyPair) {
      if (this._keyPair.privateKey) {
        this._keyPair.privateKey.fill(0)
      }
      if (this._keyPair.publicKey) {
        this._keyPair.publicKey.fill(0)
      }
      this._keyPair = null
    }

    this._address = null
  }
}

export default WalletAccountMldsa
