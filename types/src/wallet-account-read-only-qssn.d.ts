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
 * @property {string} paymasterUrl - The url of the paymaster service.
 * @property {string} paymasterAddress - The address of the paymaster smart contract.
 * @property {string} entryPointAddress - The address of the entry point smart contract.
 * @property {string} safeModulesVersion - The safe modules version.
 * @property {Object} paymasterToken - The paymaster token configuration.
 * @property {string} paymasterToken.address - The address of the paymaster token.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 */
export default class WalletAccountReadOnlyQssn extends WalletAccountReadOnly {
    /**
     * Creates a new read-only quantum-safe wallet account with ERC-4337 account abstraction.
     *
     * @param {string} address - The evm account's address.
     * @param {Omit<QssnWalletConfig, 'transferMaxFee'>} config - The configuration object.
     * @param {string} saltNonce - Salt nonce for Safe address derivation (keccak256 of ML-DSA public key).
     */
    constructor(address: string, config: Omit<QssnWalletConfig, "transferMaxFee">, saltNonce: string);
    /**
     * The read-only quantum-safe wallet account configuration.
     *
     * @protected
     * @type {Omit<QssnWalletConfig, 'transferMaxFee'>}
     */
    protected _config: Omit<QssnWalletConfig, "transferMaxFee">;
    /**
     * The safe's implementation of the erc-4337 standard.
     *
     * @protected
     * @type {Safe4337Pack | undefined}
     */
    protected _safe4337Pack: Safe4337Pack | undefined;
    /**
     * The safe's fee estimator.
     *
     * @protected
     * @type {GenericFeeEstimator | undefined}
     */
    protected _feeEstimator: GenericFeeEstimator | undefined;
    /**
     * The chain id.
     *
     * @protected
     * @type {bigint | undefined}
     */
    protected _chainId: bigint | undefined;
    /** @private */
    private _ownerAccountAddress;
    /** @private */
    private _saltNonce;
    /**
     * Returns the account's balance for the paymaster token provided in the wallet account configuration.
     *
     * @returns {Promise<bigint>} The paymaster token balance (in base unit).
     */
    getPaymasterTokenBalance(): Promise<bigint>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {EvmTransaction | EvmTransaction[]} tx - The transaction, or an array of multiple transactions to send in batch.
     * @param {Pick<QssnWalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: EvmTransaction | EvmTransaction[], config?: Pick<QssnWalletConfig, "paymasterToken">): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {Pick<QssnWalletConfig, 'paymasterToken'>} [config] -  If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions, config?: Pick<QssnWalletConfig, "paymasterToken">): Promise<Omit<TransferResult, "hash">>;
    /**
     * Returns a transaction's receipt.
     *
     * @param {string} hash - The user operation hash.
     * @returns {Promise<EvmTransactionReceipt | null>} – The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<EvmTransactionReceipt | null>;
    /**
     * Returns the current allowance for the given token and spender.
     * @param {string} token - The token’s address.
     * @param {string} spender - The spender’s address.
     * @returns {Promise<bigint>} - The allowance.
     */
    getAllowance(token: string, spender: string): Promise<bigint>;
    /**
     * Returns the safe's erc-4337 pack of the account.
     *
     * @protected
     * @returns {Promise<Safe4337Pack>} The safe's erc-4337 pack.
     */
    protected _getSafe4337Pack(): Promise<Safe4337Pack>;
    /**
     * Returns the chain id.
     *
     * @protected
     * @returns {Promise<bigint>} - The chain id.
     */
    protected _getChainId(): Promise<bigint>;
    /** @private */
    private _getEvmReadOnlyAccount;
    /** @private */
    private _getFeeEstimator;
    /** @private */
    private _getUserOperationGasCost;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type EvmTransaction = import("@tetherto/wdk-wallet-evm").EvmTransaction;
export type TransactionResult = import("@tetherto/wdk-wallet-evm").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet-evm").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-evm").TransferResult;
export type EvmTransactionReceipt = import("@tetherto/wdk-wallet-evm").EvmTransactionReceipt;
export type QssnWalletConfig = {
    /**
     * - The blockchain's id (e.g., 1 for ethereum).
     */
    chainId: number;
    /**
     * - The url of the rpc provider, or an instance of a class that implements eip-1193.
     */
    provider: string | Eip1193Provider;
    /**
     * - The url of the bundler service.
     */
    bundlerUrl: string;
    /**
     * - The url of the paymaster service.
     */
    paymasterUrl: string;
    /**
     * - The address of the paymaster smart contract.
     */
    paymasterAddress: string;
    /**
     * - The address of the entry point smart contract.
     */
    entryPointAddress: string;
    /**
     * - The safe modules version.
     */
    safeModulesVersion: string;
    /**
     * - The paymaster token configuration.
     */
    paymasterToken: {
        address: string;
    };
    /**
     * - The maximum fee amount for transfer operations.
     */
    transferMaxFee?: number | bigint;
};
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { Safe4337Pack } from '@wdk-safe-global/relay-kit';
import { GenericFeeEstimator } from '@wdk-safe-global/relay-kit';
