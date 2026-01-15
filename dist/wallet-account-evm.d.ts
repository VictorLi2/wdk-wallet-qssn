import { Provider } from "ethers";
import type { KeyPair, QssnWalletConfig } from "./types.js";
/**
 * Pure JavaScript EVM wallet account using only ethers.js
 * This replaces @tetherto/wdk-wallet-evm to avoid sodium-universal dependency.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export declare class WalletAccountEvmJs {
    _address: string;
    _provider: Provider | null;
    private _index;
    private _path;
    private _config;
    private _wallet;
    constructor(seed: string | Uint8Array, path: string, config: QssnWalletConfig);
    /**
     * The derivation path's index of this account.
     */
    get index(): number;
    /**
     * The derivation path of this account.
     */
    get path(): string;
    /**
     * The account's key pair (address and private key).
     */
    get keyPair(): KeyPair;
    /**
     * Get the account's address.
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message with ECDSA (Ethereum Signed Message format).
     */
    sign(message: string): Promise<string>;
    /**
     * Verifies a signature against a message.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Clean up resources.
     */
    dispose(): void;
    /**
     * Static helper to build a transfer transaction.
     */
    static _getTransferTransaction(options: {
        to: string;
        amount: bigint | number;
        token?: string;
    }): {
        to: string;
        value: bigint | number;
        data: string;
    };
}
export { WalletAccountEvmJs as WalletAccountEvm };
//# sourceMappingURL=wallet-account-evm.d.ts.map