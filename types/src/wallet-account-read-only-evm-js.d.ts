/**
 * Pure JavaScript read-only EVM wallet account
 * This replaces @tetherto/wdk-wallet-evm WalletAccountReadOnlyEvm.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export class WalletAccountReadOnlyEvmJs {
    /**
     * @param {string} address - The Ethereum address
     * @param {Object} config - Configuration with provider
     */
    constructor(address: string, config: any);
    _address: string;
    _config: any;
    _provider: any;
    /**
     * Get the native token balance (ETH/MATIC/etc)
     * @returns {Promise<bigint>}
     */
    getBalance(): Promise<bigint>;
    /**
     * Get ERC-20 token balance
     * @param {string} tokenAddress - The token contract address
     * @returns {Promise<bigint>}
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Get ERC-20 token allowance
     * @param {string} token - The token contract address
     * @param {string} spender - The spender address
     * @returns {Promise<bigint>}
     */
    getAllowance(token: string, spender: string): Promise<bigint>;
}
