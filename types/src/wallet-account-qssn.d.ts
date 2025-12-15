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
    _ecdsaWallet: ethers.HDNodeWallet;
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
     * Returns the salt nonce used for wallet address derivation.
     *
     * @returns {string} The salt nonce (keccak256 of ML-DSA public key).
     */
    getSaltNonce(): string;
    /**
     * Disposes the wallet account, erasing the private keys from memory.
     */
    dispose(): void;
    /** @private */
    private _buildUserOp;
    /** @private */
    private _getUserOpHash;
    /** @private */
    private _sendUserOperation;
}
export type Eip1193Provider = import("ethers").Eip1193Provider;
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type KeyPair = any;
export type EvmTransaction = any;
export type TransactionResult = any;
export type TransferOptions = any;
export type TransferResult = any;
export type ApproveOptions = any;
export type QssnWalletConfig = import("./wallet-account-read-only-qssn.js").QssnWalletConfig;
import WalletAccountReadOnlyQssn from './wallet-account-read-only-qssn.js';
import { ethers } from 'ethers';
