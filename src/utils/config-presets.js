// Copyright 2024 Tether Operations Limited
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

"use strict";

/**
 * Preset configurations for QSSN wallets by chain ID.
 * Users only need to provide chainId and provider - all other values are preset.
 */
export const QSSN_CONFIG_PRESETS = {
	// Anvil Local Testnet
	31337: {
		bundlerUrl: "http://localhost:14337/rpc",
		entryPointAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
		factoryAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
	},
	// Add more chain presets as you deploy to other networks:
	// 1: { // Ethereum Mainnet
	//   bundlerUrl: 'https://bundler.qssn.io/mainnet',
	//   entryPointAddress: '0x...',
	//   factoryAddress: '0x...'
	// },
	// 11155111: { // Sepolia
	//   bundlerUrl: 'https://bundler.qssn.io/sepolia',
	//   entryPointAddress: '0x...',
	//   factoryAddress: '0x...'
	// }
};

/**
 * Gets the preset configuration for a given chain ID.
 * @param {number} chainId - The chain ID
 * @returns {Object} The preset configuration
 * @throws {Error} If no preset exists for the chain ID
 */
export function getPresetConfig(chainId) {
	const preset = QSSN_CONFIG_PRESETS[chainId];

	if (!preset) {
		throw new Error(
			`No QSSN preset configuration found for chainId ${chainId}. ` +
				`Supported chains: ${Object.keys(QSSN_CONFIG_PRESETS).join(", ")}`,
		);
	}

	return preset;
}

/**
 * Merges user config with preset configuration.
 * Required: chainId, provider
 * Optional: mldsaSecurityLevel, transferMaxFee, paymasterUrl, paymasterAddress, paymasterToken
 * Preset values (bundlerUrl, entryPointAddress, factoryAddress) cannot be overridden.
 *
 * @param {Object} userConfig - User-provided configuration
 * @param {number} userConfig.chainId - The blockchain's id
 * @param {string | Object} userConfig.provider - RPC provider URL or EIP-1193 provider
 * @param {number} [userConfig.mldsaSecurityLevel] - ML-DSA security level (44, 65, or 87)
 * @param {number | bigint} [userConfig.transferMaxFee] - Maximum fee for transfers
 * @param {string} [userConfig.paymasterUrl] - The url of the paymaster service (optional, for future gas sponsorship)
 * @param {string} [userConfig.paymasterAddress] - The address of the paymaster smart contract (optional, for future gas sponsorship)
 * @param {Object} [userConfig.paymasterToken] - The paymaster token configuration (optional, for future gas sponsorship)
 * @param {string} [userConfig.paymasterToken.address] - The address of the paymaster token
 * @returns {Object} Complete configuration with presets applied
 */
export function createQssnConfig(userConfig) {
	if (!userConfig.chainId) {
		throw new Error("chainId is required in config");
	}

	if (!userConfig.provider) {
		throw new Error("provider is required in config");
	}

	const preset = getPresetConfig(userConfig.chainId);

	// Validate paymaster configuration - all or none must be provided
	const hasPaymasterUrl = !!userConfig.paymasterUrl;
	const hasPaymasterAddress = !!userConfig.paymasterAddress;
	const hasPaymasterToken = !!userConfig.paymasterToken;

	const paymasterFieldsProvided = [hasPaymasterUrl, hasPaymasterAddress, hasPaymasterToken].filter(Boolean).length;

	if (paymasterFieldsProvided > 0 && paymasterFieldsProvided < 3) {
		const missing = [];
		if (!hasPaymasterUrl) missing.push("paymasterUrl");
		if (!hasPaymasterAddress) missing.push("paymasterAddress");
		if (!hasPaymasterToken) missing.push("paymasterToken");

		throw new Error(
			`Incomplete paymaster configuration. To use a paymaster, you must provide all three fields: ` +
				`paymasterUrl, paymasterAddress, and paymasterToken. Missing: ${missing.join(", ")}`,
		);
	}

	const config = {
		chainId: userConfig.chainId,
		provider: userConfig.provider,
		bundlerUrl: preset.bundlerUrl,
		entryPointAddress: preset.entryPointAddress,
		factoryAddress: preset.factoryAddress,
		mldsaSecurityLevel: userConfig.mldsaSecurityLevel,
		transferMaxFee: userConfig.transferMaxFee,
	};

	// Add paymaster configuration if all fields are provided
	if (paymasterFieldsProvided === 3) {
		config.paymasterUrl = userConfig.paymasterUrl;
		config.paymasterAddress = userConfig.paymasterAddress;
		config.paymasterToken = userConfig.paymasterToken;
	}

	return config;
}
