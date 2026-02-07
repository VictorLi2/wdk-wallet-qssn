/**
 * Options for bundler fetch operations with timeout and retry logic.
 */
export interface BundlerFetchOptions {
	/** The bundler RPC URL */
	bundlerUrl: string;
	/** The JSON-RPC method name */
	method: string;
	/** The parameters for the JSON-RPC call */
	params: unknown[];
	/** Timeout in milliseconds (default: 30000) */
	timeout?: number;
	/** Number of retry attempts (default: 3) */
	retries?: number;
	/** Optional callback invoked before each retry attempt */
	onRetry?: (attempt: number, error: Error) => void;
}
/**
 * Fetch wrapper with timeout and retry logic for bundler RPC calls.
 *
 * @param options - Configuration options for the fetch operation
 * @returns Promise resolving to the RPC result
 * @throws {BundlerTimeoutError} When all retry attempts are exhausted
 */
export declare function bundlerFetch<T>(options: BundlerFetchOptions): Promise<T>;
//# sourceMappingURL=bundler-fetch.d.ts.map
