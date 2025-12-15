/**
 * Pure JavaScript EVM wallet account using only ethers.js
 * This replaces @tetherto/wdk-wallet-evm to avoid sodium-universal dependency.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export class WalletAccountEvmJs {
    /**
     * @param {string | Uint8Array} seed - BIP-39 seed phrase or seed bytes
     * @param {string} path - BIP-44 derivation path (e.g. "0'/0/0")
     * @param {Object} config - Configuration object with chainId and provider
     */
    constructor(seed: string | Uint8Array, path: string, config: any);
    _index: number;
    _path: string;
    _config: any;
    _wallet: ethers.HDNodeWallet;
    _address: string;
    _provider: any;
    /**
     * The derivation path's index of this account.
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account.
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair (address and private key).
     * @type {{address: string, privateKey: string}}
     */
    get keyPair(): {
        address: string;
        privateKey: string;
    };
    /**
     * Get the account's address.
     * @returns {Promise<string>}
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message with ECDSA (Ethereum Signed Message format).
     * @param {string} message - The message to sign
     * @returns {Promise<string>} The signature
     */
    sign(message: string): Promise<string>;
    /**
     * Verifies a signature against a message.
     * @param {string} message - The original message
     * @param {string} signature - The signature to verify
     * @returns {Promise<boolean>} True if valid
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Clean up resources (no-op for browser, here for compatibility).
     */
    dispose(): void;
}
import { ethers } from 'ethers';
