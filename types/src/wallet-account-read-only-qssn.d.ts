export default class WalletAccountReadOnlyQssn extends WalletAccountReadOnly {
    /**
     * Creates a new read-only quantum-safe wallet account with ERC-4337 account abstraction.
     *
     * @param {string} ecdsaOwner - The ECDSA owner address.
     * @param {Uint8Array} mldsaPublicKey - The ML-DSA public key.
     * @param {Omit<QssnWalletConfig, 'transferMaxFee'>} config - The configuration object.
     */
    constructor(ecdsaOwner: string, mldsaPublicKey: Uint8Array, config: Omit<QssnWalletConfig, "transferMaxFee">);
    /**
     * The read-only quantum-safe wallet account configuration.
     *
     * @protected
     * @type {Omit<QssnWalletConfig, 'transferMaxFee'>}
     */
    protected _config: Omit<QssnWalletConfig, "transferMaxFee">;
    /**
     * The provider instance.
     *
     * @protected
     * @type {JsonRpcProvider | BrowserProvider | undefined}
     */
    protected _provider: JsonRpcProvider | BrowserProvider | undefined;
    /**
     * The chain id.
     *
     * @protected
     * @type {bigint | undefined}
     */
    protected _chainId: bigint | undefined;
    /**
     * The cached wallet address.
     *
     * @protected
     * @type {string | undefined}
     */
    protected _walletAddress: string | undefined;
    /** @private */
    private _ecdsaOwner;
    /** @private */
    private _mldsaPublicKey;
    /**
     * Returns the account's balance for the paymaster token provided in the wallet account configuration.
     *
     * @returns {Promise<bigint>} The paymaster token balance (in base unit).
     * @throws {Error} If no paymaster token is configured.
     */
    getPaymasterTokenBalance(): Promise<bigint>;
    /**
     * Quotes the costs of a send transaction operation.
     * Note: Uses bundler's gas estimation for accurate quotes.
     *
     * @param {EvmTransaction | EvmTransaction[]} tx - The transaction, or an array of multiple transactions to send in batch.
     * @param {QssnWalletConfig} [config] - Optional config override for paymaster settings.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: EvmTransaction | EvmTransaction[], config?: QssnWalletConfig): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {QssnWalletConfig} [config] - Optional config override for paymaster settings.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions, config?: QssnWalletConfig): Promise<Omit<TransferResult, "hash">>;
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
     * Returns the provider instance.
     *
     * @protected
     * @returns {Promise<JsonRpcProvider | BrowserProvider>} The provider.
     */
    protected _getProvider(): Promise<JsonRpcProvider | BrowserProvider>;
    /**
     * Returns the chain id.
     *
     * @protected
     * @returns {Promise<bigint>} - The chain id.
     */
    protected _getChainId(): Promise<bigint>;
    /** @private */
    private _getEvmReadOnlyAccount;
    /**
     * Estimates gas cost for a UserOperation by querying the bundler.
     *
     * @private
     * @param {EvmTransaction[]} txs - Array of transactions.
     * @param {Object} [paymasterToken] - Optional paymaster token config.
     * @returns {Promise<bigint>} Estimated gas cost in wei (or paymaster token if configured).
     */
    private _estimateUserOperationGas;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type EvmTransaction = any;
export type TransactionResult = any;
export type TransferOptions = any;
export type TransferResult = any;
export type EvmTransactionReceipt = any;
export type QssnWalletConfig = {
    /**
     * - The blockchain's id (e.g., 31337 for local Anvil).
     */
    chainId: number;
    /**
     * - The url of the rpc provider, or an instance of a class that implements eip-1193.
     */
    provider: string | Eip1193Provider;
    /**
     * - The url of the bundler service (set automatically via preset).
     */
    bundlerUrl: string;
    /**
     * - The address of the entry point smart contract (set automatically via preset).
     */
    entryPointAddress: string;
    /**
     * - The address of the QssnWalletFactory contract (set automatically via preset).
     */
    factoryAddress: string;
    /**
     * - The url of the paymaster service (optional, for future gas sponsorship).
     */
    paymasterUrl?: string;
    /**
     * - The address of the paymaster smart contract (optional, for future gas sponsorship).
     */
    paymasterAddress?: string;
    /**
     * - The paymaster token configuration (optional, for future gas sponsorship).
     */
    paymasterToken?: {
        address?: string;
    };
    /**
     * - The maximum fee amount for transfer operations.
     */
    transferMaxFee?: number | bigint;
    /**
     * - ML-DSA security level (44, 65, or 87). Default: 65.
     */
    mldsaSecurityLevel?: number;
};
/**
 * User-provided configuration. bundlerUrl, entryPointAddress, and factoryAddress are set automatically based on chainId.
 */
export type QssnUserConfig = {
    /**
     * - The blockchain's id (e.g., 31337 for local Anvil).
     */
    chainId: number;
    /**
     * - The url of the rpc provider, or an instance of a class that implements eip-1193.
     */
    provider: string | Eip1193Provider;
    /**
     * - The maximum fee amount for transfer operations.
     */
    transferMaxFee?: number | bigint;
    /**
     * - ML-DSA security level (44, 65, or 87). Default: 65.
     */
    mldsaSecurityLevel?: number;
    /**
     * - The url of the paymaster service (optional, for future gas sponsorship).
     */
    paymasterUrl?: string;
    /**
     * - The address of the paymaster smart contract (optional, for future gas sponsorship).
     */
    paymasterAddress?: string;
    /**
     * - The paymaster token configuration (optional, for future gas sponsorship).
     */
    paymasterToken?: {
        address?: string;
    };
};
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { JsonRpcProvider } from 'ethers';
import { BrowserProvider } from 'ethers';
