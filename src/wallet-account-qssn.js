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

import { Contract, keccak256, AbiCoder, ethers, JsonRpcProvider, BrowserProvider } from 'ethers'

import { WalletAccountEvm } from '@tetherto/wdk-wallet-evm'

import WalletAccountReadOnlyQssn from './wallet-account-read-only-qssn.js'
import { WalletAccountMldsa } from './wallet-account-mldsa.js'

/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').ApproveOptions} ApproveOptions */

/** @typedef {import('./wallet-account-read-only-qssn.js').QssnWalletConfig} QssnWalletConfig */

const FEE_TOLERANCE_COEFFICIENT = 120n

const USDT_MAINNET_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

/** @implements {IWalletAccount} */
export default class WalletAccountQssn extends WalletAccountReadOnlyQssn {
  /**
   * Creates a new quantum-safe wallet account with ERC-4337 account abstraction and ML-DSA signatures.
   *
   * @param {string | Uint8Array} ecdsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase for ECDSA keys.
   * @param {string | Uint8Array} mldsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase for ML-DSA keys.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {QssnWalletConfig} config - The configuration object.
   */
  constructor (ecdsaSeed, mldsaSeed, path, config) {
    // Create ECDSA account with standard Ethereum path
    const ownerAccount = new WalletAccountEvm(ecdsaSeed, path, config)

    // Create ML-DSA account with security level in path
    const securityLevel = config.mldsaSecurityLevel || 65
    const mldsaAccount = new WalletAccountMldsa(mldsaSeed, path, { ...config, securityLevel })

    // Initialize parent with ECDSA owner and ML-DSA public key
    super(ownerAccount._address, mldsaAccount.publicKey, config)

    /**
     * The quantum-safe wallet account configuration.
     *
     * @protected
     * @type {QssnWalletConfig}
     */
    this._config = config

    /** @private */
    this._ownerAccount = ownerAccount

    /** @private */
    this._mldsaAccount = mldsaAccount
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return this._ownerAccount.index
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this._ownerAccount.path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return this._ownerAccount.keyPair
  }

  /**
   * Signs a message with both ECDSA and ML-DSA.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<{ecdsa: string, mldsa: string}>} Both signatures.
   */
  async sign (message) {
    const [ecdsaSignature, mldsaSignature] = await Promise.all([
      this._ownerAccount.sign(message),
      this._mldsaAccount.sign(message)
    ])

    return {
      ecdsa: ecdsaSignature,
      mldsa: mldsaSignature
    }
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    return await this._ownerAccount.verify(message, signature)
  }

  /**
   * Approves a specific amount of tokens to a spender.
   *
   * @param {ApproveOptions} options - The approve options.
   * @returns {Promise<TransactionResult>} - The transaction’s result.
   * @throws {Error} - If trying to approve usdts on ethereum with allowance not equal to zero (due to the usdt allowance reset requirement).
   */
  async approve (options) {
    if (!this._ownerAccount._provider) {
      throw new Error('The wallet must be connected to a provider to approve funds.')
    }

    const { token, spender, amount } = options
    const chainId = await this._getChainId()

    if (chainId === 1n && token.toLowerCase() === USDT_MAINNET_ADDRESS.toLowerCase()) {
      const currentAllowance = await this.getAllowance(token, spender)
      if (currentAllowance > 0n && BigInt(amount) > 0n) {
        throw new Error(
          'USDT requires the current allowance to be reset to 0 before setting a new non-zero value. Please send an "approve" transaction with an amount of 0 first.'
        )
      }
    }

    const abi = ['function approve(address spender, uint256 amount) returns (bool)']
    const contract = new Contract(token, abi, this._ownerAccount._provider)

    const tx = {
      to: token,
      value: 0,
      data: contract.interface.encodeFunctionData('approve', [spender, amount])
    }

    return await this.sendTransaction(tx)
  }

