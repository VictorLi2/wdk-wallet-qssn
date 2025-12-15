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

import { ethers } from 'ethers'

/**
 * Pure JavaScript EVM wallet account using only ethers.js
 * This replaces @tetherto/wdk-wallet-evm to avoid sodium-universal dependency.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export class WalletAccountEvmJs {
  /**
   * @param {string | Uint8Array} seed - BIP-39 seed phrase or seed bytes
   * @param {string} path - BIP-44 derivation path (e.g. "0'/0/0")
   * @param {Object} config - Configuration object with chainId and provider
   */
  constructor (seed, path, config) {
    // Parse the path to extract the index
    const pathParts = path.split('/')
    this._index = parseInt(pathParts[pathParts.length - 1].replace("'", ''), 10)
    this._path = path
    this._config = config

    // Create full BIP-44 path
    const fullPath = `m/44'/60'/${path}`
    
    // Derive wallet from seed
    this._wallet = typeof seed === 'string'
      ? ethers.Wallet.fromPhrase(seed).derivePath(fullPath)
      : ethers.HDNodeWallet.fromSeed(seed).derivePath(fullPath)
    
    this._address = this._wallet.address

    // Setup provider if available
    if (config.provider) {
      if (typeof config.provider === 'string') {
        this._provider = new ethers.JsonRpcProvider(config.provider)
      } else {
        this._provider = config.provider
      }
      this._wallet = this._wallet.connect(this._provider)
    } else {
      this._provider = null
    }
  }

  /**
   * The derivation path's index of this account.
   * @type {number}
   */
  get index () {
    return this._index
  }

  /**
   * The derivation path of this account.
   * @type {string}
   */
  get path () {
    return this._path
  }

  /**
   * The account's key pair (address and private key).
   * @type {{address: string, privateKey: string}}
   */
  get keyPair () {
    return {
      address: this._wallet.address,
      privateKey: this._wallet.privateKey
    }
  }

  /**
   * Get the account's address.
   * @returns {Promise<string>}
   */
  async getAddress () {
    return this._wallet.address
  }

  /**
   * Signs a message with ECDSA (Ethereum Signed Message format).
   * @param {string} message - The message to sign
   * @returns {Promise<string>} The signature
   */
  async sign (message) {
    return await this._wallet.signMessage(message)
  }

  /**
   * Verifies a signature against a message.
   * @param {string} message - The original message
   * @param {string} signature - The signature to verify
   * @returns {Promise<boolean>} True if valid
   */
  async verify (message, signature) {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature)
      return recoveredAddress.toLowerCase() === this._wallet.address.toLowerCase()
    } catch {
      return false
    }
  }

  /**
   * Clean up resources (no-op for browser, here for compatibility).
   */
  dispose () {
    // In the browser, we don't need to zero out memory
    // This is here for API compatibility with WalletAccountEvm
  }
}
