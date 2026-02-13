import { BrowserProvider, JsonRpcProvider } from "ethers";
import type {
	EvmTransaction,
	EvmTransactionReceipt,
	GasEstimateResult,
	InternalQuoteResult,
	PaymasterTokenConfig,
	QssnWalletConfig,
	QuoteResult,
	TransferOptions,
} from "./types.js";
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
	 * Internal quote method that returns cached RPC data for the quote→send optimization.
	 * Used by sendTransaction() and transfer() to avoid redundant RPC calls.
	 * @internal
	 */
	protected _quoteSendTransactionInternal(
		tx: EvmTransaction | EvmTransaction[],
		config?: Partial<QssnWalletConfig>,
	): Promise<InternalQuoteResult>;
	/**
	 * Quotes the costs of a send transaction operation.
	 * Applies the same overhead as _buildUserOp for accurate estimates.
	 */
	quoteSendTransaction(tx: EvmTransaction | EvmTransaction[], config?: Partial<QssnWalletConfig>): Promise<QuoteResult>;
	/**
	 * Estimates gas costs for a transaction without executing it.
	 * Returns gas estimates that can be displayed to users before they commit to a transaction.
	 *
	 * @param tx - Transaction parameters: target address, value, and optional calldata
	 * @returns Gas estimation including totalGas and per-component gasLimits
	 */
	estimateGas(tx: EvmTransaction | EvmTransaction[]): Promise<GasEstimateResult>;
	/**
	 * Quotes the costs of a transfer operation.
	 */
	quoteTransfer(
		options: TransferOptions,
		config?: Partial<QssnWalletConfig>,
	): Promise<{
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
	protected _estimateUserOperationGas(
		txs: EvmTransaction[],
		_paymasterToken?: PaymasterTokenConfig,
	): Promise<InternalQuoteResult>;
}
//# sourceMappingURL=wallet-account-read-only-qssn.d.ts.map
