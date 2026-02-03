import { Provider } from "ethers";
import type { QssnWalletConfig } from "./types.js";
/**
 * Pure JavaScript read-only EVM wallet account.
 * Works in browsers, Node.js, and all JavaScript environments.
 */
export declare class WalletAccountReadOnlyEvm {
    protected _address: string;
    protected _config: Omit<QssnWalletConfig, "transferMaxFee">;
    protected _provider: Provider;
    constructor(address: string, config: Omit<QssnWalletConfig, "transferMaxFee">);
    /**
     * Get the native token balance (ETH/MATIC/etc)
     */
    getBalance(): Promise<bigint>;
    /**
     * Get ERC-20 token balance
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Get ERC-20 token allowance
     */
    getAllowance(token: string, spender: string): Promise<bigint>;
}
//# sourceMappingURL=wallet-account-read-only-evm.d.ts.map