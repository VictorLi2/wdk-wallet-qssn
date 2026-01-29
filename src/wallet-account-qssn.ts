// Copyright 2025 Tether Operations Limited
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

import {
	Contract,
	keccak256,
	AbiCoder,
	ethers,
	JsonRpcProvider,
	BrowserProvider,
	Interface,
	toBeHex,
	zeroPadValue,
	toBeArray,
	concat,
	toUtf8Bytes,
	getBytes,
	Signature,
	Wallet,
	HDNodeWallet,
	TypedDataEncoder,
	Mnemonic,
} from "ethers";
import type { Eip1193Provider, FeeData } from "ethers";
import { WalletAccountEvm } from "./wallet-account-evm.js";
import { WalletAccountReadOnlyQssn } from "./wallet-account-read-only-qssn.js";
import { WalletAccountMldsa } from "./wallet-account-mldsa.js";
import type {
	QssnWalletConfig,
	EvmTransaction,
	TransactionResult,
	TransferOptions,
	TransferResult,
	ApproveOptions,
	KeyPair,
	DualSignature,
	GasLimits,
	CachedRpcData,
	PaymasterTokenConfig,
} from "./types.js";

const FEE_TOLERANCE_COEFFICIENT = 120n;

const USDT_MAINNET_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

interface UserOpBuildOptions {
	gasLimits?: GasLimits;
	_cached?: CachedRpcData;
	paymasterTokenAddress?: string;
	amountToApprove?: bigint;
}

interface UserOp {
	sender: string;
	nonce: string;
	callData: string;
	callGasLimit: string;
	verificationGasLimit: string;
	preVerificationGas: string;
	maxFeePerGas: string;
	maxPriorityFeePerGas: string;
	signature: string;
	factory?: string | null;
	factoryData?: string | null;
}

/**
 * Quantum-safe wallet account with ERC-4337 account abstraction and ML-DSA signatures.
 */
export class WalletAccountQssn extends WalletAccountReadOnlyQssn {
	protected override _config: QssnWalletConfig;
	private _ownerAccount: WalletAccountEvm;
	private _mldsaAccount: WalletAccountMldsa;
	private _ecdsaWallet: HDNodeWallet;

	/**
	 * Creates a new quantum-safe wallet account.
	 *
	 * @param ecdsaSeed - The wallet's BIP-39 seed phrase for ECDSA keys.
	 * @param mldsaSeed - The wallet's BIP-39 seed phrase for ML-DSA keys.
	 * @param path - The BIP-44 derivation path (e.g. "0'/0/0").
	 * @param config - The configuration object.
	 */
	constructor(
		ecdsaSeed: string | Uint8Array,
		mldsaSeed: string | Uint8Array,
		path: string,
		config: QssnWalletConfig,
	) {
		// Create ECDSA account with standard Ethereum path
		const ownerAccount = new WalletAccountEvm(ecdsaSeed, path, config);

		// Create ML-DSA account with security level in path
		const securityLevel = config.mldsaSecurityLevel || 65;
		const mldsaAccount = new WalletAccountMldsa(mldsaSeed, path, {
			...config,
			securityLevel,
		});

		// Initialize parent with ECDSA owner and ML-DSA public key
		super(ownerAccount._address, mldsaAccount.publicKey, config);

		this._config = config;
		this._ownerAccount = ownerAccount;
		this._mldsaAccount = mldsaAccount;

		// Derive the same wallet for raw ECDSA signing without Ethereum Signed Message prefix
		const fullPath = `m/44'/60'/${path}`;
		const seedBytes = typeof ecdsaSeed === "string" ? Mnemonic.fromPhrase(ecdsaSeed).computeSeed() : ecdsaSeed;
		this._ecdsaWallet = HDNodeWallet.fromSeed(seedBytes).derivePath(fullPath);

		// Verify addresses match
		if (this._ecdsaWallet.address.toLowerCase() !== ownerAccount._address.toLowerCase()) {
			throw new Error(`ECDSA wallet address mismatch: ${this._ecdsaWallet.address} !== ${ownerAccount._address}`);
		}
	}

	/**
	 * The derivation path's index of this account.
	 */
	get index(): number {
		return this._ownerAccount.index;
	}

	/**
	 * The derivation path of this account (see BIP-44).
	 */
	get path(): string {
		return this._ownerAccount.path;
	}

	/**
	 * The account's key pair.
	 */
	get keyPair(): KeyPair {
		return this._ownerAccount.keyPair;
	}

