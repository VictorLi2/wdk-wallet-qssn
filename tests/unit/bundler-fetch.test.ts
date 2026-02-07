/**
 * Unit tests for bundlerFetch timeout and retry logic
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BundlerTimeoutError } from "../../src/errors.js";
import { bundlerFetch } from "../../src/utils/bundler-fetch.js";

describe("bundlerFetch", () => {
	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
		vi.unstubAllGlobals();
	});

	afterEach(() => {
		// Clean up timers
		vi.useRealTimers();
	});

	describe("successful request", () => {
		it("should return result when request succeeds on first attempt", async () => {
			const mockResult = { callGasLimit: "100000" };
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					jsonrpc: "2.0",
					id: 1,
					result: mockResult,
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const result = await bundlerFetch({
				bundlerUrl: "http://localhost:4337",
				method: "eth_estimateUserOperationGas",
				params: [{}, "0x123"],
			});

			expect(result).toEqual(mockResult);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});
	});

	describe("timeout on all retries", () => {
		it("should throw BundlerTimeoutError when all retries timeout", async () => {
			// Use AbortError to simulate timeout instead of never resolving
			const mockFetch = vi
				.fn()
				.mockRejectedValue(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }));
			vi.stubGlobal("fetch", mockFetch);

			await expect(
				bundlerFetch({
					bundlerUrl: "http://localhost:4337",
					method: "eth_sendUserOperation",
					params: [{}, "0x123"],
					timeout: 100,
					retries: 2,
				}),
			).rejects.toThrow(BundlerTimeoutError);

			// Should have tried 3 times (initial + 2 retries)
			expect(mockFetch).toHaveBeenCalledTimes(3);

			// Verify error properties
			try {
				await bundlerFetch({
					bundlerUrl: "http://localhost:4337",
					method: "eth_sendUserOperation",
					params: [{}, "0x123"],
					timeout: 100,
					retries: 2,
				});
			} catch (error) {
				expect(error).toBeInstanceOf(BundlerTimeoutError);
				if (error instanceof BundlerTimeoutError) {
					expect(error.method).toBe("eth_sendUserOperation");
					expect(error.attempts).toBe(3);
				}
			}
		});
	});

	describe("retry then success", () => {
		it("should succeed after transient failures", async () => {
			vi.useFakeTimers();

			let attemptCount = 0;
			const mockFetch = vi.fn().mockImplementation(() => {
				attemptCount++;
				if (attemptCount <= 2) {
					// First 2 attempts fail with network error
					return Promise.reject(new TypeError("fetch failed"));
				}
				// 3rd attempt succeeds
				return Promise.resolve({
					ok: true,
					json: async () => ({
						jsonrpc: "2.0",
						id: 1,
						result: { success: true },
					}),
				});
			});
			vi.stubGlobal("fetch", mockFetch);

			const onRetry = vi.fn();

			const promise = bundlerFetch({
				bundlerUrl: "http://localhost:4337",
				method: "eth_sendUserOperation",
				params: [{}, "0x123"],
				onRetry,
			});

			// Advance timers through retry delays
			await vi.advanceTimersByTimeAsync(1000); // First retry delay
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay

			const result = await promise;

			expect(result).toEqual({ success: true });
			expect(mockFetch).toHaveBeenCalledTimes(3);
			expect(onRetry).toHaveBeenCalledTimes(2);
			expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
			expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
		});
	});

	describe("non-retryable errors", () => {
		it("should not retry HTTP 4xx errors", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 400,
				json: async () => ({
					jsonrpc: "2.0",
					id: 1,
					error: {
						code: -32602,
						message: "Invalid params",
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const onRetry = vi.fn();

			await expect(
				bundlerFetch({
					bundlerUrl: "http://localhost:4337",
					method: "eth_sendUserOperation",
					params: [{}, "0x123"],
					onRetry,
				}),
			).rejects.toThrow("HTTP 400");

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(onRetry).not.toHaveBeenCalled();
		});

		it("should not retry AA10-AA49 validation errors", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					jsonrpc: "2.0",
					id: 1,
					error: {
						code: -32500,
						message: "AA25: invalid account nonce",
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const onRetry = vi.fn();

			await expect(
				bundlerFetch({
					bundlerUrl: "http://localhost:4337",
					method: "eth_sendUserOperation",
					params: [{}, "0x123"],
					onRetry,
				}),
			).rejects.toThrow("AA25");

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(onRetry).not.toHaveBeenCalled();
		});

		it("should not retry AA50+ funding errors", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					jsonrpc: "2.0",
					id: 1,
					error: {
						code: -32500,
						message: "AA51: prefund below expectedGasCost",
					},
				}),
			});
			vi.stubGlobal("fetch", mockFetch);

			const onRetry = vi.fn();

			await expect(
				bundlerFetch({
					bundlerUrl: "http://localhost:4337",
					method: "eth_sendUserOperation",
					params: [{}, "0x123"],
					onRetry,
				}),
			).rejects.toThrow("AA51");

			expect(mockFetch).toHaveBeenCalledTimes(1);
			expect(onRetry).not.toHaveBeenCalled();
		});
	});

	describe("callback invocation", () => {
		it("should call onRetry with correct arguments", async () => {
			vi.useFakeTimers();

			let attemptCount = 0;
			const mockFetch = vi.fn().mockImplementation(() => {
				attemptCount++;
				if (attemptCount <= 2) {
					return Promise.reject(new TypeError("fetch failed"));
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({
						jsonrpc: "2.0",
						id: 1,
						result: { success: true },
					}),
				});
			});
			vi.stubGlobal("fetch", mockFetch);

			const onRetry = vi.fn();

			const promise = bundlerFetch({
				bundlerUrl: "http://localhost:4337",
				method: "eth_sendUserOperation",
				params: [{}, "0x123"],
				onRetry,
			});

			// Advance timers through retry delays
			await vi.advanceTimersByTimeAsync(1000); // First retry delay
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay

			await promise;

			// Verify callback was called with correct attempt numbers and errors
			expect(onRetry).toHaveBeenCalledTimes(2);
			expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(TypeError));
			expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(TypeError));

			// Verify the error messages
			const firstError = onRetry.mock.calls[0][1] as Error;
			const secondError = onRetry.mock.calls[1][1] as Error;
			expect(firstError.message).toBe("fetch failed");
			expect(secondError.message).toBe("fetch failed");
		});
	});

	describe("retryable scenarios", () => {
		it("should retry HTTP 5xx responses", async () => {
			vi.useFakeTimers();

			let attemptCount = 0;
			const mockFetch = vi.fn().mockImplementation(() => {
				attemptCount++;
				if (attemptCount <= 2) {
					return Promise.resolve({
						ok: false,
						status: 500,
						json: async () => ({
							jsonrpc: "2.0",
							id: 1,
							error: {
								code: -32603,
								message: "Internal error",
							},
						}),
					});
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({
						jsonrpc: "2.0",
						id: 1,
						result: { success: true },
					}),
				});
			});
			vi.stubGlobal("fetch", mockFetch);

			const promise = bundlerFetch({
				bundlerUrl: "http://localhost:4337",
				method: "eth_sendUserOperation",
				params: [{}, "0x123"],
			});

			// Advance timers through retry delays
			await vi.advanceTimersByTimeAsync(1000); // First retry delay
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay

			const result = await promise;

			expect(result).toEqual({ success: true });
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});

		it("should retry network errors (ECONNREFUSED pattern)", async () => {
			vi.useFakeTimers();

			let attemptCount = 0;
			const mockFetch = vi.fn().mockImplementation(() => {
				attemptCount++;
				if (attemptCount <= 2) {
					const error = new TypeError("fetch failed");
					// Simulate ECONNREFUSED by adding it to the error message
					Object.defineProperty(error, "message", {
						value: "fetch failed: ECONNREFUSED",
					});
					return Promise.reject(error);
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({
						jsonrpc: "2.0",
						id: 1,
						result: { success: true },
					}),
				});
			});
			vi.stubGlobal("fetch", mockFetch);

			const promise = bundlerFetch({
				bundlerUrl: "http://localhost:4337",
				method: "eth_sendUserOperation",
				params: [{}, "0x123"],
			});

			// Advance timers through retry delays
			await vi.advanceTimersByTimeAsync(1000); // First retry delay
			await vi.advanceTimersByTimeAsync(2000); // Second retry delay

			const result = await promise;

			expect(result).toEqual({ success: true });
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});
	});

	describe("exponential backoff timing", () => {
		it("should verify delays are 1000ms, 2000ms, 4000ms between retries", async () => {
			vi.useFakeTimers();

			let attemptCount = 0;
			const attemptTimes: number[] = [];

			const mockFetch = vi.fn().mockImplementation(() => {
				attemptCount++;
				attemptTimes.push(Date.now());

				if (attemptCount <= 3) {
					return Promise.reject(new TypeError("fetch failed"));
				}
				return Promise.resolve({
					ok: true,
					json: async () => ({
						jsonrpc: "2.0",
						id: 1,
						result: { success: true },
					}),
				});
			});
			vi.stubGlobal("fetch", mockFetch);

			const promise = bundlerFetch({
				bundlerUrl: "http://localhost:4337",
				method: "eth_sendUserOperation",
				params: [{}, "0x123"],
			});

			// Let initial attempt execute
			await vi.waitFor(() => attemptCount === 1);

			// Verify first retry delay (1000ms)
			await vi.advanceTimersByTimeAsync(1000);
			await vi.waitFor(() => attemptCount === 2);

			// Verify second retry delay (2000ms)
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => attemptCount === 3);

			// Verify third retry delay (4000ms)
			await vi.advanceTimersByTimeAsync(4000);
			await vi.waitFor(() => attemptCount === 4);

			await promise;

			// Verify the timing between attempts matches exponential backoff (with tolerance for timer precision)
			expect(attemptTimes).toHaveLength(4);
			expect(attemptTimes[1] - attemptTimes[0]).toBeGreaterThanOrEqual(1000); // 1s delay
			expect(attemptTimes[1] - attemptTimes[0]).toBeLessThan(1100); // Allow 100ms tolerance
			expect(attemptTimes[2] - attemptTimes[1]).toBeGreaterThanOrEqual(2000); // 2s delay
			expect(attemptTimes[2] - attemptTimes[1]).toBeLessThan(2100); // Allow 100ms tolerance
			expect(attemptTimes[3] - attemptTimes[2]).toBeGreaterThanOrEqual(4000); // 4s delay
			expect(attemptTimes[3] - attemptTimes[2]).toBeLessThan(4100); // Allow 100ms tolerance
		});
	});
});
