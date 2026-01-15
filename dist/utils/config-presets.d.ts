import type { ChainPreset, QssnUserConfig, QssnWalletConfig } from "../types.js";
/**
 * Preset configurations for QSSN wallets by chain ID.
 * Users only need to provide chainId and provider - all other values are preset.
 */
export declare const QSSN_CONFIG_PRESETS: Record<number, ChainPreset>;
/**
 * Gets the preset configuration for a given chain ID.
 */
export declare function getPresetConfig(chainId: number): ChainPreset;
/**
 * Merges user config with preset configuration.
 * Required: chainId, provider
 * Optional: mldsaSecurityLevel, transferMaxFee, paymasterUrl, paymasterAddress, paymasterToken
 * Preset values (bundlerUrl, entryPointAddress, factoryAddress) cannot be overridden.
 */
export declare function createQssnConfig(userConfig: QssnUserConfig): QssnWalletConfig;
//# sourceMappingURL=config-presets.d.ts.map