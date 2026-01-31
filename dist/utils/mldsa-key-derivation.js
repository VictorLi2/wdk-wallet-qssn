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
import { sha3_256 } from "@noble/hashes/sha3";
import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa.js";
import { HDKey } from "@scure/bip32";
/**
 * ML-DSA key derivation utility.
 * Derives ML-DSA keys using BIP32 HD key derivation with a custom path.
 */
export class MLDSAKeyDerivation {
	/**
	 * Derives an ML-DSA key pair from a seed and BIP32 path.
	 */
	static deriveKeyPair(seed, path, securityLevel = 65) {
		// Derive HD key using BIP32
		const hdKey = HDKey.fromMasterSeed(seed);
		const derivedKey = hdKey.derive(path);
		if (!derivedKey.privateKey) {
			throw new Error("Failed to derive private key from path");
		}
		// Get 32-byte seed for ML-DSA key generation
		const mldsaSeed = derivedKey.privateKey.slice(0, 32);
		// Select ML-DSA implementation based on security level
		const mldsaImpl = MLDSAKeyDerivation.getMLDSAImplementation(securityLevel);
		// Generate ML-DSA key pair from seed
		const keyPair = mldsaImpl.keygen(mldsaSeed);
		return {
			privateKey: keyPair.secretKey,
			publicKey: keyPair.publicKey,
		};
	}
	/**
	 * Derives an Ethereum-style address from an ML-DSA public key.
	 * Uses SHA3-256 hash of the public key, taking the last 20 bytes.
	 */
	static deriveAddress(publicKey) {
		const hash = sha3_256(publicKey);
		const addressBytes = hash.slice(-20);
		return "0x" + Buffer.from(addressBytes).toString("hex");
	}
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
	static getDerivationPath(accountPath, securityLevel = 65) {
		return `m/44'/9000'/${securityLevel}'/${accountPath}`;
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
//# sourceMappingURL=mldsa-key-derivation.js.map
