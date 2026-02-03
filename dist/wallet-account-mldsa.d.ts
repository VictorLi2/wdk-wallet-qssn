import type { MLDSASecurityLevel } from "./types.js";
interface MLDSAAccountConfig {
    securityLevel?: MLDSASecurityLevel;
}
/**
 * ML-DSA wallet account for post-quantum signatures
 */
export declare class WalletAccountMldsa {
    private _path;
    private _config;
    private _securityLevel;
    private _keyPair;
    /**
     * Creates a new ML-DSA wallet account.
     */
    constructor(seed: string | Uint8Array, path: string, config?: MLDSAAccountConfig);
    /**
     * The derivation path of this account.
     */
    get path(): string;
    /**
     * The ML-DSA public key.
     */
    get publicKey(): Uint8Array;
    /**
     * The ML-DSA public key as hex string.
     */
    get publicKeyHex(): string;
    /**
     * Signs a message using ML-DSA.
     */
    sign(message: string | Uint8Array): Promise<string>;
    /**
     * Verifies a message signature using ML-DSA.
     */
    verify(message: string | Uint8Array, signature: string): Promise<boolean>;
    /**
     * Disposes the wallet account, securely erasing sensitive key material.
     */
    dispose(): void;
}
export {};
//# sourceMappingURL=wallet-account-mldsa.d.ts.map