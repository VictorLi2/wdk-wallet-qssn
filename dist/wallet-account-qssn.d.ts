import { BrowserProvider, JsonRpcProvider } from "ethers";
import type {
	ApproveOptions,
	DualSignature,
	EIP712Domain,
	EIP712Types,
	EvmTransaction,
	KeyPair,
	QssnWalletConfig,
	SignTypedDataResult,
	TransactionResult,
	TransferOptions,
	TransferResult,
} from "./types.js";
import { WalletAccountReadOnlyQssn } from "./wallet-account-read-only-qssn.js";
/**
 * Quantum-safe wallet account with ERC-4337 account abstraction and ML-DSA signatures.
 */
export declare class WalletAccountQssn extends WalletAccountReadOnlyQssn {
	protected _config: QssnWalletConfig;
	private _ownerAccount;
	private _mldsaAccount;
	private _ecdsaWallet;
	/**
	 * Creates a new quantum-safe wallet account.
	 *
	 * @param ecdsaSeed - The wallet's BIP-39 seed phrase for ECDSA keys.
	 * @param mldsaSeed - The wallet's BIP-39 seed phrase for ML-DSA keys.
	 * @param path - The BIP-44 derivation path (e.g. "0'/0/0").
	 * @param config - The configuration object.
	 */
	constructor(ecdsaSeed: string | Uint8Array, mldsaSeed: string | Uint8Array, path: string, config: QssnWalletConfig);
	/**
	 * The derivation path's index of this account.
	 */
	get index(): number;
	/**
	 * The derivation path of this account (see BIP-44).
	 */
	get path(): string;
	/**
	 * The account's key pair.
	 */
	get keyPair(): KeyPair;
	/**
	 * Signs a message with both ECDSA and ML-DSA.
	 */
	sign(message: string): Promise<DualSignature>;
	/**
	 * Verifies a message's signature.
	 */
	verify(message: string, signature: string): Promise<boolean>;
	/**
	 * Signs EIP-712 typed data with dual ECDSA + ML-DSA signatures.
	 * Submits an approveHash UserOp to the bundler for on-chain hash approval,
	 * ensuring ML-DSA verification through the trusted bundler pipeline.
	 *
	 * @param domain - EIP-712 domain separator fields
	 * @param types - EIP-712 type definitions mapping type names to field arrays
	 * @param value - The structured data object matching the primary type
	 * @returns The encoded QSSN signature and the typed data hash
	 */
	signTypedData(domain: EIP712Domain, types: EIP712Types, value: Record<string, unknown>): Promise<SignTypedDataResult>;
	/**
	 * Approves a specific amount of tokens to a spender.
	 */
	approve(options: ApproveOptions): Promise<TransactionResult>;
	/**
	 * Sends a transaction.
	 */
	sendTransaction(
		tx: EvmTransaction | EvmTransaction[],
		config?: Pick<QssnWalletConfig, "paymasterToken">,
	): Promise<TransactionResult>;
	/**
	 * Transfers a token to another address.
	 */
	transfer(
		options: TransferOptions,
		config?: Pick<QssnWalletConfig, "paymasterToken" | "transferMaxFee">,
	): Promise<TransferResult>;
	/**
	 * Returns a read-only copy of the account.
	 */
	toReadOnlyAccount(): Promise<WalletAccountReadOnlyQssn>;
	/**
	 * Returns the ML-DSA public key.
	 */
	getMLDSAPublicKey(): Uint8Array;
	/**
	 * Returns the ML-DSA public key as hex string.
	 */
	getMLDSAPublicKeyHex(): string;
	/**
	 * Returns the ECDSA address (Safe owner).
	 */
	getECDSAAddress(): string;
	/**
	 * Returns the salt nonce used for wallet address derivation.
	 */
	getSaltNonce(): string;
	/**
	 * Disposes the wallet account, erasing the private keys from memory.
	 */
	dispose(): void;
	protected _getProvider(): Promise<JsonRpcProvider | BrowserProvider>;
	private _buildUserOp;
	private _getUserOpHash;
	private _sendUserOperation;
	/**
	 * Validates EIP-712 typed data inputs before any signing or on-chain interaction.
	 * Follows fail-fast pattern.
	 */
	private _validateTypedDataInputs;
}
//# sourceMappingURL=wallet-account-qssn.d.ts.map
