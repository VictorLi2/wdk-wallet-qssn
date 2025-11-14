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

import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js'

/**
 * ML-DSA signing and verification utility.
 * Handles quantum-safe signatures using ML-DSA (FIPS 204).
 */
export class MLDSASigner {
  /**
   * Signs a message with an ML-DSA private key.
   *
   * @param {string | Uint8Array} message - The message to sign.
   * @param {Uint8Array} privateKey - The ML-DSA private key.
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87).
   * @returns {string} The signature as a hex string (0x-prefixed).
   */
  static sign (message, privateKey, securityLevel = 65) {
    const mldsaImpl = this._getMLDSAImplementation(securityLevel)

    // Convert message to bytes
    const messageBytes = typeof message === 'string'
      ? Buffer.from(message, 'utf8')
      : message

    // Sign with ML-DSA (API: sign(message, secretKey))
    const signature = mldsaImpl.sign(messageBytes, privateKey)

    // Return as hex string
    return '0x' + Buffer.from(signature).toString('hex')
  }

  /**
   * Verifies an ML-DSA signature.
   *
   * @param {string | Uint8Array} message - The original message.
   * @param {string | Uint8Array} signature - The signature (hex string or bytes).
   * @param {Uint8Array} publicKey - The ML-DSA public key.
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87).
   * @returns {boolean} True if the signature is valid, false otherwise.
   */
  static verify (message, signature, publicKey, securityLevel = 65) {
    const mldsaImpl = this._getMLDSAImplementation(securityLevel)

    // Convert message to bytes
    const messageBytes = typeof message === 'string'
      ? Buffer.from(message, 'utf8')
      : message

    // Convert signature to bytes (handle hex string)
    const signatureBytes = typeof signature === 'string'
      ? Buffer.from(signature.slice(2), 'hex')
      : signature

    // Verify with ML-DSA (API: verify(signature, message, publicKey))
    return mldsaImpl.verify(signatureBytes, messageBytes, publicKey)
  }

  /**
   * Gets the expected signature size for a given security level.
   *
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
   * @returns {number} The signature size in bytes.
   */
  static getSignatureSize (securityLevel) {
    switch (securityLevel) {
      case 44:
        return 2420 // ML-DSA-44 signature size
      case 65:
        return 3309 // ML-DSA-65 signature size
      case 87:
        return 4627 // ML-DSA-87 signature size
      default:
        throw new Error(`Unsupported ML-DSA security level: ${securityLevel}`)
    }
  }

  /**
   * Gets the expected public key size for a given security level.
   *
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
   * @returns {number} The public key size in bytes.
   */
  static getPublicKeySize (securityLevel) {
    switch (securityLevel) {
      case 44:
        return 1312 // ML-DSA-44 public key size
      case 65:
        return 1952 // ML-DSA-65 public key size
      case 87:
        return 2592 // ML-DSA-87 public key size
      default:
        throw new Error(`Unsupported ML-DSA security level: ${securityLevel}`)
    }
  }

  /**
   * Gets the ML-DSA implementation for the specified security level.
   *
   * @private
   * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
   * @returns {Object} The ML-DSA implementation.
   */
  static _getMLDSAImplementation (securityLevel) {
    switch (securityLevel) {
      case 44:
        return ml_dsa44
      case 65:
        return ml_dsa65
      case 87:
        return ml_dsa87
      default:
        throw new Error(`Unsupported ML-DSA security level: ${securityLevel}. Use 44, 65, or 87.`)
    }
  }
}