  /**
   * Sends a transaction.
   *
   * @param {EvmTransaction | EvmTransaction[]} tx -  The transaction, or an array of multiple transactions to send in batch.
   * @param {Object} [config] - Optional config (unused for QSSN wallets).
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction (tx, config) {
    const { fee } = await this.quoteSendTransaction(tx, config)

    const hash = await this._sendUserOperation([tx].flat())

    return { hash, fee }
  }

  /**
   * Transfers a token to another address.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {Pick<QssnWalletConfig, 'transferMaxFee'>} [config] - If set, overrides the 'transferMaxFee' option defined in the wallet account configuration.
   * @returns {Promise<TransferResult>} The transfer's result.
   */
  async transfer (options, config) {
    const { transferMaxFee } = config ?? this._config

    const tx = await WalletAccountEvm._getTransferTransaction(options)

    const { fee } = await this.quoteSendTransaction(tx, config)

    if (transferMaxFee !== undefined && fee >= transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operation.')
    }

    const hash = await this._sendUserOperation([tx])

    return { hash, fee }
  }

  /**
   * Returns a read-only copy of the account.
   *
   * @returns {Promise<WalletAccountReadOnlyQssn>} The read-only account.
   */
  async toReadOnlyAccount () {
    const ecdsaOwner = await this._ownerAccount.getAddress()
    const mldsaPublicKey = this._mldsaAccount.publicKey

    const readOnlyAccount = new WalletAccountReadOnlyQssn(ecdsaOwner, mldsaPublicKey, this._config)

    return readOnlyAccount
  }

  /**
   * Returns the ML-DSA public key.
   *
   * @returns {Uint8Array} The ML-DSA public key.
   */
  getMLDSAPublicKey () {
    return this._mldsaAccount.publicKey
  }

  /**
   * Returns the ML-DSA public key as hex string.
   *
   * @returns {string} The ML-DSA public key (0x...).
   */
  getMLDSAPublicKeyHex () {
    return this._mldsaAccount.publicKeyHex
  }

  /**
   * Returns the ECDSA address (Safe owner).
   *
   * @returns {string} The ECDSA address.
   */
  getECDSAAddress () {
    return this._ownerAccount._address
  }

  /**
   * Returns the salt nonce used for wallet address derivation.
   *
   * @returns {string} The salt nonce (keccak256 of ML-DSA public key).
   */
  getSaltNonce () {
    return keccak256(this._mldsaAccount.publicKey)
  }

  /**
   * Disposes the wallet account, erasing the private keys from memory.
   */
  dispose () {
    this._ownerAccount.dispose()
    this._mldsaAccount.dispose()
  }

  /** @private */
  async _getProvider () {
    if (!this._provider) {
      const { provider } = this._config
      
      this._provider = typeof provider === 'string'
        ? new JsonRpcProvider(provider)
        : new BrowserProvider(provider)
    }

    return this._provider
  }

  /** @private */
  async _buildUserOp (txs, signature) {
    const walletAddress = await this.getAddress()
    const provider = await this._getProvider()
    const entryPoint = new Contract(this._config.entryPointAddress, ['function getNonce(address sender, uint192 key) view returns (uint256)'], provider)
    
    // Get nonce
    const nonce = await entryPoint.getNonce(walletAddress, 0)
    
    // Check if wallet is deployed
    const code = await provider.getCode(walletAddress)
    const isDeployed = code !== '0x'
    
    // Create factory and factoryData if not deployed (v0.7 format)
    let factory = null
    let factoryData = null
    if (!isDeployed) {
      factory = this._config.factoryAddress
      const factoryInterface = new ethers.Interface(['function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)'])
      const mldsaPublicKeyHex = this._mldsaAccount.publicKeyHex
      factoryData = factoryInterface.encodeFunctionData('createWallet', [mldsaPublicKeyHex, this._ownerAccount._address])
    }
    
    // Encode callData for execute function
    let callData
    if (txs.length === 1) {
      const wallet = new ethers.Interface(['function execute(address target, uint256 value, bytes calldata data) external'])
      callData = wallet.encodeFunctionData('execute', [txs[0].to, txs[0].value || 0, txs[0].data || '0x'])
    } else {
      // For multiple transactions, use executeBatch (if your UserWallet supports it)
      throw new Error('Batch transactions not yet implemented for UserWallet')
    }
    
    // Get gas estimates
    const feeData = await provider.getFeeData()
    
    // Calculate preVerificationGas based on UserOp size
    // Use a high value since bundler's calculation returns NaN with large factoryData
    const preVerificationGas = isDeployed ? 100000 : 500000
    
    // Build UserOperation in v0.7 format
    const userOp = {
      sender: walletAddress,
      nonce: ethers.toBeHex(nonce),
      callData,
      callGasLimit: ethers.toBeHex(BigInt(196608)),
      verificationGasLimit: ethers.toBeHex(BigInt(isDeployed ? 196608 : 2097152)),
      preVerificationGas: ethers.toBeHex(BigInt(preVerificationGas)),
      maxFeePerGas: ethers.toBeHex(feeData.maxFeePerGas || 1000000000n),
      maxPriorityFeePerGas: ethers.toBeHex(feeData.maxPriorityFeePerGas || 1000000000n),
      signature
    }
    
    // Add factory fields if deploying (v0.7)
    if (factory) {
      userOp.factory = factory
      userOp.factoryData = factoryData
    }
    
    // No paymaster - don't add paymaster fields at all
    
    return userOp
  }

