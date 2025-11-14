/** @implements {IWalletAccount} */
export default class WalletAccountQssn extends WalletAccountReadOnlyQssn implements IWalletAccount {
    /**
     * Creates a new quantum-safe wallet account with ERC-4337 account abstraction and ML-DSA signatures.
     *
     * @param {string | Uint8Array} ecdsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase for ECDSA keys.
     * @param {string | Uint8Array} mldsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase for ML-DSA keys.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {QssnWalletConfig} config - The configuration object.
     */
    constructor(ecdsaSeed: string | Uint8Array, mldsaSeed: string | Uint8Array, path: string, config: QssnWalletConfig);
    /** @private */
    private _ownerAccount;
    /** @private */
    private _mldsaAccount;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair.
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * Signs a message with both ECDSA and ML-DSA.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<{ecdsa: string, mldsa: string}>} Both signatures.
     */
    sign(message: string): Promise<{
        ecdsa: string;
        mldsa: string;
    }>;
    /**
     * Verifies a message's signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The signature to verify.
     * @returns {Promise<boolean>} True if the signature is valid.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Approves a specific amount of tokens to a spender.
     *
     * @param {ApproveOptions} options - The approve options.
     * @returns {Promise<TransactionResult>} - The transaction’s result.
     * @throws {Error} - If trying to approve usdts on ethereum with allowance not equal to zero (due to the usdt allowance reset requirement).
     */
    approve(options: ApproveOptions): Promise<TransactionResult>;
    /**
     * Sends a transaction.
     *
     * @param {EvmTransaction | EvmTransaction[]} tx -  The transaction, or an array of multiple transactions to send in batch.
     * @param {Pick<QssnWalletConfig, 'paymasterToken'>} [config] - If set, overrides the 'paymasterToken' option defined in the wallet account configuration.
     * @returns {Promise<TransactionResult>} The transaction's result.
     */
    sendTransaction(tx: EvmTransaction | EvmTransaction[], config?: Pick<QssnWalletConfig, "paymasterToken">): Promise<TransactionResult>;
    /**
     * Transfers a token to another address.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {Pick<QssnWalletConfig, 'paymasterToken' | 'transferMaxFee'>} [config] - If set, overrides the 'paymasterToken' and 'transferMaxFee' options defined in the wallet account configuration.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer(options: TransferOptions, config?: Pick<QssnWalletConfig, "paymasterToken" | "transferMaxFee">): Promise<TransferResult>;
    /**
     * Returns a read-only copy of the account.
     *
     * @returns {Promise<WalletAccountReadOnlyQssn>} The read-only account.
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlyQssn>;
    /**
     * Returns the ML-DSA public key.
     *
     * @returns {Uint8Array} The ML-DSA public key.
     */
    getMLDSAPublicKey(): Uint8Array;
    /**
     * Returns the ML-DSA public key as hex string.
     *
     * @returns {string} The ML-DSA public key (0x...).
     */
    getMLDSAPublicKeyHex(): string;
    /**
     * Returns the ECDSA address (Safe owner).
     *
     * @returns {string} The ECDSA address.
     */
    getECDSAAddress(): string;
    /**
     * Returns the salt nonce used for Safe address derivation.
     *
     * @returns {string} The salt nonce (keccak256 of ML-DSA public key).
     */
    getSaltNonce(): string;
    /**
     * Returns the underlying ML-DSA account.
     *
     * @returns {WalletAccountMldsa} The ML-DSA account.
     */
    getMLDSAAccount(): WalletAccountMldsa;
    /**
     * Gets the UserOperation data including ML-DSA signature and public key.
     * This is useful for debugging and verifying what data is being sent to the bundler/validator.
     *
     * @param {EvmTransaction | EvmTransaction[]} tx - The transaction(s) to create a UserOperation for.
     * @param {Pick<QssnWalletConfig, 'paymasterToken'>} [config] - Optional config override.
     * @returns {Promise<Object>} The UserOperation with ML-DSA data.
     */
    getUserOperationWithMLDSA(tx: EvmTransaction | EvmTransaction[], config?: Pick<QssnWalletConfig, "paymasterToken">): Promise<any>;
    /**
     * Signs a message with ML-DSA (for off-chain verification).
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The ML-DSA signature.
     */
    signWithMLDSA(message: string): Promise<string>;
    /**
     * Verifies an ML-DSA signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The ML-DSA signature.
     * @returns {Promise<boolean>} True if valid.
     */
    verifyMLDSA(message: string, signature: string): Promise<boolean>;
    /**
     * Disposes the wallet account, erasing the private keys from memory.
     */
    dispose(): void;
    /** @private */
    private _sendUserOperation;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type KeyPair = import("@tetherto/wdk-wallet-evm").KeyPair;
export type EvmTransaction = import("@tetherto/wdk-wallet-evm").EvmTransaction;
export type TransactionResult = import("@tetherto/wdk-wallet-evm").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet-evm").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-evm").TransferResult;
export type ApproveOptions = import("@tetherto/wdk-wallet-evm").ApproveOptions;
export type QssnWalletConfig = any;
import WalletAccountReadOnlyQssn from './wallet-account-read-only-qssn.js';
import { WalletAccountMldsa } from './wallet-account-mldsa.js';
