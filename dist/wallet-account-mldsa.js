// Copyright 2025 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { mnemonicToSeedSync } from "@scure/bip39";
import { MLDSAKeyDerivation } from "./utils/mldsa-key-derivation.js";
import { MLDSASigner } from "./utils/mldsa-signer.js";
/**
 * ML-DSA wallet account for post-quantum signatures
 */
export class WalletAccountMldsa {
    /**
     * Creates a new ML-DSA wallet account.
     */
    constructor(seed, path, config = {}) {
        this._path = path;
        this._config = config;
        // Convert mnemonic to seed if necessary
        const seedBytes = typeof seed === "string" ? mnemonicToSeedSync(seed) : seed;
        // Get security level from config (default to ML-DSA-65)
        this._securityLevel = config.securityLevel || 65;
        if (![44, 65, 87].includes(this._securityLevel)) {
            throw new Error(`Invalid security level: ${this._securityLevel}. Must be 44, 65, or 87.`);
        }
        // Generate full BIP32 path using the crypto module
        const fullPath = MLDSAKeyDerivation.getDerivationPath(path, this._securityLevel);
        // Derive ML-DSA key pair using the crypto module
        this._keyPair = MLDSAKeyDerivation.deriveKeyPair(seedBytes, fullPath, this._securityLevel);
    }
    /**
     * The derivation path of this account.
     */
    get path() {
        return this._path;
    }
    /**
     * The ML-DSA public key.
     */
    get publicKey() {
        if (!this._keyPair) {
            throw new Error("Account has been disposed");
        }
        return this._keyPair.publicKey;
    }
    /**
     * The ML-DSA public key as hex string.
     */
    get publicKeyHex() {
        return "0x" + Buffer.from(this.publicKey).toString("hex");
    }
    /**
     * Signs a message using ML-DSA.
     */
    async sign(message) {
        if (!this._keyPair) {
            throw new Error("Account has been disposed");
        }
        return MLDSASigner.sign(message, this._keyPair.privateKey, this._securityLevel);
    }
    /**
     * Verifies a message signature using ML-DSA.
     */
    async verify(message, signature) {
        if (!this._keyPair) {
            throw new Error("Account has been disposed");
        }
        return MLDSASigner.verify(message, signature, this._keyPair.publicKey, this._securityLevel);
    }
    /**
     * Disposes the wallet account, securely erasing sensitive key material.
     */
    dispose() {
        if (this._keyPair) {
            if (this._keyPair.privateKey) {
                this._keyPair.privateKey.fill(0);
            }
            if (this._keyPair.publicKey) {
                this._keyPair.publicKey.fill(0);
            }
            this._keyPair = null;
        }
    }
}
//# sourceMappingURL=wallet-account-mldsa.js.map