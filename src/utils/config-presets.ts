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

import type {
  ChainPreset,
  QssnUserConfig,
  QssnWalletConfig,
} from "../types.js";

/**
 * Preset configurations for QSSN wallets by chain ID.
 * Users only need to provide chainId and provider - all other values are preset.
 */
export const QSSN_CONFIG_PRESETS: Record<number, ChainPreset> = {
  // Anvil Local Testnet
  31337: {
    bundlerUrl: "http://localhost:14337/rpc",
    entryPointAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    factoryAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  },
  // Sepolia Testnet
  11155111: {
    bundlerUrl: "https://qssn-bundler-v2-production.up.railway.app/rpc",
    entryPointAddress: "0x7cc6FDD8EDA901AE6a633C85c7C8819e777aE76B",
    factoryAddress: "0xBE6DC7D9Ac081efFaC77b80A337412b3DD6DcB18",
  },
};

/**
 * Gets the preset configuration for a given chain ID.
 */
export function getPresetConfig(chainId: number): ChainPreset {
  const preset = QSSN_CONFIG_PRESETS[chainId];

  if (!preset) {
    throw new Error(
      `No QSSN preset configuration found for chainId ${chainId}. ` +
        `Supported chains: ${Object.keys(QSSN_CONFIG_PRESETS).join(", ")}`
    );
  }

  return preset;
}

/**
 * Merges user config with preset configuration.
 * Required: chainId, provider
 * Optional: mldsaSecurityLevel, transferMaxFee, paymasterUrl, paymasterAddress, paymasterToken
 * Preset values (bundlerUrl, entryPointAddress, factoryAddress) cannot be overridden.
 */
export function createQssnConfig(userConfig: QssnUserConfig): QssnWalletConfig {
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

  const paymasterFieldsProvided = [
    hasPaymasterUrl,
    hasPaymasterAddress,
    hasPaymasterToken,
  ].filter(Boolean).length;

  if (paymasterFieldsProvided > 0 && paymasterFieldsProvided < 3) {
    const missing: string[] = [];
    if (!hasPaymasterUrl) missing.push("paymasterUrl");
    if (!hasPaymasterAddress) missing.push("paymasterAddress");
    if (!hasPaymasterToken) missing.push("paymasterToken");

    throw new Error(
      `Incomplete paymaster configuration. To use a paymaster, you must provide all three fields: ` +
        `paymasterUrl, paymasterAddress, and paymasterToken. Missing: ${missing.join(", ")}`
    );
  }

  const config: QssnWalletConfig = {
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
