/**
 * Error thrown when all bundler retry attempts are exhausted due to timeout or repeated failures.
 */
export declare class BundlerTimeoutError extends Error {
	lastError: Error | undefined;
	attempts: number;
	method: string;
	constructor(method: string, attempts: number, lastError?: Error);
}
/**
 * Error thrown for network-level bundler failures.
 */
export declare class BundlerNetworkError extends Error {
	cause: Error | undefined;
	constructor(message: string, cause?: Error);
}
//# sourceMappingURL=errors.d.ts.map
