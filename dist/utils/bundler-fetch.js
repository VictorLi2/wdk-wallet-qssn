// Copyright 2025 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { BundlerTimeoutError } from "../errors.js";

/**
 * Check if an error is retryable (network errors, timeouts).
 */
function isRetryableError(error) {
	// Check for AbortError (timeout)
	if (error.name === "AbortError") {
		return true;
	}
	// Check for network errors
	const message = error.message.toLowerCase();
	return (
		message.includes("econnrefused") ||
		message.includes("etimedout") ||
		message.includes("enotfound") ||
		message.includes("fetch failed")
	);
}
/**
 * Check if an HTTP status or JSON-RPC error is retryable.
 * @param httpStatus - HTTP status code (or null if checking RPC error)
 * @param rpcErrorMessage - JSON-RPC error message (or null if checking HTTP status)
 */
function isRetryableResponse(httpStatus, rpcErrorMessage) {
	// Check HTTP status codes
	if (httpStatus !== null) {
		// Don't retry 4xx client errors
		if (httpStatus >= 400 && httpStatus < 500) {
			return false;
		}
		// Retry 5xx server errors
		if (httpStatus >= 500 && httpStatus < 600) {
			return true;
		}
	}
	// Check JSON-RPC error messages for AA error codes
	if (rpcErrorMessage !== null) {
		// Don't retry AA10-AA49 (validation errors)
		if (/AA[1-4]\d/.test(rpcErrorMessage)) {
			return false;
		}
		// Don't retry AA50+ (funding errors)
		if (/AA[5-9]\d/.test(rpcErrorMessage) || /AA\d{3}/.test(rpcErrorMessage)) {
			return false;
		}
		// Retry other bundler errors (internal errors)
		return true;
	}
	return false;
}
/**
 * Fetch wrapper with timeout and retry logic for bundler RPC calls.
 *
 * @param options - Configuration options for the fetch operation
 * @returns Promise resolving to the RPC result
 * @throws {BundlerTimeoutError} When all retry attempts are exhausted
 */
export async function bundlerFetch(options) {
	const timeout = options.timeout ?? 30000;
	const maxRetries = options.retries ?? 3;
	let lastError;
	let attempts = 0;
	while (attempts <= maxRetries) {
		attempts++;
		// Create AbortController for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);
		try {
			const response = await fetch(options.bundlerUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: options.method,
					params: options.params,
				}),
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			// Check HTTP status
			if (!response.ok) {
				const httpError = new Error(`HTTP ${response.status}`);
				if (!isRetryableResponse(response.status, null)) {
					throw httpError;
				}
				lastError = httpError;
				// Will retry below
			} else {
				// Parse JSON-RPC response
				const result = await response.json();
				if (result.error) {
					const rpcError = new Error(`Bundler error: ${result.error.message}`);
					if (!isRetryableResponse(null, result.error.message)) {
						throw rpcError;
					}
					lastError = rpcError;
					// Will retry below
				} else {
					return result.result;
				}
			}
		} catch (fetchError) {
			clearTimeout(timeoutId);
			if (fetchError instanceof Error) {
				if (!isRetryableError(fetchError)) {
					throw fetchError;
				}
				lastError = fetchError;
			}
		}
		// If we get here, need to retry
		if (attempts <= maxRetries) {
			// Call retry callback
			if (options.onRetry && lastError) {
				options.onRetry(attempts, lastError);
			}
			// Exponential backoff: 1s, 2s, 4s
			const delay = 1000 * 2 ** (attempts - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
	// After loop exhausted, throw BundlerTimeoutError
	throw new BundlerTimeoutError(options.method, attempts, lastError);
}
//# sourceMappingURL=bundler-fetch.js.map
