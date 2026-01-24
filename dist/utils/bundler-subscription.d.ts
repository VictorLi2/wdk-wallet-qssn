export interface WaitForUserOpOptions {
    /** Timeout in milliseconds (default: 60000 = 60 seconds) */
    timeoutMs?: number;
    /** Polling interval for fallback in milliseconds (default: 1000) */
    pollIntervalMs?: number;
}
export interface UserOpResult {
    success: boolean;
    txHash?: string;
    userOpHash: string;
    error?: string;
}
/**
 * Wait for a UserOperation to be confirmed on-chain.
 * Uses WebSocket subscription for real-time updates, with automatic fallback to HTTP polling.
 *
 * @param bundlerUrl - The bundler RPC URL (HTTP or WebSocket)
 * @param userOpHash - The UserOperation hash to wait for
 * @param options - Optional configuration
 * @returns Promise that resolves when the userOp is on-chain or fails
 */
export declare function waitForUserOp(bundlerUrl: string, userOpHash: string, options?: WaitForUserOpOptions): Promise<UserOpResult>;
//# sourceMappingURL=bundler-subscription.d.ts.map