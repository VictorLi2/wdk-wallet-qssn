import type { ChainPreset, QssnUserConfig, QssnWalletConfig } from "../types.js";
/**
 * Preset configurations for QSSN wallets by chain ID.
 * Users need to provide chainId, provider, and bundlerUrl - contract addresses are preset.
 */
export declare const QSSN_CONFIG_PRESETS: Record<number, ChainPreset>;
/**
 * Gets the preset configuration for a given chain ID.
 */
export declare function getPresetConfig(chainId: number): ChainPreset;
/**
 * Merges user config with preset configuration.
 * Required: chainId, provider, bundlerUrl
 * Optional: mldsaSecurityLevel, transferMaxFee, paymasterUrl, paymasterAddress, paymasterToken
 * Preset values (entryPointAddress, factoryAddress) cannot be overridden.
 */
export declare function createQssnConfig(userConfig: QssnUserConfig): QssnWalletConfig;
//# sourceMappingURL=config-presets.d.ts.map