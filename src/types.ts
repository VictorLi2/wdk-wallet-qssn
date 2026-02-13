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

import type { Eip1193Provider } from "ethers";

/**
 * ML-DSA security levels as defined in FIPS 204
 */
export type MLDSASecurityLevel = 44 | 65 | 87;

/**
 * ML-DSA key pair
 */
export interface MLDSAKeyPair {
	privateKey: Uint8Array;
	publicKey: Uint8Array;
}

/**
 * ECDSA key pair for Ethereum
 */
export interface KeyPair {
	address: string;
	privateKey: string;
	publicKey?: string;
}

/**
 * Fee rates for transactions
 */
export interface FeeRates {
	normal: bigint;
	fast: bigint;
}

/**
 * EVM transaction object
 */
export interface EvmTransaction {
	to: string;
	value?: bigint | number;
	data?: string;
	gasLimit?: bigint | number;
}

/**
 * Result of a transaction
 */
export interface TransactionResult {
	hash: string;
	fee: bigint;
}

/**
 * Options for token transfers
 */
export interface TransferOptions {
	to: string;
	amount: bigint | number;
	token?: string;
}

/**
 * Result of a token transfer
 */
export interface TransferResult {
	hash: string;
	fee: bigint;
}

/**
 * Options for token approvals
 */
export interface ApproveOptions {
	token: string;
	spender: string;
	amount: bigint | number;
}

/**
 * EVM transaction receipt
 */
export interface EvmTransactionReceipt {
	transactionHash: string;
	blockNumber: number;
	blockHash: string;
	status: number;
	gasUsed: bigint;
	logs: unknown[];
}

/**
 * Paymaster token configuration
 */
export interface PaymasterTokenConfig {
	address: string;
}

/**
 * Full QSSN wallet configuration (with preset values applied)
 */
export interface QssnWalletConfig {
	/** The blockchain's chain ID */
	chainId: number;
	/** RPC provider URL or EIP-1193 provider instance */
	provider: string | Eip1193Provider;
	/** Bundler service URL (set via preset) */
	bundlerUrl: string;
	/** EntryPoint contract address (set via preset) */
	entryPointAddress: string;
	/** QssnWalletFactory contract address (user override or preset) */
	walletFactoryAddress: string;
	/** Paymaster service URL (optional) */
	paymasterUrl?: string;
	/** Paymaster contract address (optional) */
	paymasterAddress?: string;
	/** Paymaster token configuration (optional) */
	paymasterToken?: PaymasterTokenConfig;
	/** Maximum fee for transfer operations */
	transferMaxFee?: bigint | number;
	/** ML-DSA security level (44, 65, or 87). Default: 65 */
	mldsaSecurityLevel?: MLDSASecurityLevel;
	/**
	 * Gas buffer percentage to add on top of bundler estimates.
	 * This provides a safety margin against gas price fluctuations and estimation variance.
	 * Default: 20 (20% buffer). Set to 0 to use exact bundler estimates.
	 */
	gasBufferPercent?: number;
	/**
	 * Timeout in milliseconds for bundler RPC calls.
	 * Default: 30000 (30 seconds).
	 */
	bundlerTimeout?: number;
	/**
	 * Number of retry attempts for failed bundler RPC calls.
	 * Default: 3.
	 */
	bundlerRetries?: number;
	/**
	 * Optional callback invoked before each retry attempt.
	 * @param attempt - The retry attempt number (1-based)
	 * @param error - The error that caused the retry
	 */
	onBundlerRetry?: (attempt: number, error: Error) => void;
}

/**
 * User-provided configuration (chainId, provider, and bundlerUrl required, presets applied automatically)
 */
