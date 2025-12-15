/**
 * ML-DSA wallet account for post-quantum signatures
 */
export class WalletAccountMldsa {
    /**
     * Creates a new ML-DSA wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's BIP-39 mnemonic phrase or seed bytes
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0")
     * @param {Object} config - Configuration object
     * @param {number} [config.securityLevel=65] - ML-DSA security level (44, 65, or 87)
     */
    constructor(seed: string | Uint8Array, path: string, config?: {
        securityLevel?: number;
    });
    _path: string;
    _config: {
        securityLevel?: number;
    };
    _securityLevel: number;
    _keyPair: {
        privateKey: Uint8Array;
        publicKey: Uint8Array;
    };
    /**
     * The derivation path of this account.
     * @type {string}
     */
    get path(): string;
    /**
     * The ML-DSA public key.
     * @type {Uint8Array}
     */
    get publicKey(): Uint8Array;
    /**
     * The ML-DSA public key as hex string.
     * @type {string}
     */
    get publicKeyHex(): string;
    /**
     * Signs a message using ML-DSA.
     * @param {string} message - The message to sign
     * @returns {Promise<string>} The ML-DSA signature as hex string
     */
    sign(message: string): Promise<string>;
    /**
     * Verifies a message signature using ML-DSA.
     * @param {string} message - The original message
     * @param {string} signature - The ML-DSA signature as hex string
     * @returns {Promise<boolean>} True if the signature is valid
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Disposes the wallet account, securely erasing sensitive key material.
     */
    dispose(): void;
}
export default WalletAccountMldsa;
