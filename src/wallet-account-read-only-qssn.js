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

import { WalletAccountReadOnly } from '@tetherto/wdk-wallet'

import { WalletAccountReadOnlyEvm } from '@tetherto/wdk-wallet-evm'

import { Contract, JsonRpcProvider, BrowserProvider } from 'ethers'

/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferResult} TransferResult */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransactionReceipt} EvmTransactionReceipt */

/**
 * @typedef {Object} QssnWalletConfig
 * @property {number} chainId - The blockchain's id (e.g., 1 for ethereum).
 * @property {string | Eip1193Provider} provider - The url of the rpc provider, or an instance of a class that implements eip-1193.
 * @property {string} bundlerUrl - The url of the bundler service.
 * @property {string} entryPointAddress - The address of the entry point smart contract.
 * @property {string} factoryAddress - The address of the QssnWalletFactory contract.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 * @property {number} [mldsaSecurityLevel] - ML-DSA security level (44, 65, or 87). Default: 65.
 */

// ABIs for contract interactions
const FACTORY_ABI = [
  'function getWalletAddress(bytes calldata mldsaPublicKey, address ecdsaOwner) view returns (address)',
  'function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)'
]

const WALLET_ABI = [
  'function execute(address target, uint256 value, bytes calldata data) external'
]

const ENTRYPOINT_ABI = [
  'function getNonce(address sender, uint192 key) view returns (uint256)'
]

export default class WalletAccountReadOnlyQssn extends WalletAccountReadOnly {
  /**
   * Creates a new read-only quantum-safe wallet account with ERC-4337 account abstraction.
   *
   * @param {string} ecdsaOwner - The ECDSA owner address.
   * @param {Uint8Array} mldsaPublicKey - The ML-DSA public key.
   * @param {Omit<QssnWalletConfig, 'transferMaxFee'>} config - The configuration object.
   */
  constructor (ecdsaOwner, mldsaPublicKey, config) {
    super(undefined)

    /**
     * The read-only quantum-safe wallet account configuration.
     *
     * @protected
     * @type {Omit<QssnWalletConfig, 'transferMaxFee'>}
     */
    this._config = config

    /**
     * The provider instance.
     *
     * @protected
     * @type {JsonRpcProvider | BrowserProvider | undefined}
     */
    this._provider = undefined

    /**
     * The chain id.
     *
     * @protected
     * @type {bigint | undefined}
     */
    this._chainId = undefined

    /**
     * The cached wallet address.
     *
     * @protected
     * @type {string | undefined}
     */
    this._walletAddress = undefined

    /** @private */
    this._ecdsaOwner = ecdsaOwner

    /** @private */
    this._mldsaPublicKey = mldsaPublicKey

    if (!config.factoryAddress) {
      throw new Error('factoryAddress is required in config')
    }
  }

  /**
   * Returns the account's address (computed from factory).
   *
   * @returns {Promise<string>} The account's address.
   */
  async getAddress () {
    if (this._walletAddress) {
      return this._walletAddress
    }

    const provider = await this._getProvider()
    const factory = new Contract(this._config.factoryAddress, FACTORY_ABI, provider)
    
    const mldsaPublicKeyHex = '0x' + Buffer.from(this._mldsaPublicKey).toString('hex')
    this._walletAddress = await factory.getWalletAddress(mldsaPublicKeyHex, this._ecdsaOwner)

    return this._walletAddress
  }

  /**
   * Returns the account's eth balance.
   *
   * @returns {Promise<bigint>} The eth balance (in weis).
   */
  async getBalance () {
    const evmReadOnlyAccount = await this._getEvmReadOnlyAccount()

    return await evmReadOnlyAccount.getBalance()
  }

  /**
   * Returns the account balance for a specific token.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<bigint>} The token balance (in base unit).
   */
  async getTokenBalance (tokenAddress) {
    const evmReadOnlyAccount = await this._getEvmReadOnlyAccount()

    return await evmReadOnlyAccount.getTokenBalance(tokenAddress)
  }

  /**
   * Returns the account's balance for the paymaster token provided in the wallet account configuration.
   * Note: QSSN wallets don't use paymasters - wallets pay their own gas.
   *
   * @returns {Promise<bigint>} The paymaster token balance (in base unit).
   */
  async getPaymasterTokenBalance () {
    throw new Error('QSSN wallets do not use paymasters. Wallets pay their own gas fees.')
  }

  /**
   * Quotes the costs of a send transaction operation.
   * Note: Gas estimation is simplified for UserWallet - actual costs determined by bundler.
   *
   * @param {EvmTransaction | EvmTransaction[]} tx - The transaction, or an array of multiple transactions to send in batch.
   * @param {Object} [config] - Optional config (unused for QSSN wallets).
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction (tx, config) {
    // Simplified gas estimation - bundler will determine actual costs
    const provider = await this._getProvider()
    const feeData = await provider.getFeeData()
    
    const estimatedGas = 200000n // Conservative estimate for UserWallet transactions
    const fee = estimatedGas * (feeData.maxFeePerGas || 1000000000n)

    return { fee }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {Object} [config] - Optional config (unused for QSSN wallets).
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */
  async quoteTransfer (options, config) {
    const tx = await WalletAccountReadOnlyEvm._getTransferTransaction(options)

    const result = await this.quoteSendTransaction(tx, config)

    return result
  }

  /**
   * Returns a transaction's receipt.
   *
   * @param {string} hash - The user operation hash.
   * @returns {Promise<EvmTransactionReceipt | null>} – The receipt, or null if the transaction has not been included in a block yet.
   */
  async getTransactionReceipt (hash) {
    // Query bundler for UserOp receipt
    try {
      const response = await fetch(this._config.bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [hash]
        })
      })

      const result = await response.json()
      
      if (result.result && result.result.receipt) {
        return result.result.receipt
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Returns the current allowance for the given token and spender.
   * @param {string} token - The token’s address.
   * @param {string} spender - The spender’s address.
   * @returns {Promise<bigint>} - The allowance.
   */
  async getAllowance (token, spender) {
    const readOnlyAccount = await this._getEvmReadOnlyAccount()

    return await readOnlyAccount.getAllowance(token, spender)
  }

  /**
   * Returns the provider instance.
   *
   * @protected
   * @returns {Promise<JsonRpcProvider | BrowserProvider>} The provider.
   */
  async _getProvider () {
    if (!this._provider) {
      const { provider } = this._config
      
      this._provider = typeof provider === 'string'
        ? new JsonRpcProvider(provider)
        : new BrowserProvider(provider)
    }

    return this._provider
  }

  /**
   * Returns the chain id.
   *
   * @protected
   * @returns {Promise<bigint>} - The chain id.
   */
  async _getChainId () {
    if (!this._chainId) {
      const provider = await this._getProvider()
      const { chainId } = await provider.getNetwork()
      this._chainId = chainId
    }

    return this._chainId
  }

  /** @private */
  async _getEvmReadOnlyAccount () {
    const address = await this.getAddress()

    const evmReadOnlyAccount = new WalletAccountReadOnlyEvm(address, this._config)

    return evmReadOnlyAccount
  }
}