	/**
	 * Signs a message with both ECDSA and ML-DSA.
	 */
	async sign(message: string): Promise<DualSignature> {
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
	 */
	async verify(message: string, signature: string): Promise<boolean> {
		return await this._ownerAccount.verify(message, signature);
	}

	/**
	 * Approves a specific amount of tokens to a spender.
	 */
	async approve(options: ApproveOptions): Promise<TransactionResult> {
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

		const tx: EvmTransaction = {
			to: token,
			value: 0,
			data: contract.interface.encodeFunctionData("approve", [spender, amount]),
		};

		return await this.sendTransaction(tx);
	}

	/**
	 * Sends a transaction.
	 */
	async sendTransaction(
		tx: EvmTransaction | EvmTransaction[],
		config?: Pick<QssnWalletConfig, "paymasterToken">,
	): Promise<TransactionResult> {
		const { paymasterToken } = config ?? this._config;

		const { fee, gasLimits, _cached } = await this.quoteSendTransaction(tx, config);

		// If paymaster is configured, pass token approval options
		// Also pass cached RPC data to avoid duplicate calls
		const options: UserOpBuildOptions = {
			gasLimits,
			_cached,
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
	 */
	async transfer(
		options: TransferOptions,
		config?: Pick<QssnWalletConfig, "paymasterToken" | "transferMaxFee">,
	): Promise<TransferResult> {
		const { paymasterToken, transferMaxFee } = config ?? this._config;

		const tx = WalletAccountEvm._getTransferTransaction(options);

		const { fee, gasLimits, _cached } = await this.quoteSendTransaction(tx, config);

		if (transferMaxFee !== undefined && fee >= transferMaxFee) {
			throw new Error("Exceeded maximum fee cost for transfer operation.");
		}

		// If paymaster is configured, pass token approval options
		// Also pass cached RPC data to avoid duplicate calls
		const txOptions: UserOpBuildOptions = {
			gasLimits,
			_cached,
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
	 */
	async toReadOnlyAccount(): Promise<WalletAccountReadOnlyQssn> {
		const ecdsaOwner = await this._ownerAccount.getAddress();
		const mldsaPublicKey = this._mldsaAccount.publicKey;

		const readOnlyAccount = new WalletAccountReadOnlyQssn(ecdsaOwner, mldsaPublicKey, this._config);

		return readOnlyAccount;
	}

	/**
	 * Returns the ML-DSA public key.
	 */
	getMLDSAPublicKey(): Uint8Array {
		return this._mldsaAccount.publicKey;
	}

	/**
	 * Returns the ML-DSA public key as hex string.
	 */
	getMLDSAPublicKeyHex(): string {
		return this._mldsaAccount.publicKeyHex;
	}

	/**
	 * Returns the ECDSA address (Safe owner).
	 */
	getECDSAAddress(): string {
		return this._ownerAccount._address;
	}

	/**
	 * Returns the salt nonce used for wallet address derivation.
	 */
	getSaltNonce(): string {
		return keccak256(this._mldsaAccount.publicKey);
	}

	/**
	 * Disposes the wallet account, erasing the private keys from memory.
	 */
	dispose(): void {
		this._ownerAccount.dispose();
		this._mldsaAccount.dispose();
	}

	protected override async _getProvider(): Promise<JsonRpcProvider | BrowserProvider> {
		if (!this._provider) {
			const { provider } = this._config;

			this._provider =
				typeof provider === "string"
					? new JsonRpcProvider(provider)
					: new BrowserProvider(provider as Eip1193Provider);
		}

		return this._provider;
	}

	private async _buildUserOp(
		txs: EvmTransaction[],
		signature: string,
		options?: UserOpBuildOptions,
	): Promise<UserOp> {
		const walletAddress = await this.getAddress();
		const provider = await this._getProvider();

		// Use cached RPC data if available (from quoteSendTransaction), otherwise fetch fresh
		let nonce: bigint;
		let isDeployed: boolean;
		let feeData: { maxFeePerGas: bigint | null; maxPriorityFeePerGas: bigint | null };

		if (options?._cached) {
			// Reuse cached values - saves 3 RPC calls!
			({ nonce, isDeployed, feeData } = options._cached);
		} else {
			// No cache - fetch fresh (fallback for direct _buildUserOp calls)
			const entryPoint = new Contract(
				this._config.entryPointAddress,
				["function getNonce(address sender, uint192 key) view returns (uint256)"],
				provider,
			);
			// Fetch all RPC data in parallel
			const [fetchedNonce, code, fetchedFeeData] = await Promise.all([
				entryPoint.getNonce(walletAddress, 0) as Promise<bigint>,
				provider.getCode(walletAddress),
				provider.getFeeData(),
			]);
			nonce = fetchedNonce;
			isDeployed = code !== "0x";
			feeData = {
				maxFeePerGas: fetchedFeeData.maxFeePerGas,
				maxPriorityFeePerGas: fetchedFeeData.maxPriorityFeePerGas,
			};
		}

		// Check if this is the wallet's first transaction (cold storage overhead applies)
		// Only nonce 0 has cold storage costs - after first successful tx, storage is warm
		const isFirstUse = nonce === 0n;

		// Create factory and factoryData if not deployed (v0.7 format)
		let factory: string | null = null;
		let factoryData: string | null = null;
		if (!isDeployed) {
			factory = this._config.walletFactoryAddress;
			const factoryInterface = new Interface([
				"function createWallet(bytes calldata mldsaPublicKey, address ecdsaOwner) returns (address)",
			]);
			const mldsaPublicKeyHex = this._mldsaAccount.publicKeyHex;
			factoryData = factoryInterface.encodeFunctionData("createWallet", [
				mldsaPublicKeyHex,
				this._ownerAccount._address,
			]);
		}

		// Encode callData for execute function
		let callData: string;
		if (txs.length === 1) {
			const wallet = new Interface([
				"function execute(address target, uint256 value, bytes calldata data) external",
			]);
			callData = wallet.encodeFunctionData("execute", [txs[0].to, txs[0].value || 0, txs[0].data || "0x"]);
		} else {
			// For multiple transactions, use executeBatch
			const wallet = new Interface([
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

		// Use gas limits from estimation if provided, otherwise use defaults
		const gasLimits = options?.gasLimits;

		// Allow tx.gasLimit to override callGasLimit (for complex operations like factory deployments)
		const txGasHint = txs[0]?.gasLimit ? BigInt(txs[0].gasLimit) : null;

		// Gas buffer percentage (default 40% = adds 40% on top of bundler estimates)
		// QSSN first UserOps (wallet deployment) need ~12% minimum buffer, we use 40% for safety
		// Regular UserOps on deployed wallets may need less buffer
		const gasBufferPercent = this._config.gasBufferPercent ?? 40;
		const bufferMultiplier = BigInt(100 + gasBufferPercent);

		// Helper to apply buffer to a gas value
		const applyBuffer = (gas: bigint): bigint => (gas * bufferMultiplier) / 100n;

		// QSSN minimum verificationGasLimit: The bundler estimates with a dummy signature
		// that causes tryRecover to fail early. But real signatures need more gas for:
		// - ABI decoding the ~5KB QSSN signature
		// - ECDSA.tryRecover with valid signature
		// - keccak256 of ML-DSA public key + comparison
		// Minimum 150K gas covers these operations safely
		const QSSN_MIN_VERIFICATION_GAS = BigInt(150000);

		// Get base gas values from bundler estimates or use fallback defaults
		const basePreVerificationGas = gasLimits?.preVerificationGas || BigInt(isDeployed ? 150000 : 500000);
		const estimatedVerificationGas = gasLimits?.verificationGasLimit || BigInt(isDeployed ? 196608 : 1000000);
		// Enforce minimum for QSSN wallets (dummy sig estimation underestimates real sig gas)
		const baseVerificationGasLimit =
			estimatedVerificationGas > QSSN_MIN_VERIFICATION_GAS ? estimatedVerificationGas : QSSN_MIN_VERIFICATION_GAS;
		const baseCallGasLimit = gasLimits?.callGasLimit || BigInt(1000000);

		// Apply buffer to all gas limits
		const preVerificationGas = applyBuffer(basePreVerificationGas);
		const verificationGasLimit = applyBuffer(baseVerificationGasLimit);
		let callGasLimit = applyBuffer(baseCallGasLimit);

		// Use tx.gasLimit hint if it's higher than buffered estimation (protects against underestimation)
		if (txGasHint && txGasHint > callGasLimit) {
			callGasLimit = txGasHint;
		}

		// Build UserOperation in v0.9 unpacked format (for bundler RPC)
		// The bundler expects unpacked fields, not packed format
		const userOp: UserOp = {
			sender: walletAddress,
			nonce: toBeHex(nonce),
			callData,
			callGasLimit: toBeHex(BigInt(callGasLimit)),
			verificationGasLimit: toBeHex(BigInt(verificationGasLimit)),
			preVerificationGas: toBeHex(BigInt(preVerificationGas)),
			maxFeePerGas: toBeHex(feeData.maxFeePerGas || 1000000000n),
			maxPriorityFeePerGas: toBeHex(feeData.maxPriorityFeePerGas || 1000000000n),
			signature,
		};

		// Add factory and factoryData if not deployed
		if (!isDeployed) {
			userOp.factory = factory;
			userOp.factoryData = factoryData;
		}

		return userOp;
	}

	private _getUserOpHash(userOp: UserOp): string {
		// UserOp is in v0.9 unpacked format, we need to pack it for hashing
		// Calculate hash exactly as EntryPoint v0.9 does:

		// Pack initCode: factory + factoryData (or '0x' if deployed)
		const initCode = userOp.factory ? concat([userOp.factory, userOp.factoryData || "0x"]) : "0x";

		// Pack accountGasLimits: verificationGasLimit (high 128) + callGasLimit (low 128)
		const accountGasLimits = concat([
			zeroPadValue(toBeArray(BigInt(userOp.verificationGasLimit)), 16),
			zeroPadValue(toBeArray(BigInt(userOp.callGasLimit)), 16),
		]);

		// Pack gasFees: maxPriorityFeePerGas (high 128) + maxFeePerGas (low 128)
		const gasFees = concat([
			zeroPadValue(toBeArray(BigInt(userOp.maxPriorityFeePerGas)), 16),
			zeroPadValue(toBeArray(BigInt(userOp.maxFeePerGas)), 16),
		]);

		// EIP-712 type hash for PackedUserOperation
		const PACKED_USEROP_TYPEHASH = keccak256(
			toUtf8Bytes(
				"PackedUserOperation(address sender,uint256 nonce,bytes initCode,bytes callData,bytes32 accountGasLimits,uint256 preVerificationGas,bytes32 gasFees,bytes paymasterAndData)",
			),
		);

		// Step 1: Encode the struct hash (EIP-712 structHash)
		const structHash = keccak256(
			AbiCoder.defaultAbiCoder().encode(
				["bytes32", "address", "uint256", "bytes32", "bytes32", "bytes32", "uint256", "bytes32", "bytes32"],
				[
					PACKED_USEROP_TYPEHASH,
					userOp.sender,
					userOp.nonce,
					keccak256(initCode),
					keccak256(userOp.callData),
					accountGasLimits,
					userOp.preVerificationGas,
					gasFees,
					keccak256("0x"), // paymasterAndData
				],
			),
		);

		// Step 2: Calculate EIP-712 domain separator
		// The EntryPoint uses EIP-712 with domain (name, version, chainId, verifyingContract)
		const domainSeparator = TypedDataEncoder.hashDomain({
			name: "ERC4337",
			version: "1",
			chainId: this._config.chainId,
			verifyingContract: this._config.entryPointAddress,
		});

		// Step 3: Calculate EIP-712 typed data hash
		// toTypedDataHash = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash))
		return keccak256(concat([toUtf8Bytes("\x19\x01"), domainSeparator, structHash]));
	}

	private async _sendUserOperation(txs: EvmTransaction[], options?: UserOpBuildOptions): Promise<string> {
		// Build UserOp without signature, passing options for gas limits
		const userOp = await this._buildUserOp(txs, "0x", options);

		// Get UserOp hash for signing
		const userOpHash = this._getUserOpHash(userOp);

		// Sign with ECDSA using raw signing (no Ethereum Signed Message prefix)
		// userOpHash is already a 32-byte hash, use SigningKey.sign directly
		const ecdsaSig = this._ecdsaWallet.signingKey.sign(userOpHash);
		const sig = Signature.from(ecdsaSig);

		// OpenZeppelin expects r (32 bytes) + s (32 bytes) + v (1 byte) = 65 bytes total
		// Construct manually to ensure correct format
		const ecdsaSignature = concat([zeroPadValue(sig.r, 32), zeroPadValue(sig.s, 32), toBeArray(sig.v)]);

		// Sign with ML-DSA (returns hex string)
		const mldsaSignatureHex = await this._mldsaAccount.sign(getBytes(userOpHash));
		const mldsaPublicKeyHex = this._mldsaAccount.publicKeyHex;

		// Pack QSSN signature: abi.encode(ecdsaSignature, mldsaSignature, mldsaPublicKey, ecdsaOwner)
		const abiCoder = new AbiCoder();
		userOp.signature = abiCoder.encode(
			["bytes", "bytes", "bytes", "address"],
			[ecdsaSignature, mldsaSignatureHex, mldsaPublicKeyHex, this._ownerAccount._address],
		);

		// Send v0.9 PackedUserOperation to bundler
		const bundlerParams: (UserOp | string | object)[] = [userOp, this._config.entryPointAddress];

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

		const result = (await response.json()) as {
			result?: string;
			error?: { message: string };
		};

		if (result.error) {
			// Check for AA50 error (insufficient funds to repay paymaster)
			if (result.error.message && result.error.message.includes("AA50")) {
				throw new Error("Not enough funds on the wallet account to repay the paymaster.");
			}
			throw new Error(`Bundler error: ${result.error.message}`);
		}

		return result.result!; // UserOp hash
	}
}
