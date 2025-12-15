/**
 * Gets the preset configuration for a given chain ID.
 * @param {number} chainId - The chain ID
 * @returns {Object} The preset configuration
 * @throws {Error} If no preset exists for the chain ID
 */
export function getPresetConfig(chainId: number): any;
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
export function createQssnConfig(userConfig: {
    chainId: number;
    provider: string | any;
    mldsaSecurityLevel?: number;
    transferMaxFee?: number | bigint;
    paymasterUrl?: string;
    paymasterAddress?: string;
    paymasterToken?: {
        address?: string;
    };
}): any;
/**
 * Preset configurations for QSSN wallets by chain ID.
 * Users only need to provide chainId and provider - all other values are preset.
 */
export const QSSN_CONFIG_PRESETS: {
    31337: {
        bundlerUrl: string;
        entryPointAddress: string;
        factoryAddress: string;
    };
};
