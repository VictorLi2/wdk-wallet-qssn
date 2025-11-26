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

import { mnemonicToSeedSync } from '@scure/bip39'
import { MLDSAKeyDerivation } from './utils/mldsa/mldsa-key-derivation.js'
import { MLDSASigner } from './utils/mldsa/mldsa-signer.js'

/**
 * ML-DSA wallet account for post-quantum signatures
 */
export class WalletAccountMldsa {
  /**
   * Creates a new ML-DSA wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's BIP-39 mnemonic phrase or seed bytes
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0")
   * @param {Object} config - Configuration object
   * @param {number} [config.securityLevel=65] - ML-DSA security level (44, 65, or 87)
   */
  constructor (seed, path, config = {}) {
    this._path = path
    this._config = config

    // Convert mnemonic to seed if necessary
    const seedBytes = typeof seed === 'string' ? mnemonicToSeedSync(seed) : seed

    // Get security level from config (default to ML-DSA-65)
    this._securityLevel = config.securityLevel || 65

    if (![44, 65, 87].includes(this._securityLevel)) {
      throw new Error(`Invalid security level: ${this._securityLevel}. Must be 44, 65, or 87.`)
    }

    // Generate full BIP32 path using the crypto module
    const fullPath = MLDSAKeyDerivation.getDerivationPath(path, this._securityLevel)

    // Derive ML-DSA key pair using the crypto module
    this._keyPair = MLDSAKeyDerivation.deriveKeyPair(seedBytes, fullPath, this._securityLevel)
  }

  /**
   * The derivation path of this account.
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The ML-DSA public key.
   * @type {Uint8Array}
   */
  get publicKey () {
    return this._keyPair.publicKey
  }

  /**
   * The ML-DSA public key as hex string.
   * @type {string}
   */
  get publicKeyHex () {
    const pubKey = this._keyPair.publicKey
    return '0x' + Buffer.from(pubKey).toString('hex')
  }

  /**
   * Signs a message using ML-DSA.
   * @param {string} message - The message to sign
   * @returns {Promise<string>} The ML-DSA signature as hex string
   */
  async sign (message) {
    return MLDSASigner.sign(message, this._keyPair.privateKey, this._securityLevel)
  }

  /**
   * Verifies a message signature using ML-DSA.
   * @param {string} message - The original message
   * @param {string} signature - The ML-DSA signature as hex string
   * @returns {Promise<boolean>} True if the signature is valid
   */
  async verify (message, signature) {
    return MLDSASigner.verify(message, signature, this._keyPair.publicKey, this._securityLevel)
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
  }
}

export default WalletAccountMldsa
