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
/**
 * Wait for a UserOperation to be confirmed on-chain.
 * Uses WebSocket subscription for real-time updates, with automatic fallback to HTTP polling.
 *
 * @param bundlerUrl - The bundler RPC URL (HTTP or WebSocket)
 * @param userOpHash - The UserOperation hash to wait for
 * @param options - Optional configuration
 * @returns Promise that resolves when the userOp is on-chain or fails
 */
export async function waitForUserOp(bundlerUrl, userOpHash, options = {}) {
	const { timeoutMs = 60000, pollIntervalMs = 1000 } = options;
	// Try WebSocket first, fall back to polling if it fails
	try {
		return await waitForUserOpViaWebSocket(bundlerUrl, userOpHash, timeoutMs);
	} catch (wsError) {
		console.warn(
			"[waitForUserOp] WebSocket subscription failed, falling back to polling:",
			wsError instanceof Error ? wsError.message : wsError,
		);
		return await waitForUserOpViaPolling(bundlerUrl, userOpHash, timeoutMs, pollIntervalMs);
	}
}
/**
 * Convert HTTP URL to WebSocket URL
 */
function httpToWsUrl(url) {
	return url.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}
/**
 * Wait for UserOp via WebSocket subscription
 */
async function waitForUserOpViaWebSocket(bundlerUrl, userOpHash, timeoutMs) {
	const wsUrl = httpToWsUrl(bundlerUrl);
	return new Promise((resolve, reject) => {
		let ws;
		let timeoutId;
		let subscriptionId = null;
		let resolved = false;
		const cleanup = () => {
			if (timeoutId) clearTimeout(timeoutId);
			if (ws && ws.readyState === WebSocket.OPEN) {
				// Unsubscribe before closing
				if (subscriptionId) {
					ws.send(
						JSON.stringify({
							jsonrpc: "2.0",
							id: 2,
							method: "skandha_unsubscribe",
							params: [subscriptionId],
						}),
					);
				}
				ws.close();
			}
		};
		const resolveOnce = (result) => {
			if (resolved) return;
			resolved = true;
			cleanup();
			resolve(result);
		};
		const rejectOnce = (error) => {
			if (resolved) return;
			resolved = true;
			cleanup();
			reject(error);
		};
		// Set timeout
		timeoutId = setTimeout(() => {
			rejectOnce(new Error("WebSocket subscription timeout"));
		}, timeoutMs);
		try {
			ws = new WebSocket(wsUrl);
		} catch (err) {
			rejectOnce(new Error(`Failed to create WebSocket: ${err}`));
			return;
		}
		ws.onopen = () => {
			// Subscribe to onChainUserOps
			ws.send(
				JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "skandha_subscribe",
					params: ["onChainUserOps"],
				}),
			);
		};
		ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				// Handle subscription confirmation
				if (data.id === 1 && data.result) {
					subscriptionId = data.result;
					return;
				}
				// Handle subscription events
				if (data.method === "skandha_subscription" && data.params?.result) {
					const result = data.params.result;
					// Check if this is our userOp
					if (result.userOpHash?.toLowerCase() === userOpHash.toLowerCase()) {
						const txHash = result.transaction || result.txHash;
						if (result.status === "onChain" || txHash) {
							resolveOnce({
								success: true,
								txHash,
								userOpHash,
							});
						} else if (result.status === "reverted" || result.status === "rejected") {
							resolveOnce({
								success: false,
								userOpHash,
								error: `UserOp ${result.status}: ${result.revertReason || "unknown reason"}`,
							});
						}
					}
				}
			} catch (parseError) {
				// Ignore parse errors for non-JSON messages
			}
		};
		ws.onerror = (error) => {
			rejectOnce(new Error("WebSocket error"));
		};
		ws.onclose = (event) => {
			if (!resolved) {
				rejectOnce(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
			}
		};
	});
}
/**
 * Wait for UserOp via HTTP polling (fallback)
 */
async function waitForUserOpViaPolling(bundlerUrl, userOpHash, timeoutMs, pollIntervalMs) {
	const startTime = Date.now();
	while (Date.now() - startTime < timeoutMs) {
		try {
			const response = await fetch(bundlerUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "skandha_userOperationStatus",
					params: [userOpHash],
				}),
			});
			const result = await response.json();
			if (result.result?.transaction) {
				// UserOp is on-chain
				return {
					success: true,
					txHash: result.result.transaction,
					userOpHash,
				};
			}
			if (result.result?.status === "OnChain") {
				return {
					success: true,
					txHash: result.result.transaction,
					userOpHash,
				};
			}
			if (
				result.result?.status === "Reverted" ||
				result.result?.status === "Cancelled" ||
				result.result?.state === "reverted" ||
				result.result?.state === "rejected"
			) {
				return {
					success: false,
					userOpHash,
					error: result.result.revertReason || `UserOp ${result.result.status || result.result.state}`,
				};
			}
			// Still pending, continue polling
		} catch (pollError) {
			console.warn("[waitForUserOp] Poll error:", pollError instanceof Error ? pollError.message : pollError);
		}
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
	}
	return {
		success: false,
		userOpHash,
		error: "Timeout waiting for UserOp to be confirmed",
	};
}
//# sourceMappingURL=bundler-subscription.js.map
