/**
 * ML-DSA key derivation utility.
 * Derives ML-DSA keys using BIP32 HD key derivation with a custom path.
 */
export class MLDSAKeyDerivation {
    /**
     * Derives an ML-DSA key pair from a seed and BIP32 path.
     *
     * @param {Uint8Array | Buffer} seed - The seed for key derivation.
     * @param {string} path - BIP32 derivation path (e.g., "m/44'/9000'/65'/0'/0/0").
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level (44, 65, or 87).
     * @returns {{privateKey: Uint8Array, publicKey: Uint8Array}} The ML-DSA key pair.
     */
    static deriveKeyPair(seed: Uint8Array | Buffer, path: string, securityLevel?: 44 | 65 | 87): {
        privateKey: Uint8Array;
        publicKey: Uint8Array;
    };
    /**
     * Derives an Ethereum-style address from an ML-DSA public key.
     * Uses SHA3-256 hash of the public key, taking the last 20 bytes.
     *
     * @param {Uint8Array} publicKey - The ML-DSA public key.
     * @returns {string} The derived address (0x-prefixed hex string).
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
     *
     * @param {string} accountPath - Account path (e.g., "0'/0/0").
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
     * @returns {string} The full BIP32 path.
     */
    static getDerivationPath(accountPath: string, securityLevel?: 44 | 65 | 87): string;
    /**
     * Gets the ML-DSA implementation for the specified security level.
     *
     * @private
     * @param {44 | 65 | 87} securityLevel - ML-DSA security level.
     * @returns {Object} The ML-DSA implementation.
     */
    private static _getMLDSAImplementation;
}
