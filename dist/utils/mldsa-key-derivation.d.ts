import type { MLDSASecurityLevel, MLDSAKeyPair } from "../types.js";
import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
type MLDSAImpl = typeof ml_dsa44 | typeof ml_dsa65 | typeof ml_dsa87;
/**
 * ML-DSA key derivation utility.
 * Derives ML-DSA keys using BIP32 HD key derivation with a custom path.
 */
export declare class MLDSAKeyDerivation {
    /**
     * Derives an ML-DSA key pair from a seed and BIP32 path.
     */
    static deriveKeyPair(seed: Uint8Array, path: string, securityLevel?: MLDSASecurityLevel): MLDSAKeyPair;
    /**
     * Derives an Ethereum-style address from an ML-DSA public key.
     * Uses SHA3-256 hash of the public key, taking the last 20 bytes.
     */
    static deriveAddress(publicKey: Uint8Array): string;
    /**
     * Generates a BIP32 derivation path for ML-DSA keys.
     *
     * Path format: m/44'/9000'/securityLevel'/account'/0/addressIndex
     * - 44': BIP44 standard
     * - 9000': Custom coin type for ML-DSA
     * - securityLevel': 44, 65, or 87
     * - account': Account index
     * - 0: External chain (not change)
     * - addressIndex: Address index
     */
    static getDerivationPath(accountPath: string, securityLevel?: MLDSASecurityLevel): string;
    /**
     * Gets the ML-DSA implementation for the specified security level.
     */
    static getMLDSAImplementation(securityLevel: MLDSASecurityLevel): MLDSAImpl;
}
export {};
//# sourceMappingURL=mldsa-key-derivation.d.ts.map