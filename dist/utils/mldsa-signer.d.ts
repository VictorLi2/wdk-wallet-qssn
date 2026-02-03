import type { MLDSASecurityLevel } from "../types.js";
/**
 * ML-DSA signing and verification utility.
 * Handles quantum-safe signatures using ML-DSA (FIPS 204).
 */
export declare class MLDSASigner {
    /**
     * Signs a message with an ML-DSA private key.
     */
    static sign(message: string | Uint8Array, privateKey: Uint8Array, securityLevel?: MLDSASecurityLevel): string;
    /**
     * Verifies an ML-DSA signature.
     */
    static verify(message: string | Uint8Array, signature: string | Uint8Array, publicKey: Uint8Array, securityLevel?: MLDSASecurityLevel): boolean;
    /**
     * Gets the expected signature size for a given security level.
     */
    static getSignatureSize(securityLevel: MLDSASecurityLevel): number;
    /**
     * Gets the expected public key size for a given security level.
     */
    static getPublicKeySize(securityLevel: MLDSASecurityLevel): number;
    /**
     * Gets the ML-DSA implementation for the specified security level.
     */
    private static getMLDSAImplementation;
}
//# sourceMappingURL=mldsa-signer.d.ts.map