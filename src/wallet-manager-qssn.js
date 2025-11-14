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

import WalletManager from '@tetherto/wdk-wallet'

import WalletManagerEvm from '@tetherto/wdk-wallet-evm'

import { BrowserProvider, JsonRpcProvider } from 'ethers'

import { mnemonicToSeedSync } from '@scure/bip39'

import WalletAccountQssn from './wallet-account-qssn.js'

/** @typedef {import('ethers').Provider} Provider */

/** @typedef {import('@tetherto/wdk-wallet-evm').FeeRates} FeeRates */

/** @typedef {import('./wallet-account-qssn.js').QssnWalletConfig} QssnWalletConfig */

export default class WalletManagerQssn extends WalletManagerEvm {
  /**
   * Creates a new quantum-safe wallet manager with dual-key (ECDSA + ML-DSA) support for ERC-4337.
   *
   * @param {string | Uint8Array} ecdsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase or seed bytes for ECDSA keys.
   * @param {string | Uint8Array} mldsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase or seed bytes for ML-DSA keys.
   * @param {QssnWalletConfig} config - The configuration object.
   */
  constructor (ecdsaSeed, mldsaSeed, config) {
    super(ecdsaSeed, config)
    
    // Convert mnemonic to seed if necessary
    if (typeof mldsaSeed === 'string') {
      this._mldsaSeed = mnemonicToSeedSync(mldsaSeed)
    } else {
      this._mldsaSeed = mldsaSeed
    }

    /**
     * The quantum-safe wallet configuration.
     *
     * @protected
     * @type {QssnWalletConfig}
     */
    this._config = config

    const { provider } = config

    if (provider) {
      /**
       * An ethers provider to interact with a node of the blockchain.
       *
       * @protected
       * @type {Provider | undefined}
       */
      this._provider = typeof provider === 'string'
        ? new JsonRpcProvider(provider)
        : new BrowserProvider(provider)
    }
  }

  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/60'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} [index] - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountQssn>} The account.
   */
  async getAccount (index = 0) {
    return await this.getAccountByPath(`0'/0/${index}`)
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/60'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   * @param {string} path - The derivation path (e.g. "0'/0/0").
   * @returns {Promise<WalletAccountQssn>} The account.
   */
  async getAccountByPath (path) {
    if (!this._accounts[path]) {
      const account = new WalletAccountQssn(this.seed, this._mldsaSeed, path, this._config)

      this._accounts[path] = account
    }

    return this._accounts[path]
  }

  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<FeeRates>} The fee rates (in weis).
   */
  async getFeeRates () {
    if (!this._provider) {
      throw new Error('The wallet must be connected to a provider to get fee rates.')
    }

    const { maxFeePerGas } = await this._provider.getFeeData()

    return {
      normal: maxFeePerGas * WalletManagerEvm._FEE_RATE_NORMAL_MULTIPLIER / 100n,
      fast: maxFeePerGas * WalletManagerEvm._FEE_RATE_FAST_MULTIPLIER / 100n
    }
  }
}
