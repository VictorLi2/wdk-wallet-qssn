/**
 * ML-DSA signing and verification utility.
 * Handles quantum-safe signatures using ML-DSA (FIPS 204).
 */
export class MLDSASigner {
    /**
     * Signs a message with an ML-DSA private key.
     *
     * @param {string | Uint8Array} message - The message to sign.
     * @param {Uint8Array} privateKey - The ML-DSA private key.
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87).
     * @returns {string} The signature as a hex string (0x-prefixed).
     */
    static sign(message: string | Uint8Array, privateKey: Uint8Array, securityLevel?: 44 | 65 | 87): string;
    /**
     * Verifies an ML-DSA signature.
     *
     * @param {string | Uint8Array} message - The original message.
     * @param {string | Uint8Array} signature - The signature (hex string or bytes).
     * @param {Uint8Array} publicKey - The ML-DSA public key.
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87).
     * @returns {boolean} True if the signature is valid, false otherwise.
     */
    static verify(message: string | Uint8Array, signature: string | Uint8Array, publicKey: Uint8Array, securityLevel?: 44 | 65 | 87): boolean;
    /**
     * Gets the expected signature size for a given security level.
     *
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
     * @returns {number} The signature size in bytes.
     */
    static getSignatureSize(securityLevel: 44 | 65 | 87): number;
    /**
     * Gets the expected public key size for a given security level.
     *
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
     * @returns {number} The public key size in bytes.
     */
    static getPublicKeySize(securityLevel: 44 | 65 | 87): number;
    /**
     * Gets the ML-DSA implementation for the specified security level.
     *
     * @private
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
     * @returns {Object} The ML-DSA implementation.
     */
    private static _getMLDSAImplementation;
}
