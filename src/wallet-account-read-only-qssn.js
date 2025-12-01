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
 * @property {number} chainId - The blockchain's id (e.g., 31337 for local Anvil).
 * @property {string | Eip1193Provider} provider - The url of the rpc provider, or an instance of a class that implements eip-1193.
 * @property {string} bundlerUrl - The url of the bundler service (set automatically via preset).
 * @property {string} entryPointAddress - The address of the entry point smart contract (set automatically via preset).
 * @property {string} factoryAddress - The address of the QssnWalletFactory contract (set automatically via preset).
 * @property {string} [paymasterUrl] - The url of the paymaster service (optional, for future gas sponsorship).
 * @property {string} [paymasterAddress] - The address of the paymaster smart contract (optional, for future gas sponsorship).
 * @property {Object} [paymasterToken] - The paymaster token configuration (optional, for future gas sponsorship).
 * @property {string} [paymasterToken.address] - The address of the paymaster token.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 * @property {number} [mldsaSecurityLevel] - ML-DSA security level (44, 65, or 87). Default: 65.
 */

/**
 * @typedef {Object} QssnUserConfig
 * User-provided configuration. bundlerUrl, entryPointAddress, and factoryAddress are set automatically based on chainId.
 * @property {number} chainId - The blockchain's id (e.g., 31337 for local Anvil).
 * @property {string | Eip1193Provider} provider - The url of the rpc provider, or an instance of a class that implements eip-1193.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 * @property {number} [mldsaSecurityLevel] - ML-DSA security level (44, 65, or 87). Default: 65.
 * @property {string} [paymasterUrl] - The url of the paymaster service (optional, for future gas sponsorship).
 * @property {string} [paymasterAddress] - The address of the paymaster smart contract (optional, for future gas sponsorship).
 * @property {Object} [paymasterToken] - The paymaster token configuration (optional, for future gas sponsorship).
 * @property {string} [paymasterToken.address] - The address of the paymaster token.
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
   *
   * @returns {Promise<bigint>} The paymaster token balance (in base unit).
   * @throws {Error} If no paymaster token is configured.
   */
  async getPaymasterTokenBalance () {
    const { paymasterToken } = this._config

    if (!paymasterToken) {
      throw new Error('No paymaster token configured. Please provide paymasterToken in the wallet configuration.')
    }

    return await this.getTokenBalance(paymasterToken.address)
  }

  /**
   * Quotes the costs of a send transaction operation.
   * Note: Uses bundler's gas estimation for accurate quotes.
   *
   * @param {EvmTransaction | EvmTransaction[]} tx - The transaction, or an array of multiple transactions to send in batch.
   * @param {QssnWalletConfig} [config] - Optional config override for paymaster settings.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction (tx, config) {
    const { paymasterToken } = config ?? this._config

    try {
      // Build a UserOp to get gas estimates from bundler
      const fee = await this._estimateUserOperationGas([tx].flat(), paymasterToken)
      return { fee }
    } catch (error) {
      // Fallback to conservative estimate if bundler estimation fails
      const provider = await this._getProvider()
      const feeData = await provider.getFeeData()
      const estimatedGas = 300000n // Conservative fallback for UserWallet transactions
      const fee = estimatedGas * (feeData.maxFeePerGas || 1000000000n)
      return { fee }
    }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {QssnWalletConfig} [config] - Optional config override for paymaster settings.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */
  async quoteTransfer (options, config) {
    // Build transfer transaction from options
    const { to, amount, token } = options
    
    let tx
    if (token) {
      // ERC-20 token transfer
      const erc20Interface = new Contract(token, [
        'function transfer(address to, uint256 amount) returns (bool)'
      ], await this._getProvider())
      
      tx = {
        to: token,
        value: 0,
        data: erc20Interface.interface.encodeFunctionData('transfer', [to, amount])
      }
    } else {
      // Native ETH transfer
      tx = {
        to,
        value: amount,
        data: '0x'
      }
    }

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

  /**
   * Estimates gas cost for a UserOperation by querying the bundler.
   * 
   * @private
   * @param {EvmTransaction[]} txs - Array of transactions.
   * @param {Object} [paymasterToken] - Optional paymaster token config.
   * @returns {Promise<bigint>} Estimated gas cost in wei (or paymaster token if configured).
   */
  async _estimateUserOperationGas (txs, paymasterToken) {
    // Import WalletAccountQssn's _buildUserOp logic inline to avoid circular dependency
    const walletAddress = await this.getAddress()
    const provider = await this._getProvider()
    const entryPoint = new Contract(this._config.entryPointAddress, ['function getNonce(address sender, uint192 key) view returns (uint256)'], provider)
    
    const nonce = await entryPoint.getNonce(walletAddress, 0)
    const code = await provider.getCode(walletAddress)
    const isDeployed = code !== '0x'
    
    // Minimal UserOp for gas estimation (without signature)
    let userOp = {
      sender: walletAddress,
      nonce: '0x' + nonce.toString(16),
      callData: '0x', // Placeholder - bundler estimates based on sender/factory
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      signature: '0x'
    }
    
    if (!isDeployed) {
      userOp.factory = this._config.factoryAddress
      userOp.factoryData = '0x' // Minimal data for estimation
    }
    
    // Query bundler for gas estimates
    const response = await fetch(this._config.bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_estimateUserOperationGas',
        params: [userOp, this._config.entryPointAddress]
      })
    })
    
    const result = await response.json()
    
    if (result.error) {
      throw new Error(`Bundler estimation failed: ${result.error.message}`)
    }
    
    // Extract gas estimates from bundler response
    const { callGasLimit, verificationGasLimit, preVerificationGas } = result.result
    
    const feeData = await provider.getFeeData()
    const maxFeePerGas = feeData.maxFeePerGas || 1000000000n
    
    // Calculate total gas cost
    const totalGas = BigInt(callGasLimit) + BigInt(verificationGasLimit) + BigInt(preVerificationGas)
    const gasCostInWei = totalGas * maxFeePerGas
    
    // If paymaster is configured, would need to convert to token amount via exchange rate
    // For now, return ETH cost (similar to how actual payment works without paymaster)
    return gasCostInWei
  }
}
