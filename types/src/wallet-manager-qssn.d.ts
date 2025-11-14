/** @typedef {import('ethers').Provider} Provider */
/** @typedef {import('@tetherto/wdk-wallet-evm').FeeRates} FeeRates */
/** @typedef {import('./wallet-account-qssn.js').QssnWalletConfig} QssnWalletConfig */
export default class WalletManagerQssn extends WalletManagerEvm {
    /**
     * Creates a new quantum-safe wallet manager with dual-key (ECDSA + ML-DSA) support for ERC-4337.
     *
     * @param {string | Uint8Array} ecdsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase or seed bytes for ECDSA keys.
     * @param {string | Uint8Array} mldsaSeed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase or seed bytes for ML-DSA keys.
     * @param {QssnWalletConfig} config - The configuration object.
     */
    constructor(ecdsaSeed: string | Uint8Array, mldsaSeed: string | Uint8Array, config: QssnWalletConfig);
    _mldsaSeed: Uint8Array<ArrayBufferLike>;
    /**
     * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountQssn>} The account.
     */
    getAccount(index?: number): Promise<WalletAccountQssn>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @returns {Promise<WalletAccountQssn>} The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountQssn>;
}
export type Provider = import("ethers").Provider;
export type FeeRates = import("@tetherto/wdk-wallet-evm").FeeRates;
export type QssnWalletConfig = import("./wallet-account-qssn.js").QssnWalletConfig;
import WalletManagerEvm from '@tetherto/wdk-wallet-evm';
import WalletAccountQssn from './wallet-account-qssn.js';
