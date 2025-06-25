export default class WalletAccountEvmErc4337 {
    /**
     * Creates a new evm Erc4337 wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {EvmErc4337WalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config?: EvmErc4337WalletConfig);
    /**
     * The configuration object.
     *
     * @protected
     * @type {EvmErc4337WalletConfig}
     */
    protected _config: EvmErc4337WalletConfig;
    /**
     * The Safe4337Pack instance used to interact with the Safe 4337 protocol.
     *
     * @private
     * @type {Safe4337Pack | null}
     */
    private _safe4337Pack;
    /**
     * The fee estimator for the safe 4337 pack.
     *
     * @private
     * @type {GenericFeeEstimator}
     */
    private _feeEstimator;
    getAddress(): Promise<any>;
    /**
      * Sends a transaction.
      *
      * @param {EvmTransaction} tx -  The transaction.
      * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
      * @returns {Promise<TransactionResult>} The transaction's hash and fee.
      */
    sendTransaction(tx: EvmTransaction, config?: Pick<EvmErc4337WalletConfig, "paymasterToken">): Promise<TransactionResult>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @see {sendTransaction}
     * @param {EvmTransaction} tx - The transaction.
     * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: EvmTransaction, config?: Pick<EvmErc4337WalletConfig, "paymasterToken">): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Transfers a token to another address.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken' | 'transferMaxFee'>} [config] - If set, overrides the 'paymasterToken' and 'transferMaxFee' options defined in the wallet account configuration.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer(options: TransferOptions, config?: Pick<EvmErc4337WalletConfig, "paymasterToken" | "transferMaxFee">): Promise<TransferResult>;
    /**
     * Quotes the costs of a transfer operation in paymaster token.
     *
     * @see {transfer}
     * @param {TransferOptions} options - The transfer's options.
     * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken'>} config -  If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions, config: Pick<EvmErc4337WalletConfig, "paymasterToken">): Promise<Omit<TransferResult, "hash">>;
    /**
     * Initializes and returns the Safe4337Pack instance.
     *
     * @returns {Promise<Safe4337Pack>}
     * @private
     */
    private _getSafe4337Pack;
    /**
     * Calculates the gas cost of a gasless transaction in the paymaster token.
     *
     * @param {EvmTransaction} tx - The transaction to be executed.
     * @param {Object} paymasterToken - The paymaster token configuration.
     * @returns {Promise<bigint>} The gas cost in the paymaster token.
     * @private
     */
    private _getGasCostInPaymasterToken;
    /**
     * Calculates the gas cost of a gasless transaction in native token.
     *
     * @param {EvmTransaction} tx - The transaction to be executed.
     * @param {Object} paymasterToken - The paymaster token configuration.
     * @returns {Promise<bigint>} The gas cost in native token.
     * @private
     */
    private _getGaslessTransactionGasCostInEth;
    /**
     * Sends a gasless transaction using Safe4337Pack.
     *
     * @private
     * @param {EvmTransaction} tx - The transaction to be executed.
     * @param {number} fee - The transaction fee.
     * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<string>} The transaction's hash.
     */
    private _sendGaslessTransaction;
}
export type KeyPair = import("@wdk/wallet-evm").KeyPair;
export type EvmTransaction = import("@wdk/wallet-evm").EvmTransaction;
export type TransactionResult = import("@wdk/wallet-evm").TransactionResult;
export type TransferOptions = import("@wdk/wallet-evm").TransferOptions;
export type TransferResult = import("@wdk/wallet-evm").TransferResult;
export type EvmErc4337WalletConfig = {
    /**
     * - The blockchain's id (e.g., 1 for ethereum).
     */
    chainId: number;
    /**
     * - The url of the rpc provider, or an instance of a class that implements eip-1193.
     */
    provider?: string | Eip1193Provider;
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
    transferMaxFee?: number;
};
