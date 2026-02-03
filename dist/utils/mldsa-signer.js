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
import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
/**
 * ML-DSA signing and verification utility.
 * Handles quantum-safe signatures using ML-DSA (FIPS 204).
 */
export class MLDSASigner {
    /**
     * Signs a message with an ML-DSA private key.
     */
    static sign(message, privateKey, securityLevel = 65) {
        const mldsaImpl = this.getMLDSAImplementation(securityLevel);
        // Convert message to bytes
        const messageBytes = typeof message === "string" ? Buffer.from(message, "utf8") : message;
        // Sign with ML-DSA
        const signature = mldsaImpl.sign(messageBytes, privateKey);
        // Return as hex string
        return "0x" + Buffer.from(signature).toString("hex");
    }
    /**
     * Verifies an ML-DSA signature.
     */
    static verify(message, signature, publicKey, securityLevel = 65) {
        const mldsaImpl = this.getMLDSAImplementation(securityLevel);
        // Convert message to bytes
        const messageBytes = typeof message === "string" ? Buffer.from(message, "utf8") : message;
        // Convert signature to bytes (handle hex string)
        const signatureBytes = typeof signature === "string"
            ? Buffer.from(signature.slice(2), "hex")
            : signature;
        // Verify with ML-DSA
        return mldsaImpl.verify(signatureBytes, messageBytes, publicKey);
    }
    /**
     * Gets the expected signature size for a given security level.
     */
    static getSignatureSize(securityLevel) {
        switch (securityLevel) {
            case 44:
                return 2420;
            case 65:
                return 3309;
            case 87:
                return 4627;
            default:
                throw new Error(`Unsupported ML-DSA security level: ${securityLevel}`);
        }
    }
    /**
     * Gets the expected public key size for a given security level.
     */
    static getPublicKeySize(securityLevel) {
        switch (securityLevel) {
            case 44:
                return 1312;
            case 65:
                return 1952;
            case 87:
                return 2592;
            default:
                throw new Error(`Unsupported ML-DSA security level: ${securityLevel}`);
        }
    }
    /**
     * Gets the ML-DSA implementation for the specified security level.
     */
    static getMLDSAImplementation(securityLevel) {
        switch (securityLevel) {
            case 44:
                return ml_dsa44;
            case 65:
                return ml_dsa65;
            case 87:
                return ml_dsa87;
            default:
                throw new Error(`Unsupported ML-DSA security level: ${securityLevel}. Use 44, 65, or 87.`);
        }
    }
}
//# sourceMappingURL=mldsa-signer.js.map