  /** @private */
  _getUserOpHash (userOp) {
    // Pack initCode (factory + factoryData) for v0.7
    const initCode = userOp.factory 
      ? ethers.concat([userOp.factory, userOp.factoryData || '0x'])
      : '0x'
    
    // Pack paymasterAndData for v0.7
    const paymasterAndData = userOp.paymaster
      ? ethers.concat([
          userOp.paymaster,
          ethers.zeroPadValue(ethers.toBeArray(userOp.paymasterVerificationGasLimit || 0), 16),
          ethers.zeroPadValue(ethers.toBeArray(userOp.paymasterPostOpGasLimit || 0), 16),
          userOp.paymasterData || '0x'
        ])
      : '0x'
    
    // Pack gas limits for v0.7
    const accountGasLimits = ethers.concat([
      ethers.zeroPadValue(ethers.toBeArray(userOp.verificationGasLimit), 16),
      ethers.zeroPadValue(ethers.toBeArray(userOp.callGasLimit), 16)
    ])
    
    const gasFees = ethers.concat([
      ethers.zeroPadValue(ethers.toBeArray(userOp.maxPriorityFeePerGas), 16),
      ethers.zeroPadValue(ethers.toBeArray(userOp.maxFeePerGas), 16)
    ])
    
    // Hash the packed UserOp according to ERC-4337 v0.7
    const userOpHash = ethers.keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32'],
        [
          userOp.sender,
          userOp.nonce,
          ethers.keccak256(initCode),
          ethers.keccak256(userOp.callData),
          accountGasLimits,
          userOp.preVerificationGas,
          gasFees,
          ethers.keccak256(paymasterAndData)
        ]
      )
    )
    
    // Add EntryPoint and chainId according to ERC-4337
    return ethers.keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'address', 'uint256'],
        [userOpHash, this._config.entryPointAddress, this._config.chainId]
      )
    )
  }

  /** @private */
  async _sendUserOperation (txs) {
    // Build UserOp without signature
    const userOp = await this._buildUserOp(txs, '0x')
    
    // Get UserOp hash for signing
    const userOpHash = this._getUserOpHash(userOp)
    
    // Sign with ECDSA
    const ecdsaSignature = await this._ownerAccount.sign(ethers.getBytes(userOpHash))
    
    // Sign with ML-DSA (returns hex string)
    const mldsaSignatureHex = await this._mldsaAccount.sign(ethers.getBytes(userOpHash))
    const mldsaPublicKeyHex = this._mldsaAccount.publicKeyHex
    
    // Pack QSSN signature: abi.encode(ecdsaSignature, mldsaSignature, mldsaPublicKey, ecdsaOwner)
    const abiCoder = new AbiCoder()
    userOp.signature = abiCoder.encode(
      ['bytes', 'bytes', 'bytes', 'address'],
      [ecdsaSignature, mldsaSignatureHex, mldsaPublicKeyHex, this._ownerAccount._address]
    )
    
    // Debug: log the UserOp being sent
    console.log('Sending UserOp:', JSON.stringify(userOp, null, 2))
    
    // Submit to bundler
    const response = await fetch(this._config.bundlerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_sendUserOperation',
        params: [userOp, this._config.entryPointAddress]
      })
    })
    
    const result = await response.json()
    
    if (result.error) {
      throw new Error(`Bundler error: ${result.error.message}`)
    }
    
    return result.result // UserOp hash
  }
}
