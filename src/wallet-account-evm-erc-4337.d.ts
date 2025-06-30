export default class WalletAccountEvmErc4337 extends WalletAccountEvm {
    /**
     * Creates a new evm [erc-4337](https://www.erc4337.io/docs) wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {EvmErc4337WalletConfig} config - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config: EvmErc4337WalletConfig);
    /** @private */
    private _safe4337Pack;
    /** @private */
    private _feeEstimator;
    /**
     * Returns the account's balance for the paymaster token defined in the wallet account configuration.
     *
     * @returns {Promise<number>} The paymaster token balance (in base unit).
     */
    getPaymasterTokenBalance(): Promise<number>;
    /**
     * Sends a transaction.
     *
     * @param {EvmTransaction} tx -  The transaction.
     * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<TransactionResult>} The transaction's result.
     */
    sendTransaction(tx: EvmTransaction, config?: Pick<EvmErc4337WalletConfig, "paymasterToken">): Promise<TransactionResult>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @see {@link sendTransaction}
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
     * Quotes the costs of a transfer operation.
     *
     * @see {@link transfer}
     * @param {TransferOptions} options - The transfer's options.
     * @param {Pick<EvmErc4337WalletConfig, 'paymasterToken'>} [config] -  If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions, config?: Pick<EvmErc4337WalletConfig, "paymasterToken">): Promise<Omit<TransferResult, "hash">>;
    /**
     * Returns a transaction's receipt.
     *
     * @param {string} hash - The user operation hash.
     * @returns {Promise<EvmTransactionReceipt | null>} – The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<EvmTransactionReceipt | null>;
    /** @private */
    private _getSafe4337Pack;
    /** @private */
    private _sendUserOperation;
    /** @private */
    private _getUserOperationGasCost;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type EvmTransaction = import("@wdk/wallet-evm").EvmTransaction;
export type TransactionResult = import("@wdk/wallet-evm").TransactionResult;
export type TransferOptions = import("@wdk/wallet-evm").TransferOptions;
export type TransferResult = import("@wdk/wallet-evm").TransferResult;
export type EvmTransactionReceipt = import("@wdk/wallet-evm").EvmTransactionReceipt;
export type EvmErc4337WalletConfig = {
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
    transferMaxFee?: number;
};
import { WalletAccountEvm } from '@wdk/wallet-evm';
