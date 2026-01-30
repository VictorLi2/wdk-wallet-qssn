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
import { ethers, HDNodeWallet, JsonRpcProvider, Mnemonic } from "ethers";
/**
 * Pure JavaScript EVM wallet account using only ethers.js
 * This replaces @tetherto/wdk-wallet-evm to avoid sodium-universal dependency.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export class WalletAccountEvmJs {
	constructor(seed, path, config) {
		// Parse the path to extract the index
		const pathParts = path.split("/");
		this._index = Number.parseInt(pathParts[pathParts.length - 1].replace("'", ""), 10);
		this._path = path;
		this._config = config;
		// Create full BIP-44 path
		const fullPath = `m/44'/60'/${path}`;
		// Derive wallet from seed
		// For mnemonic: convert to seed bytes first to get master node at depth 0
		// For seed bytes: fromSeed gives master node, then derive full path
		const seedBytes = typeof seed === "string" ? Mnemonic.fromPhrase(seed).computeSeed() : seed;
		this._wallet = HDNodeWallet.fromSeed(seedBytes).derivePath(fullPath);
		this._address = this._wallet.address;
		// Setup provider if available
		if (config.provider) {
			if (typeof config.provider === "string") {
				this._provider = new JsonRpcProvider(config.provider);
			} else {
				this._provider = new ethers.BrowserProvider(config.provider);
			}
			this._wallet = this._wallet.connect(this._provider);
		} else {
			this._provider = null;
		}
	}
	/**
	 * The derivation path's index of this account.
	 */
	get index() {
		return this._index;
	}
	/**
	 * The derivation path of this account.
	 */
	get path() {
		return this._path;
	}
	/**
	 * The account's key pair (address and private key).
	 */
	get keyPair() {
		return {
			address: this._wallet.address,
			privateKey: this._wallet.privateKey,
		};
	}
	/**
	 * Get the account's address.
	 */
	async getAddress() {
		return this._wallet.address;
	}
	/**
	 * Signs a message with ECDSA (Ethereum Signed Message format).
	 */
	async sign(message) {
		return await this._wallet.signMessage(message);
	}
	/**
	 * Verifies a signature against a message.
	 */
	async verify(message, signature) {
		try {
			const recoveredAddress = ethers.verifyMessage(message, signature);
			return recoveredAddress.toLowerCase() === this._wallet.address.toLowerCase();
		} catch {
			return false;
		}
	}
	/**
	 * Clean up resources.
	 */
	dispose() {
		// In the browser, we don't need to zero out memory
		// This is here for API compatibility
	}
	/**
	 * Static helper to build a transfer transaction.
	 */
	static _getTransferTransaction(options) {
		const { to, amount, token } = options;
		if (token) {
			// ERC-20 transfer
			const iface = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
			return {
				to: token,
				value: 0,
				data: iface.encodeFunctionData("transfer", [to, amount]),
			};
		}
		// Native ETH transfer
		return {
			to,
			value: amount,
			data: "0x",
		};
	}
}
// Alias for compatibility
export { WalletAccountEvmJs as WalletAccountEvm };
//# sourceMappingURL=wallet-account-evm.js.map
