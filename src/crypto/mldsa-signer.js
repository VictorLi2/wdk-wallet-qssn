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

// eslint-disable-next-line camelcase
import { sha3_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils'

/**
 * ML-DSA Signer class for post-quantum signatures
 */
export class MLDSASigner {
  /**
   * Creates a new ML-DSA signer instance.
   *
   * @param {{privateKey: Uint8Array, publicKey: Uint8Array, algorithm: string, securityLevel: number}} keyPair - ML-DSA key pair
   */
  constructor (keyPair) {
    if (!keyPair || !keyPair.privateKey || !keyPair.publicKey) {
      throw new Error('Invalid key pair provided to MLDSASigner')
    }

    this._privateKey = keyPair.privateKey
    this._publicKey = keyPair.publicKey
    this._algorithm = keyPair.algorithm || 'ML-DSA-65'
    this._securityLevel = keyPair.securityLevel || 3
  }

  /**
   * Sign data with ML-DSA
   *
   * @param {Uint8Array | string} data - Data to sign
   * @param {{context?: Uint8Array}} options - Signing options
   * @returns {Promise<{signature: string, signatureBytes: Uint8Array, algorithm: string, publicKey: Uint8Array, messageHash: string}>}
   */
  async sign (data, options = {}) {
    const { context = new Uint8Array() } = options

    // Convert data to bytes
    const message = this._dataToBytes(data)

    if (!this._privateKey) {
      throw new Error('Private key is not available')
    }

    try {
      // Import the correct algorithm variant from @noble/post-quantum
      let mlDsaModule

      if (this._algorithm === 'ML-DSA-44') {
        // eslint-disable-next-line camelcase
        const { ml_dsa44 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa44
      } else if (this._algorithm === 'ML-DSA-65') {
        // eslint-disable-next-line camelcase
        const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa65
      } else if (this._algorithm === 'ML-DSA-87') {
        // eslint-disable-next-line camelcase
        const { ml_dsa87 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa87
      } else {
        // Default to ML-DSA-65
        // eslint-disable-next-line camelcase
        const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa65
      }

      // Sign the message with optional context
      const opts = context && context.length > 0 ? { context } : {}
      const signatureBytes = mlDsaModule.sign(message, this._privateKey, opts)

      return {
        signature: bytesToHex(signatureBytes),
        signatureBytes,
        algorithm: this._algorithm,
        publicKey: this._publicKey,
        messageHash: bytesToHex(sha3_256(message))
      }
    } catch (error) {
      throw new Error(`ML-DSA signing failed: ${error.message}`)
    }
  }

  /**
   * Verify ML-DSA signature
   *
   * @param {Uint8Array | string} data - Data that was signed
   * @param {Uint8Array | string} signature - Signature to verify
   * @param {Uint8Array} publicKey - Public key (optional, uses signer's public key if not provided)
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verify (data, signature, publicKey = null) {
    try {
      const message = this._dataToBytes(data)
      const pubKey = publicKey || this._publicKey

      if (!pubKey) {
        return false
      }

      // Extract signature bytes
      let sigBytes
      if (signature instanceof Uint8Array) {
        sigBytes = signature
      } else if (typeof signature === 'string') {
        sigBytes = hexToBytes(signature.startsWith('0x') ? signature.slice(2) : signature)
      } else {
        return false
      }

      // Import the correct algorithm variant
      let mlDsaModule

      if (this._algorithm === 'ML-DSA-44') {
        // eslint-disable-next-line camelcase
        const { ml_dsa44 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa44
      } else if (this._algorithm === 'ML-DSA-65') {
        // eslint-disable-next-line camelcase
        const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa65
      } else if (this._algorithm === 'ML-DSA-87') {
        // eslint-disable-next-line camelcase
        const { ml_dsa87 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa87
      } else {
        // Default to ML-DSA-65
        // eslint-disable-next-line camelcase
        const { ml_dsa65 } = await import('@noble/post-quantum/ml-dsa.js')
        // eslint-disable-next-line camelcase
        mlDsaModule = ml_dsa65
      }

      // Verify the signature
      return mlDsaModule.verify(sigBytes, message, pubKey, {})
    } catch (error) {
      return false
    }
  }

  /**
   * Get public key as Uint8Array
   *
   * @returns {Uint8Array} The ML-DSA public key bytes
   */
  getPublicKey () {
    if (!this._publicKey) {
      throw new Error('Public key is not available')
    }

    return this._publicKey
  }

  /**
   * Get public key information
   *
   * @returns {{bytes: Uint8Array, hex: string, algorithm: string, securityLevel: number}}
   */
  getPublicKeyInfo () {
    if (!this._publicKey) {
      throw new Error('Public key is not available')
    }

    return {
      bytes: this._publicKey,
      hex: bytesToHex(this._publicKey),
      algorithm: this._algorithm,
      securityLevel: this._securityLevel
    }
  }

  /**
   * Get ML-DSA address from public key hash
   *
   * @returns {string} Address in hex format (0x...)
   */
  getAddress () {
    if (!this._publicKey) {
      throw new Error('Public key is not available')
    }

    // Use SHA3-256 hash of public key, take first 20 bytes (similar to Ethereum)
    const pubKeyHash = sha3_256(this._publicKey)
    const addressBytes = pubKeyHash.slice(0, 20)

    return '0x' + bytesToHex(addressBytes)
  }

  /**
   * Convert data to bytes
   * @private
   * @param {Uint8Array | string} data - Data to convert
   * @returns {Uint8Array} Byte array
   */
  _dataToBytes (data) {
    if (data instanceof Uint8Array) {
      return data
    } else if (typeof data === 'string') {
      // Check if it's a hex string
      if (data.startsWith('0x')) {
        return hexToBytes(data.slice(2))
      }
      // Otherwise treat as UTF-8
      return utf8ToBytes(data)
    } else {
      throw new Error('Unsupported data type for signing')
    }
  }

  /**
   * Securely dispose of private key material
   */
  dispose () {
    // Clear private key
    if (this._privateKey && this._privateKey instanceof Uint8Array) {
      this._privateKey.fill(0)
      this._privateKey = null
    }

    // Clear public key reference
    this._publicKey = null
  }
}

export default MLDSASigner
