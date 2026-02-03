import type { Provider } from "ethers";
import { WalletAccountQssn } from "./wallet-account-qssn.js";
import type { QssnUserConfig, QssnWalletConfig, FeeRates } from "./types.js";
/**
 * Quantum-safe wallet manager with dual-key (ECDSA + ML-DSA) support for ERC-4337.
 */
export declare class WalletManagerQssn {
    /**
     * The ECDSA seed (mnemonic string or seed bytes).
     */
    seed: string | Uint8Array;
    /**
     * The ML-DSA seed (mnemonic string or seed bytes).
     */
    mldsaSeed: string | Uint8Array;
    protected _config: QssnWalletConfig;
    protected _provider: Provider | undefined;
    protected _accounts: Record<string, WalletAccountQssn>;
    /**
     * Creates a new quantum-safe wallet manager with dual-key (ECDSA + ML-DSA) support for ERC-4337.
     * entryPointAddress is automatically set based on chainId. walletFactoryAddress uses preset or user override.
     *
     * @param ecdsaSeed - The wallet's BIP-39 seed phrase or seed bytes for ECDSA keys.
     * @param mldsaSeed - The wallet's BIP-39 seed phrase or seed bytes for ML-DSA keys.
     * @param userConfig - The configuration object (chainId and provider required, presets applied automatically).
     */
    constructor(ecdsaSeed: string | Uint8Array, mldsaSeed: string | Uint8Array, userConfig: QssnUserConfig);
    /**
     * Returns the wallet account at a specific index (see BIP-44).
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccount(1);
     *
     * @param index - The index of the account to get (default: 0).
     * @returns The account.
     */
    getAccount(index?: number): Promise<WalletAccountQssn>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/60'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     *
     * @param path - The derivation path (e.g. "0'/0/0").
     * @returns The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountQssn>;
    /**
     * Returns the current fee rates.
     *
     * @returns The fee rates (in weis).
     */
    getFeeRates(): Promise<FeeRates>;
    /**
     * Disposes the wallet manager and all derived accounts.
     */
    dispose(): void;
}
//# sourceMappingURL=wallet-manager-qssn.d.ts.map