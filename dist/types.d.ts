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
    /** QssnWalletFactory contract address (set via preset) */
    factoryAddress: string;
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
     * Default: 10 (10% buffer). Set to 0 to use exact bundler estimates.
     */
    gasBufferPercent?: number;
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
     * Default: 10 (10% buffer). Set to 0 to use exact bundler estimates.
     */
    gasBufferPercent?: number;
}
/**
 * Chain preset configuration
 */
export interface ChainPreset {
    entryPointAddress: string;
    factoryAddress: string;
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
    totalGas?: bigint;
    gasLimits: GasLimits;
    _cached?: CachedRpcData;
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
//# sourceMappingURL=types.d.ts.map