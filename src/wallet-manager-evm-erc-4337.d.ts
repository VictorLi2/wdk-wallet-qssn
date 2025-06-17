export default class WalletManagerEvmErc4337 {
    /**
     * Creates a new wallet manager that implements the ERC-4337 standard and its account abstraction features for EVM blockchains.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {EvmErc4337WalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, config?: EvmErc4337WalletConfig);
    /**
     * The evm erc-4337 wallet configuration.
     *
     * @protected
     * @type {EvmErc4337WalletConfig}
     */
    protected _config: EvmErc4337WalletConfig;
    /**
     * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountEvmErc4337>} The account.
     */
    getAccount(index?: number): Promise<WalletAccountEvmErc4337>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @returns {Promise<WalletAccountEvmErc4337>} The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountEvmErc4337>;
}
export type EvmErc4337WalletConfig = import("./wallet-account-evm-erc-4337.js").EvmErc4337WalletConfig;
import WalletAccountEvmErc4337 from './wallet-account-evm-erc-4337.js';