export interface QssnUserConfig {
	/** The blockchain's chain ID */
	chainId: number;
	/** RPC provider URL or EIP-1193 provider instance */
	provider: string | Eip1193Provider;
	/** Bundler service URL */
	bundlerUrl: string;
	/** QssnWalletFactory contract address */
	walletFactoryAddress: string;
	/** Maximum fee for transfer operations */
	transferMaxFee?: bigint | number;
	/** ML-DSA security level (44, 65, or 87). Default: 65 */
	mldsaSecurityLevel?: MLDSASecurityLevel;
	/** Paymaster service URL (optional) */
	paymasterUrl?: string;
	/** Paymaster contract address (optional) */
	paymasterAddress?: string;
	/** Paymaster token configuration (optional) */
	paymasterToken?: PaymasterTokenConfig;
	/**
	 * Gas buffer percentage to add on top of bundler estimates.
	 * This provides a safety margin against gas price fluctuations and estimation variance.
	 * Default: 20 (20% buffer). Set to 0 to use exact bundler estimates.
	 */
	gasBufferPercent?: number;
	/**
	 * Timeout in milliseconds for bundler RPC calls.
	 * Default: 30000 (30 seconds).
	 */
	bundlerTimeout?: number;
	/**
	 * Number of retry attempts for failed bundler RPC calls.
	 * Default: 3.
	 */
	bundlerRetries?: number;
	/**
	 * Optional callback invoked before each retry attempt.
	 * @param attempt - The retry attempt number (1-based)
	 * @param error - The error that caused the retry
	 */
	onBundlerRetry?: (attempt: number, error: Error) => void;
}

/**
 * Chain preset configuration
 */
export interface ChainPreset {
	entryPointAddress: string;
}

/**
 * Gas limits from estimation
 */
export interface GasLimits {
	callGasLimit: bigint;
	verificationGasLimit: bigint;
	preVerificationGas: bigint;
}

/**
 * Cached RPC data from gas estimation
 */
export interface CachedRpcData {
	nonce: bigint;
	isDeployed: boolean;
	feeData: {
		maxFeePerGas: bigint | null;
		maxPriorityFeePerGas: bigint | null;
	};
}

/**
 * Quote result for transaction estimation
 */
export interface QuoteResult {
	fee: bigint;
	totalGas?: bigint; // Total gas including EntryPoint overhead (if bundler provides it)
	gasLimits: GasLimits;
}

/**
 * Result of gas estimation (public-facing, gas data only)
 */
export interface GasEstimateResult {
	totalGas: bigint;
	gasLimits: GasLimits;
}

/**
 * Internal quote result with cached RPC data for the quote→send optimization.
 * NOT exported publicly — used internally between quoteSendTransaction and sendTransaction/transfer
 * to avoid redundant RPC calls.
 * @internal
 */
export interface InternalQuoteResult extends QuoteResult {
	_cached: CachedRpcData;
}

/**
 * UserOperation options for sending
 */
export interface UserOpOptions {
	gasLimits?: GasLimits;
	_cached?: CachedRpcData;
	paymasterTokenAddress?: string;
	amountToApprove?: bigint;
}

/**
 * Dual signature result (ECDSA + ML-DSA)
 */
export interface DualSignature {
	ecdsa: string;
	mldsa: string;
}

/**
 * EIP-712 domain separator fields (all optional per EIP-712 spec)
 */
export interface EIP712Domain {
	name?: string;
	version?: string;
	chainId?: number | bigint;
	verifyingContract?: string;
	salt?: string;
}

/**
 * EIP-712 type field definition
 */
export interface EIP712TypeField {
	name: string;
	type: string;
}

/**
 * EIP-712 types mapping (type name → array of field definitions)
 */
export type EIP712Types = Record<string, EIP712TypeField[]>;

/**
 * Parameters for signTypedData method
 */
export interface SignTypedDataParams {
	domain: EIP712Domain;
	types: EIP712Types;
	value: Record<string, unknown>;
}

/**
 * Result of signTypedData method
 */
export interface SignTypedDataResult {
	/** The encoded QSSN signature (abi.encode(ecdsaSig, mldsaSig, mldsaPubKey, ecdsaOwner)) */
	signature: string;
	/** The EIP-712 typed data hash that was signed and approved on-chain */
	typedDataHash: string;
}
