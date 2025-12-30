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

"use strict";

import { Contract, keccak256, AbiCoder, ethers, JsonRpcProvider, BrowserProvider } from "ethers";

// Use pure JavaScript version by default
// If you need Node.js native performance, install @tetherto/wdk-wallet-evm separately
import { WalletAccountEvmJs } from "./wallet-account-evm-js.js";
const WalletAccountEvm = WalletAccountEvmJs;

import WalletAccountReadOnlyQssn from "./wallet-account-read-only-qssn.js";
import { WalletAccountMldsa } from "./wallet-account-mldsa.js";

/** @typedef {import('ethers').Eip1193Provider} Eip1193Provider */

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@tetherto/wdk-wallet-evm').KeyPair} KeyPair */

/** @typedef {import('@tetherto/wdk-wallet-evm').EvmTransaction} EvmTransaction */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-evm').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet-evm').ApproveOptions} ApproveOptions */

/** @typedef {import('./wallet-account-read-only-qssn.js').QssnWalletConfig} QssnWalletConfig */

const FEE_TOLERANCE_COEFFICIENT = 120n;

const USDT_MAINNET_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

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
	constructor(ecdsaSeed, mldsaSeed, path, config) {
		// Create ECDSA account with standard Ethereum path
		const ownerAccount = new WalletAccountEvm(ecdsaSeed, path, config);

		// Create ML-DSA account with security level in path
		const securityLevel = config.mldsaSecurityLevel || 65;
		const mldsaAccount = new WalletAccountMldsa(mldsaSeed, path, { ...config, securityLevel });

		// Initialize parent with ECDSA owner and ML-DSA public key
		super(ownerAccount._address, mldsaAccount.publicKey, config);

		/**
		 * The quantum-safe wallet account configuration.
		 *
		 * @protected
		 * @type {QssnWalletConfig}
		 */
		this._config = config;

		/** @private */
		this._ownerAccount = ownerAccount;

		/** @private */
		this._mldsaAccount = mldsaAccount;

		/** @private - Derive the same wallet for raw ECDSA signing without Ethereum Signed Message prefix */
		const fullPath = `m/44'/60'/${path}`;
		this._ecdsaWallet =
			typeof ecdsaSeed === "string"
				? ethers.Wallet.fromPhrase(ecdsaSeed).derivePath(fullPath)
				: ethers.HDNodeWallet.fromSeed(ecdsaSeed).derivePath(fullPath);

		// Verify addresses match
		if (this._ecdsaWallet.address.toLowerCase() !== ownerAccount._address.toLowerCase()) {
			throw new Error(`ECDSA wallet address mismatch: ${this._ecdsaWallet.address} !== ${ownerAccount._address}`);
		}
	}

	/**
	 * The derivation path's index of this account.
	 *
	 * @type {number}
	 */
	get index() {
		return this._ownerAccount.index;
	}

	/**
	 * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
	 *
	 * @type {string}
	 */
	get path() {
		return this._ownerAccount.path;
	}

	/**
	 * The account's key pair.
	 *
	 * @type {KeyPair}
	 */
	get keyPair() {
		return this._ownerAccount.keyPair;
	}

	/**
	 * Signs a message with both ECDSA and ML-DSA.
	 *
	 * @param {string} message - The message to sign.
	 * @returns {Promise<{ecdsa: string, mldsa: string}>} Both signatures.
	 */
	async sign(message) {
		const [ecdsaSignature, mldsaSignature] = await Promise.all([
			this._ownerAccount.sign(message),
			this._mldsaAccount.sign(message),
		]);

		return {
			ecdsa: ecdsaSignature,
			mldsa: mldsaSignature,
		};
	}

	/**
	 * Verifies a message's signature.
	 *
	 * @param {string} message - The original message.
	 * @param {string} signature - The signature to verify.
	 * @returns {Promise<boolean>} True if the signature is valid.
	 */
	async verify(message, signature) {
		return await this._ownerAccount.verify(message, signature);
	}

	/**
	 * Approves a specific amount of tokens to a spender.
	 *
	 * @param {ApproveOptions} options - The approve options.
	 * @returns {Promise<TransactionResult>} - The transaction’s result.
	 * @throws {Error} - If trying to approve usdts on ethereum with allowance not equal to zero (due to the usdt allowance reset requirement).
	 */
	async approve(options) {
		if (!this._ownerAccount._provider) {
			throw new Error("The wallet must be connected to a provider to approve funds.");
		}

		const { token, spender, amount } = options;
		const chainId = await this._getChainId();

		if (chainId === 1n && token.toLowerCase() === USDT_MAINNET_ADDRESS.toLowerCase()) {
			const currentAllowance = await this.getAllowance(token, spender);
			if (currentAllowance > 0n && BigInt(amount) > 0n) {
				throw new Error(
					'USDT requires the current allowance to be reset to 0 before setting a new non-zero value. Please send an "approve" transaction with an amount of 0 first.',
				);
			}
		}

		const abi = ["function approve(address spender, uint256 amount) returns (bool)"];
		const contract = new Contract(token, abi, this._ownerAccount._provider);

		const tx = {
			to: token,
			value: 0,
			data: contract.interface.encodeFunctionData("approve", [spender, amount]),
		};

		return await this.sendTransaction(tx);
	}

	/**
	 * Sends a transaction.
	 *
	 * @param {EvmTransaction | EvmTransaction[]} tx -  The transaction, or an array of multiple transactions to send in batch.
	 * @param {Pick<QssnWalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
	 * @returns {Promise<TransactionResult>} The transaction's result.
	 */
	async sendTransaction(tx, config) {
		const { paymasterToken } = config ?? this._config;

		const { fee, gasLimits } = await this.quoteSendTransaction(tx, config);

		// If paymaster is configured, pass token approval options
		const options = {
			gasLimits, // Always include gas limits from estimation
			...(paymasterToken && {
				paymasterTokenAddress: paymasterToken.address,
				amountToApprove: BigInt((fee * FEE_TOLERANCE_COEFFICIENT) / 100n),
			}),
		};

		const hash = await this._sendUserOperation([tx].flat(), options);

		return { hash, fee };
	}

	/**
	 * Transfers a token to another address.
	 *
	 * @param {TransferOptions} options - The transfer's options.
	 * @param {Pick<QssnWalletConfig, 'paymasterToken' | 'transferMaxFee'>} [config] - If set, overrides the 'paymasterToken' and 'transferMaxFee' options defined in the wallet account configuration.
	 * @returns {Promise<TransferResult>} The transfer's result.
	 */
	async transfer(options, config) {
		const { paymasterToken, transferMaxFee } = config ?? this._config;

		const tx = await WalletAccountEvm._getTransferTransaction(options);

		const { fee, gasLimits } = await this.quoteSendTransaction(tx, config);

		if (transferMaxFee !== undefined && fee >= transferMaxFee) {
			throw new Error("Exceeded maximum fee cost for transfer operation.");
		}

		// If paymaster is configured, pass token approval options
		const txOptions = {
			gasLimits, // Always include gas limits from estimation
			...(paymasterToken && {
				paymasterTokenAddress: paymasterToken.address,
				amountToApprove: BigInt((fee * FEE_TOLERANCE_COEFFICIENT) / 100n),
			}),
		};

		const hash = await this._sendUserOperation([tx], txOptions);

		return { hash, fee };
	}

	/**
	 * Returns a read-only copy of the account.
	 *
	 * @returns {Promise<WalletAccountReadOnlyQssn>} The read-only account.
	 */
	async toReadOnlyAccount() {
		const ecdsaOwner = await this._ownerAccount.getAddress();
		const mldsaPublicKey = this._mldsaAccount.publicKey;

		const readOnlyAccount = new WalletAccountReadOnlyQssn(ecdsaOwner, mldsaPublicKey, this._config);

		return readOnlyAccount;
	}

	/**
	 * Returns the ML-DSA public key.
	 *
	 * @returns {Uint8Array} The ML-DSA public key.
	 */
	getMLDSAPublicKey() {
		return this._mldsaAccount.publicKey;
	}

	/**
	 * Returns the ML-DSA public key as hex string.
	 *
	 * @returns {string} The ML-DSA public key (0x...).
	 */
	getMLDSAPublicKeyHex() {
		return this._mldsaAccount.publicKeyHex;
	}

	/**
	 * Returns the ECDSA address (Safe owner).
	 *
	 * @returns {string} The ECDSA address.
	 */
	getECDSAAddress() {
		return this._ownerAccount._address;
	}

	/**
	 * Returns the salt nonce used for wallet address derivation.
	 *
	 * @returns {string} The salt nonce (keccak256 of ML-DSA public key).
	 */
	getSaltNonce() {
		return keccak256(this._mldsaAccount.publicKey);
	}

	/**
	 * Disposes the wallet account, erasing the private keys from memory.
	 */
	dispose() {
		this._ownerAccount.dispose();
		this._mldsaAccount.dispose();
	}

	/** @private */
	async _getProvider() {
		if (!this._provider) {
			const { provider } = this._config;

			this._provider =
				typeof provider === "string" ? new JsonRpcProvider(provider) : new BrowserProvider(provider);
		}

		return this._provider;
	}

	/** @private */
	async _buildUserOp(txs, signature, options) {
		const walletAddress = await this.getAddress();
		const provider = await this._getProvider();
		const entryPoint = new Contract(
			this._config.entryPointAddress,
			["function getNonce(address sender, uint192 key) view returns (uint256)"],
			provider,
		);

		// Get nonce
		const nonce = await entryPoint.getNonce(walletAddress, 0);

		// Check if wallet is deployed
		const code = await provider.getCode(walletAddress);
		const isDeployed = code !== "0x";

		// Create factory and factoryData if not deployed (v0.7 format)
		let factory = null;
		let factoryData = null;
		if (!isDeployed) {
			factory = this._config.factoryAddress;
			const factoryInterface = new ethers.Interface([
				"function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)",
			]);
			const mldsaPublicKeyHex = this._mldsaAccount.publicKeyHex;
			factoryData = factoryInterface.encodeFunctionData("createWallet", [
				mldsaPublicKeyHex,
				this._ownerAccount._address,
			]);
		}

		// Encode callData for execute function
		let callData;
		if (txs.length === 1) {
			const wallet = new ethers.Interface([
				"function execute(address target, uint256 value, bytes calldata data) external",
			]);
			callData = wallet.encodeFunctionData("execute", [txs[0].to, txs[0].value || 0, txs[0].data || "0x"]);
		} else {
			// For multiple transactions, use executeBatch
			const wallet = new ethers.Interface([
				"struct Call { address target; uint256 value; bytes data; }",
				"function executeBatch(Call[] calldata calls) external",
			]);
			const calls = txs.map((tx) => ({
				target: tx.to,
				value: tx.value || 0,
				data: tx.data || "0x",
			}));
			callData = wallet.encodeFunctionData("executeBatch", [calls]);
		}

		// Get gas estimates
		const feeData = await provider.getFeeData();

		// Use gas limits from estimation if provided, otherwise use defaults
		const gasLimits = options?.gasLimits;

		// Allow tx.gasLimit to override callGasLimit (for complex operations like factory deployments)
		const txGasHint = txs[0]?.gasLimit ? BigInt(txs[0].gasLimit) : null;

		// Fallback defaults if no estimates provided
		const preVerificationGas = gasLimits?.preVerificationGas || BigInt(isDeployed ? 150000 : 500000);

		// For undeployed wallets, add factory deployment overhead
		// Bundler underestimates factory deployment cost (estimates ~23k, but deployment needs ~2M+)
		let verificationGasLimit = gasLimits?.verificationGasLimit || BigInt(isDeployed ? 196608 : 1000000);
		if (!isDeployed) {
			// Add deployment overhead: factory.createAccount() + constructor + storage initialization
			verificationGasLimit = verificationGasLimit + BigInt(2000000);
		}

		// Use tx.gasLimit hint if it's higher than estimation (protects against underestimation)
		// For undeployed wallets, add overhead for cold storage access costs
		let estimatedCallGas = gasLimits?.callGasLimit || BigInt(1000000);
		if (!isDeployed) {
			estimatedCallGas = estimatedCallGas + BigInt(75000); // Add cold storage overhead for first tx
		}
		const callGasLimit = txGasHint && txGasHint > estimatedCallGas ? txGasHint : estimatedCallGas;

		// Build UserOperation in v0.9 unpacked format (for bundler RPC)
		// The bundler expects unpacked fields, not packed format
		const userOp = {
			sender: walletAddress,
			nonce: ethers.toBeHex(nonce),
			callData,
			callGasLimit: ethers.toBeHex(BigInt(callGasLimit)),
			verificationGasLimit: ethers.toBeHex(BigInt(verificationGasLimit)),
			preVerificationGas: ethers.toBeHex(BigInt(preVerificationGas)),
			maxFeePerGas: ethers.toBeHex(feeData.maxFeePerGas || 1000000000n),
			maxPriorityFeePerGas: ethers.toBeHex(feeData.maxPriorityFeePerGas || 1000000000n),
			signature,
		};

		// Add factory and factoryData if not deployed
		if (!isDeployed) {
			userOp.factory = factory;
			userOp.factoryData = factoryData;
		}

		return userOp;
	}

	/** @private */
	_getUserOpHash(userOp) {
		// UserOp is in v0.9 unpacked format, we need to pack it for hashing
		// Calculate hash exactly as EntryPoint v0.9 does:

		// Pack initCode: factory + factoryData (or '0x' if deployed)
		const initCode = userOp.factory ? ethers.concat([userOp.factory, userOp.factoryData || "0x"]) : "0x";

		// Pack accountGasLimits: verificationGasLimit (high 128) + callGasLimit (low 128)
		const accountGasLimits = ethers.concat([
			ethers.zeroPadValue(ethers.toBeArray(BigInt(userOp.verificationGasLimit)), 16),
			ethers.zeroPadValue(ethers.toBeArray(BigInt(userOp.callGasLimit)), 16),
		]);

		// Pack gasFees: maxPriorityFeePerGas (high 128) + maxFeePerGas (low 128)
		const gasFees = ethers.concat([
			ethers.zeroPadValue(ethers.toBeArray(BigInt(userOp.maxPriorityFeePerGas)), 16),
			ethers.zeroPadValue(ethers.toBeArray(BigInt(userOp.maxFeePerGas)), 16),
		]);

		// EIP-712 type hash for PackedUserOperation
		const PACKED_USEROP_TYPEHASH = ethers.keccak256(
			ethers.toUtf8Bytes(
				"PackedUserOperation(address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData)",
			),
		);

		// Step 1: Encode the struct hash (EIP-712 structHash)
		const structHash = ethers.keccak256(
			AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint256", "bytes32", "bytes32", "bytes32", "uint256", "bytes32", "bytes32"],
				[
					PACKED_USEROP_TYPEHASH,
					userOp.sender,
					userOp.nonce,
					ethers.keccak256(initCode),
					ethers.keccak256(userOp.callData),
					accountGasLimits,
					userOp.preVerificationGas,
					gasFees,
					ethers.keccak256("0x"), // paymasterAndData
				],
			),
		);

		// Step 2: Calculate EIP-712 domain separator
		// The EntryPoint uses EIP-712 with domain (name, version, chainId, verifyingContract)
		const domainSeparator = ethers.TypedDataEncoder.hashDomain({
			name: "ERC4337",
			version: "1",
			chainId: this._config.chainId,
			verifyingContract: this._config.entryPointAddress,
		});

		// Step 3: Calculate EIP-712 typed data hash
		// toTypedDataHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash))
		return ethers.keccak256(ethers.concat([ethers.toUtf8Bytes("\x19\x01"), domainSeparator, structHash]));
	}

	/** @private */
	async _sendUserOperation(txs, options) {
		// Build UserOp without signature, passing options for gas limits
		const userOp = await this._buildUserOp(txs, "0x", options);

		// Get UserOp hash for signing
		const userOpHash = this._getUserOpHash(userOp);

		// Sign with ECDSA using raw signing (no Ethereum Signed Message prefix)
		// userOpHash is already a 32-byte hash, use SigningKey.sign directly
		const ecdsaSig = this._ecdsaWallet.signingKey.sign(userOpHash);
		const sig = ethers.Signature.from(ecdsaSig);

		// OpenZeppelin expects r (32 bytes) + s (32 bytes) + v (1 byte) = 65 bytes total
		// Construct manually to ensure correct format
		const ecdsaSignature = ethers.concat([
			ethers.zeroPadValue(sig.r, 32),
			ethers.zeroPadValue(sig.s, 32),
			ethers.toBeArray(sig.v),
		]);

		// Sign with ML-DSA (returns hex string)
		const mldsaSignatureHex = await this._mldsaAccount.sign(ethers.getBytes(userOpHash));
		const mldsaPublicKeyHex = this._mldsaAccount.publicKeyHex;

		// Pack QSSN signature: abi.encode(ecdsaSignature, mldsaSignature, mldsaPublicKey, ecdsaOwner)
		const abiCoder = new AbiCoder();
		userOp.signature = abiCoder.encode(
			["bytes", "bytes", "bytes", "address"],
			[ecdsaSignature, mldsaSignatureHex, mldsaPublicKeyHex, this._ownerAccount._address],
		);

		// Send v0.9 PackedUserOperation to bundler
		const bundlerParams = [userOp, this._config.entryPointAddress];

		// Add paymaster options if configured and provided (for future gas sponsorship)
		// Options contain paymasterTokenAddress and amountToApprove from sendTransaction/transfer
		if (options && this._config.paymasterUrl && this._config.paymasterAddress) {
			bundlerParams.push({
				paymasterUrl: this._config.paymasterUrl,
				paymasterAddress: this._config.paymasterAddress,
				paymasterTokenAddress: options.paymasterTokenAddress,
				amountToApprove: options.amountToApprove,
			});
		}

		// Submit to bundler
		const response = await fetch(this._config.bundlerUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "eth_sendUserOperation",
				params: bundlerParams,
			}),
		});

		const result = await response.json();

		if (result.error) {
			// Check for AA50 error (insufficient funds to repay paymaster)
			if (result.error.message && result.error.message.includes("AA50")) {
				throw new Error("Not enough funds on the wallet account to repay the paymaster.");
			}
			throw new Error(`Bundler error: ${result.error.message}`);
		}

		return result.result; // UserOp hash
	}
}
