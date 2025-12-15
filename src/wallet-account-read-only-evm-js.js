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

import { ethers, Contract } from 'ethers'

/**
 * Pure JavaScript read-only EVM wallet account
 * This replaces @tetherto/wdk-wallet-evm WalletAccountReadOnlyEvm.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export class WalletAccountReadOnlyEvmJs {
  /**
   * @param {string} address - The Ethereum address
   * @param {Object} config - Configuration with provider
   */
  constructor (address, config) {
    this._address = address
    this._config = config
    
    // Setup provider
    if (config.provider) {
      if (typeof config.provider === 'string') {
        this._provider = new ethers.JsonRpcProvider(config.provider)
      } else {
        this._provider = config.provider
      }
    } else {
      throw new Error('Provider is required for read-only account')
    }
  }

  /**
   * Get the native token balance (ETH/MATIC/etc)
   * @returns {Promise<bigint>}
   */
  async getBalance () {
    return await this._provider.getBalance(this._address)
  }

  /**
   * Get ERC-20 token balance
   * @param {string} tokenAddress - The token contract address
   * @returns {Promise<bigint>}
   */
  async getTokenBalance (tokenAddress) {
    const abi = ['function balanceOf(address) view returns (uint256)']
    const contract = new Contract(tokenAddress, abi, this._provider)
    return await contract.balanceOf(this._address)
  }

  /**
   * Get ERC-20 token allowance
   * @param {string} token - The token contract address
   * @param {string} spender - The spender address
   * @returns {Promise<bigint>}
   */
  async getAllowance (token, spender) {
    const abi = ['function allowance(address owner, address spender) view returns (uint256)']
    const contract = new Contract(token, abi, this._provider)
    return await contract.allowance(this._address, spender)
  }
}
