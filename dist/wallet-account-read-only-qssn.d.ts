import { JsonRpcProvider, BrowserProvider } from "ethers";
import type { QssnWalletConfig, EvmTransaction, TransferOptions, EvmTransactionReceipt, QuoteResult, GasLimits, CachedRpcData, PaymasterTokenConfig } from "./types.js";
/**
 * Read-only quantum-safe wallet account with ERC-4337 account abstraction.
 */
export declare class WalletAccountReadOnlyQssn {
    protected _config: Omit<QssnWalletConfig, "transferMaxFee">;
    protected _provider: JsonRpcProvider | BrowserProvider | undefined;
    protected _chainId: bigint | undefined;
    protected _walletAddress: string | undefined;
    protected _ecdsaOwner: string;
    protected _mldsaPublicKey: Uint8Array;
    constructor(ecdsaOwner: string, mldsaPublicKey: Uint8Array, config: Omit<QssnWalletConfig, "transferMaxFee">);
    /**
     * Returns the account's address (computed from factory).
     */
    getAddress(): Promise<string>;
    /**
     * Returns the account's ETH balance.
     */
    getBalance(): Promise<bigint>;
    /**
     * Returns the account balance for a specific token.
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Returns the account's balance for the paymaster token.
     */
    getPaymasterTokenBalance(): Promise<bigint>;
    /**
     * Quotes the costs of a send transaction operation.
     */
    quoteSendTransaction(tx: EvmTransaction | EvmTransaction[], config?: Partial<QssnWalletConfig>): Promise<QuoteResult>;
    /**
     * Quotes the costs of a transfer operation.
     */
    quoteTransfer(options: TransferOptions, config?: Partial<QssnWalletConfig>): Promise<{
        fee: bigint;
    }>;
    /**
     * Returns a transaction's receipt.
     */
    getTransactionReceipt(hash: string): Promise<EvmTransactionReceipt | null>;
    /**
     * Returns the current allowance for the given token and spender.
     */
    getAllowance(token: string, spender: string): Promise<bigint>;
    /**
     * Returns the provider instance.
     */
    protected _getProvider(): Promise<JsonRpcProvider | BrowserProvider>;
    /**
     * Returns the chain id.
     */
    protected _getChainId(): Promise<bigint>;
    private _getEvmReadOnlyAccount;
    /**
     * Estimates gas cost for a UserOperation by querying the bundler.
     */
    protected _estimateUserOperationGas(txs: EvmTransaction[], _paymasterToken?: PaymasterTokenConfig): Promise<{
        fee: bigint;
        gasLimits: GasLimits;
        _cached: CachedRpcData;
    }>;
}
//# sourceMappingURL=wallet-account-read-only-qssn.d.ts.map